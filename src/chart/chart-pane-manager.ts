// Compatibility adapter for the terminal UI. Pane rendering and scale
// ownership live in the chart engine; this class only keeps the historical
// pane-id lookup plus the terminal's HTML headers/context menus.
import type {
    ChartOptions,
    IChartApi,
    IPaneApi,
    ISeriesApi,
    PaneOptions,
    ResolvedPriceScaleOptions,
    SeriesDefinition,
    SeriesOptions,
    TimedSeriesData,
} from '../core/chart-api.js';
import { ChartContextMenu, ChartContextMenuMode, ChartContextMenuTone } from './chart-context-menu.js';
import type { ChartUiHost } from './chart-host.js';

/** Layout patch an engine pane accepts — every pane option except its id. */
type PaneLayoutPatch = Omit<PaneOptions, 'id'>;
type PaneLayoutKey = keyof PaneLayoutPatch;

/**
 * What the old sub-chart callers pass to `applyOptions`: usually a whole
 * chart-option bag (the terminal's theme switch hands the same object to the
 * main chart and to every pane), which is why the scale members keep their
 * chart-wide shape. Only the pane's own layout keys and the pane-local scale
 * margins are read; every other key is ignored.
 */
interface LegacyPaneChartOptions
    extends PaneLayoutPatch, Pick<ChartOptions, 'rightPriceScale' | 'leftPriceScale'> {}

/**
 * Copies one layout key across. Key-generic because the compiler only keeps the
 * key and its value type correlated when both flow through the same type
 * parameter — indexing with a plain union of keys widens the write to `never`.
 */
function copyPaneLayoutOption<K extends PaneLayoutKey>(
    target: PaneLayoutPatch,
    source: LegacyPaneChartOptions,
    key: K,
): void {
    const value = source[key];
    if (value !== undefined) target[key] = value;
}

class LegacyPaneChartAdapter {
    constructor(
        private readonly owner: IChartApi,
        readonly nativePane: IPaneApi,
    ) {}

    addSeries<TData extends TimedSeriesData, TOptions extends SeriesOptions = SeriesOptions>(
        definition: SeriesDefinition<TData, TOptions>,
        options: Partial<TOptions> = {},
    ): ISeriesApi<TData, TOptions> {
        return this.nativePane.addSeries(definition, options);
    }
    adoptSeries(series: ISeriesApi) { return this.owner.moveSeries(series, this.nativePane); }
    removeSeries(series: ISeriesApi) { this.nativePane.removeSeries(series); }
    priceScale(scaleId = 'right') { return this.nativePane.priceScale(scaleId); }
    timeScale() { return this.owner.timeScale(); }
    series() { return this.nativePane.series(); }
    id() { return this.nativePane.id(); }
    getSize() { return this.nativePane.getSize(); }

    // Old callers used a sub-chart-shaped handle. Visual chart options are
    // already global on the owner; pane-local scale margins remain local.
    applyOptions(options: LegacyPaneChartOptions = {}) {
        const paneOptions: PaneLayoutPatch = {};
        for (const key of ['height', 'minHeight', 'order', 'state'] as const) {
            copyPaneLayoutOption(paneOptions, options, key);
        }
        if (Object.keys(paneOptions).length) this.nativePane.applyOptions(paneOptions);
        if (options.rightPriceScale?.scaleMargins) {
            this.nativePane.priceScale('right').applyOptions({
                scaleMargins: options.rightPriceScale.scaleMargins,
            });
        }
        if (options.leftPriceScale?.scaleMargins) {
            this.nativePane.priceScale('left').applyOptions({
                scaleMargins: options.leftPriceScale.scaleMargins,
            });
        }
    }

    takeScreenshot() { return this.owner.takeScreenshot(); }
}

/** A live pane: the engine's pane plus the terminal chrome mounted over it. */
interface PaneEntry {
    el: HTMLDivElement;
    chart: LegacyPaneChartAdapter;
    nativePane: IPaneApi;
    label: string;
    /** Indicator measure the pane is shared by, or null for a free-standing pane. */
    measure: string | null;
    ctxMenu: ChartContextMenu;
}

/** Layout of a just-removed pane, kept so restorePane() can rebuild it verbatim. */
interface PaneSnapshot {
    id: string;
    label: string;
    measure: string | null;
    paneOptions?: Required<PaneOptions>;
    rightPriceScale?: ResolvedPriceScaleOptions;
    leftPriceScale?: ResolvedPriceScaleOptions;
}

/// What a pane's own chrome needs from the page it is mounted in.
export interface ChartPaneManagerOptions {
    /// The element the chart was created in. The panes hang off it.
    ///
    /// The element itself, not its id: a host that builds its panel before attaching it to the
    /// document - which is what every docking library does - has no id to look up yet, and the
    /// lookup this replaced failed silently, leaving no pane chrome and no legend with it.
    readonly container: HTMLElement;

    /// Translation and formatting for the header and the per-pane menu.
    readonly host: ChartUiHost;

    /// Open the indicator picker aimed at this pane, from its menu.
    onAddIndicatorToPane(paneId: string): void;

    /// Drop every indicator drawn in this pane, from its menu. The pane goes with the last one.
    onRemovePane(paneId: string): void;
}

/**
 * Chrome over the engine's native panes: HTML pane headers, per-pane context menus, pane-id
 * lookup and empty-pane restore. The engine owns pane rendering and scales; this class only adds
 * the DOM headers and menus on top and never re-implements pane logic.
 */
export class ChartPaneManager {
    _host: ChartUiHost;
    _onAddIndicatorToPane: (paneId: string) => void;
    _onRemovePane: (paneId: string) => void;
    _container: HTMLElement;
    _mainContainer: HTMLElement | null;
    _panes: Map<string, PaneEntry>;
    _removedPanes: Map<string, PaneSnapshot>;
    _nextId: number;
    _mainChart: IChartApi | null;
    _wrapper: HTMLDivElement | null;
    _resizeObserver: ResizeObserver | null;
    _headerSyncFrame: number | null;
    _onPointerMove: (() => void) | null;
    _onContextMenu: ((event: MouseEvent) => void) | null;

    constructor(options: ChartPaneManagerOptions) {
        this._container = options.container;
        this._host = options.host;
        this._onAddIndicatorToPane = options.onAddIndicatorToPane;
        this._onRemovePane = options.onRemovePane;
        this._mainContainer = null;
        this._panes = new Map();
        this._removedPanes = new Map();
        this._nextId = 1;
        this._mainChart = null;
        this._wrapper = null;
        this._resizeObserver = null;
        this._headerSyncFrame = null;
        this._onPointerMove = null;
        this._onContextMenu = null;
    }

    // Nullable because the terminal can mount the chrome before (or without) a
    // chart — the guard below is what makes that a no-op rather than a crash.
    init(mainChart: IChartApi | null) {
        this._mainChart = mainChart;
        const chartEl = this._container;
        if (!chartEl || !mainChart?.addPane) return;

        this._mainContainer = chartEl.parentElement;
        this._wrapper = document.createElement('div');
        this._wrapper.className = 'chart-panes-wrapper';
        this._wrapper.style.cssText = 'display:block;position:relative;width:100%;height:100%;overflow:hidden;';
        this._mainContainer?.insertBefore(this._wrapper, chartEl);
        this._wrapper.appendChild(chartEl);
        chartEl.style.position = 'absolute';
        chartEl.style.inset = '0';
        chartEl.style.width = '100%';
        chartEl.style.height = '100%';
        chartEl.style.minHeight = '0';

        this._onPointerMove = () => this._scheduleHeaderSync();
        chartEl.addEventListener('pointermove', this._onPointerMove);
        chartEl.addEventListener('pointerup', this._onPointerMove);
        this._resizeObserver = new ResizeObserver(() => this._scheduleHeaderSync());
        this._resizeObserver.observe(chartEl);

        // Route a right-click in an indicator pane to that pane's legacy
        // menu before the main-chart menu sees the same shared canvas event.
        this._onContextMenu = (event) => {
            const rect = chartEl.getBoundingClientRect();
            const y = event.clientY - rect.top;
            for (const [, pane] of this._panes) {
                const size = pane.nativePane.getSize();
                if (y < size.top || y > size.top + size.height) continue;
                event.stopImmediatePropagation();
                pane.ctxMenu?.openAt(event);
                return;
            }
        };
        chartEl.addEventListener('contextmenu', this._onContextMenu, true);
    }

    /// Where a legend belongs: the box the chart and its sub-panes share, so a legend placed in it
    /// floats over both and is clipped by neither. Null until `init` has built it.
    ///
    /// The manager used to move `#chartLegend` here itself, which meant a published module knew one
    /// page's element id and no other page could be laid out at all.
    legendLayer(): HTMLElement | null {
        return this._wrapper;
    }

    getPaneByMeasure(measure: string | null) {
        if (!measure) return null;
        for (const [paneId, pane] of this._panes) {
            if (pane.measure === measure) return paneId;
        }
        return null;
    }

    addPane(label: string, measure: string | null, restoration: PaneSnapshot | null = null) {
        if (!this._wrapper || !this._mainChart?.addPane) return null;
        let paneId = restoration?.id;
        if (paneId !== undefined
            && (typeof paneId !== 'string' || paneId.trim().length === 0 || this._panes.has(paneId))) {
            throw new Error(`sschart: pane '${String(paneId)}' cannot be restored`);
        }
        if (paneId === undefined) {
            do { paneId = 'pane_' + this._nextId++; } while (this._panes.has(paneId));
        }
        const restoredOptions: PaneOptions = restoration?.paneOptions || {};
        const nativePane = this._mainChart.addPane({
            id: paneId,
            height: restoredOptions.height ?? 160,
            minHeight: restoredOptions.minHeight ?? 64,
            order: restoredOptions.order ?? this._panes.size + 1,
            state: restoredOptions.state ?? 'normal',
        });
        nativePane.priceScale('right').applyOptions(
            restoration?.rightPriceScale || { scaleMargins: { top: 0.1, bottom: 0.1 } },
        );
        if (restoration?.leftPriceScale)
            nativePane.priceScale('left').applyOptions(restoration.leftPriceScale);
        const chart = new LegacyPaneChartAdapter(this._mainChart, nativePane);

        const paneEl = document.createElement('div');
        paneEl.className = 'chart-sub-pane chart-sub-pane-native';
        paneEl.id = paneId;
        paneEl.style.cssText = 'position:absolute;left:0;right:0;z-index:4;pointer-events:none;';

        const header = document.createElement('div');
        header.className = 'chart-pane-header';
        header.style.pointerEvents = 'auto';
        header.innerHTML = `<span class="pane-label">${label}</span><span class="pane-values"></span>`;
        paneEl.appendChild(header);
        this._wrapper.appendChild(paneEl);

        // The edit and remove buttons in this header are the legend's: it renders the rows into
        // `.pane-values` and binds their handlers there, the same way it does for the main strip.

        const ctxMenu = new ChartContextMenu();
        // A pane header's two actions are the manager's own, so it contributes them itself
        // rather than asking the page to repeat what it already told the constructor.
        const t = this._host.translate;
        ctxMenu.init(header, {
            mode: ChartContextMenuMode.Pane,
            host: this._host,
            provideItems: () => [
                [{
                    key: 'addToPane',
                    label: t('Add indicator…'),
                    icon: 'bi bi-graph-up',
                    invoke: () => this._onAddIndicatorToPane(paneId),
                }],
                [{
                    key: 'removePane',
                    label: t('Remove pane'),
                    icon: 'bi bi-trash3',
                    tone: ChartContextMenuTone.Negative,
                    invoke: () => this._onRemovePane(paneId),
                }],
            ],
        });

        this._panes.set(paneId, {
            el: paneEl,
            chart,
            nativePane,
            label,
            measure,
            ctxMenu,
        });
        this._removedPanes.delete(paneId);
        this._scheduleHeaderSync();
        return paneId;
    }

    removePane(paneId: string) {
        const pane = this._panes.get(paneId);
        if (!pane) return;
        const scaleIds = pane.nativePane.priceScaleIds?.() || [];
        this._removedPanes.set(paneId, {
            id: paneId,
            label: pane.label,
            measure: pane.measure,
            paneOptions: pane.nativePane.options?.(),
            rightPriceScale: pane.nativePane.priceScale('right').options?.(),
            leftPriceScale: scaleIds.includes('left')
                ? pane.nativePane.priceScale('left').options?.()
                : undefined,
        });
        try { pane.ctxMenu?.dispose(); } catch { /* keep releasing */ }
        // A pane can only be in the map when addPane() ran, and that returns
        // early unless init() stored the chart — so the handle is set here.
        try { this._mainChart!.removePane(pane.nativePane); } catch { /* already removed */ }
        pane.el.remove();
        this._panes.delete(paneId);
        this._scheduleHeaderSync();
    }

    /** Recreates a recently emptied pane with the same native id and layout options. */
    restorePane(paneId: string) {
        const snapshot = this._removedPanes.get(paneId);
        if (!snapshot) return null;
        return this.addPane(snapshot.label, snapshot.measure, snapshot);
    }

    getChart(paneId: string) {
        return this._panes.get(paneId)?.chart ?? null;
    }

    setPaneTitle(paneId: string, label: string) {
        const pane = this._panes.get(paneId);
        if (!pane) return;
        const labelEl = pane.el.querySelector('.pane-label');
        if (labelEl) labelEl.textContent = label;
        pane.label = label;
    }

    /// The element a pane's indicator values belong in, or null once the pane is gone.
    ///
    /// An element rather than an HTML string: the legend builds its own nodes and binds its own
    /// handlers to them, which is what lets the edit and remove buttons in a pane header work the
    /// same way as the ones in the main strip.
    getValuesElement(paneId: string): HTMLElement | null {
        const pane = this._panes.get(paneId);
        if (pane === undefined) return null;
        return pane.el.querySelector('.pane-values');
    }

    getPanes() { return Array.from(this._panes.keys()); }
    resize() { this._scheduleHeaderSync(); }

    _scheduleHeaderSync() {
        if (this._headerSyncFrame !== null) return;
        this._headerSyncFrame = requestAnimationFrame(() => {
            this._headerSyncFrame = null;
            this._syncHeaders();
        });
    }

    _syncHeaders() {
        for (const [, pane] of this._panes) {
            const size = pane.nativePane.getSize();
            pane.el.style.top = `${size.top}px`;
            pane.el.style.height = `${Math.min(20, size.height)}px`;
            pane.el.style.display = size.height > 0 ? 'block' : 'none';
        }
    }

    dispose() {
        for (const paneId of Array.from(this._panes.keys())) this.removePane(paneId);
        this._removedPanes.clear();
        const chartEl = this._container;
        if (chartEl && this._onPointerMove) {
            chartEl.removeEventListener('pointermove', this._onPointerMove);
            chartEl.removeEventListener('pointerup', this._onPointerMove);
        }
        if (chartEl && this._onContextMenu)
            chartEl.removeEventListener('contextmenu', this._onContextMenu, true);
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
        if (this._headerSyncFrame !== null) cancelAnimationFrame(this._headerSyncFrame);
        this._headerSyncFrame = null;
        this._onPointerMove = null;
        this._onContextMenu = null;
    }
}
