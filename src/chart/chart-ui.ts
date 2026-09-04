// The whole UI layer, assembled.
//
// Mounting it by hand means eight objects wired in one specific order: a pane manager, an indicator
// renderer and engine, three controllers, a dialog and a legend, each needing the one before it, and
// two of them needing callbacks that close over a third that does not exist yet. Every page that did
// that wired it slightly differently, and the differences showed - a legend on one page and not the
// next, a study named in one place and nameless in another.
//
// So the package assembles it. `createChartUi(chart, options)` returns the same objects, already
// connected, and a page that wants to reach past them still can: they are all on the result.
//
// What stays the page's: the candles (`setCandles`), the host that words and formats, and any rows
// it wants in the right-click menu beyond the indicator ones this adds.
import { ChartContextMenu, ChartContextMenuMode, type ChartContextMenuEntry, type ChartContextMenuProvider, type PriceCoordinateSource } from './chart-context-menu.js';
import { ChartLegend, fullscreenMenuLayer, type LegendBar, type LegendChartType } from './chart-legend.js';
import { ChartPaneManager } from './chart-pane-manager.js';
import { IndicatorDialog, createIndicatorCatalogController } from './indicator-dialog.js';
import { IndicatorEngine } from './indicators/indicator-engine.js';
import { IndicatorRenderer } from './indicators/indicator-renderer.js';
import { IndicatorController, IndicatorTemplateController, type IndicatorFavoritesStorage } from './engine.js';
import type { ChartUiHost, ModalController } from './chart-host.js';
import { createPlainModalController } from './chart-host.js';

/// Where the layer remembers what a reader chose - favourite indicators, saved templates.
///
/// Two strings, because that is all it stores: a page hands them to `localStorage`, to a server, or
/// nowhere at all. Reading may answer null, which means nothing has been saved yet.
export interface ChartUiStorage {
    load(key: string): string | null;
    save(key: string, value: string): void;
}

/// A storage that forgets: favourites and templates last as long as the page does.
///
/// The honest default. Writing to `localStorage` behind a caller's back would put data on a reader's
/// machine that the caller never agreed to store.
export const inMemoryChartUiStorage: ChartUiStorage = (() => {
    const values = new Map<string, string>();
    return {
        load: key => values.get(key) ?? null,
        save: (key, value) => { values.set(key, value); },
    };
})();

/// A storage over the browser's own, namespaced by `prefix` so two charts on one page - or two pages
/// of one site - do not overwrite each other's favourites.
export function localChartUiStorage(prefix: string): ChartUiStorage {
    return {
        load(key) {
            try {
                return window.localStorage.getItem(`${prefix}:${key}`);
            } catch {
                // A browser with site data blocked. Losing favourites is not worth a thrown error.
                return null;
            }
        },
        save(key, value) {
            try {
                window.localStorage.setItem(`${prefix}:${key}`, value);
            } catch { /* as above */ }
        },
    };
}

/// What `createChartUi` needs to know beyond the chart itself.
export interface ChartUiOptions {
    /// The element the chart was created in. The layer builds its pane chrome around it.
    readonly container: HTMLElement;

    /// Words, numbers and messages. `standaloneHost` answers all three for a page with nothing of
    /// its own to impose.
    readonly host: ChartUiHost;

    /// Pixel -> price for the series currently drawn, so the right-click menu can say what price it
    /// landed on. Pass the main series; hand over a new one through `menu.setPriceSource` after a
    /// chart-type switch replaces it.
    readonly priceSource: PriceCoordinateSource;

    /// The renderings the legend's chart-type menu offers, in menu order. An empty list draws no
    /// menu at all, which is what a page with one rendering wants.
    readonly chartTypes: readonly LegendChartType[];

    /// Where favourites and templates live. Defaults to memory, which forgets when the page does.
    readonly storage?: ChartUiStorage;

    /// The dialog's markup, for a page that authors its own - a server-rendered one, localised
    /// there. Omitted, the layer builds it and appends it to the document body.
    readonly dialogRoot?: HTMLElement;

    /// How that dialog opens and closes, for a page with a modal library of its own. Omitted, the
    /// layer drives `dialogRoot` itself.
    readonly modal?: ModalController;

    /// Rows the page contributes to the right-click menu, above the indicator ones. A trading page
    /// puts buy, sell and cancel here.
    readonly provideItems?: ChartContextMenuProvider;
}

/// The chart, as this layer reads it. Narrower than `IChartApi` on purpose: these are the members
/// the layer touches, so a host driving something chart-shaped of its own can satisfy them.
export interface ChartUiChart {
    commandStack(): unknown;
    panes(): readonly { id(): string; priceScaleIds(): readonly string[] }[];
}

/// Everything the layer built, connected, plus the two calls a page makes afterwards.
export interface ChartUi {
    readonly engine: IndicatorEngine;
    readonly renderer: IndicatorRenderer;
    readonly paneManager: ChartPaneManager;
    readonly legend: ChartLegend;
    readonly dialog: IndicatorDialog;
    readonly menu: ChartContextMenu;
    readonly indicators: IndicatorController;
    readonly templates: IndicatorTemplateController;

    /// The candle window the studies and the legend read. Call it again whenever that window
    /// changes - a new symbol, a switched rendering, an older page of history arriving.
    ///
    /// One call for both, because two is one a page can forget, and forgetting it leaves the strip
    /// reading the window before last.
    setCandles(candles: readonly LegendBar[]): void;

    /// Open the indicator picker.
    showIndicators(): void;

    dispose(): void;
}

const FAVORITES_KEY = 'indicator-favorites';
const TEMPLATES_KEY = 'indicator-templates';

/// Mount the UI layer over a chart.
///
/// The order below is the one that works, and it is the reason this function exists: the pane
/// manager has to be built before the engine that draws into it, the engine before the controllers
/// that command it, and the dialog before the pane manager's own buttons can open it - which is why
/// two of its callbacks are assigned after the fact rather than passed in.
export function createChartUi(chart: ChartUiChart, options: ChartUiOptions): ChartUi {
    const host = options.host;
    const storage = options.storage ?? inMemoryChartUiStorage;

    // Filled in once the dialog exists. The pane header's buttons are built with the pane, and the
    // pane can be built before anyone has opened a picker.
    let openForPane: (paneId: string) => void = () => { /* assigned below */ };

    const paneManager = new ChartPaneManager({
        containerId: options.container.id,
        host,
        onAddIndicatorToPane: paneId => openForPane(paneId),
        onRemovePane: paneId => {
            for (const entry of engine.getIndicators())
                if (entry.paneId === paneId) engine.remove(entry.id);
        },
    });
    paneManager.init(chart as never);

    const renderer = new IndicatorRenderer(chart as never);
    const engine = new IndicatorEngine();
    engine.setRenderer(renderer);
    engine.setPaneManager(paneManager);

    const indicators = new IndicatorController({
        engine: engine as never,
        commandStack: chart.commandStack() as never,
    });

    const catalog = createIndicatorCatalogController(host.translate, favoritesStorage(storage));
    void catalog.loadFavorites().catch(() => { /* nothing saved yet */ });

    const templates = new IndicatorTemplateController({
        indicators,
        storage: {
            load: () => storage.load(TEMPLATES_KEY),
            save: value => storage.save(TEMPLATES_KEY, value),
        },
    });
    void templates.load().catch(() => { /* nothing saved yet */ });

    // The legend goes in the box the chart shares with its sub-panes, so it floats over both and is
    // clipped by neither. It is not decoration: the pane manager renders a header with an empty
    // values slot, and this is what fills it.
    const legendEl = document.createElement('div');
    legendEl.className = 'chart-legend';
    paneManager.legendLayer()?.appendChild(legendEl);

    const legend = new ChartLegend({
        container: legendEl,
        host,
        paneHost: paneManager,
        chartTypes: options.chartTypes,
        menuLayer: fullscreenMenuLayer,
    });
    legend.init(chart as never);
    legend.setIndicatorEngine(engine as never);

    const dialogRoot = options.dialogRoot ?? appendDialogMarkup(host);
    const dialog = new IndicatorDialog({
        root: dialogRoot,
        modal: options.modal ?? createPlainModalController(dialogRoot),
        host,
        engine: engine as never,
        controller: indicators,
        catalog,
        templates,
        chart: chart as never,
    });

    openForPane = paneId => dialog.showForPane(paneId);
    legend.onEditIndicator = id => dialog.showEdit(id);

    // The rows this layer can answer for, under whatever the page contributes. They are the layer's
    // because it owns the dialog they open: a page assembling by hand would offer them itself.
    const menu = new ChartContextMenu();
    menu.init(options.container, {
        mode: ChartContextMenuMode.Chart,
        host,
        priceSource: options.priceSource,
        provideItems: context => {
            const contributed = options.provideItems === undefined ? [] : options.provideItems(context);
            const own: ChartContextMenuEntry[] = [
                {
                    key: 'indicator',
                    label: host.translate('Add indicator…'),
                    icon: 'bi bi-graph-up',
                    invoke: () => dialog.show(),
                },
                {
                    key: 'addPane',
                    label: host.translate('Add pane…'),
                    icon: 'bi bi-layout-split',
                    // '__new__' targets a pane that does not exist yet, so picking a study creates
                    // the pane with that study already in it and cancelling leaves none behind.
                    invoke: () => dialog.showForPane('__new__'),
                },
            ];
            return [...contributed, own];
        },
    });

    return {
        engine,
        renderer,
        paneManager,
        legend,
        dialog,
        menu,
        indicators,
        templates,
        setCandles(candles) {
            engine.setCandles(candles as never);
            legend.setRawCandles(candles);
        },
        showIndicators() {
            dialog.show();
        },
        dispose() {
            menu.dispose();
            dialog.dispose();
            legend.dispose();
            paneManager.dispose();
            legendEl.remove();
            if (options.dialogRoot === undefined) dialogRoot.remove();
        },
    };
}

function favoritesStorage(storage: ChartUiStorage): IndicatorFavoritesStorage {
    return {
        load: () => {
            const raw = storage.load(FAVORITES_KEY);
            if (raw === null) return null;
            const parsed: unknown = JSON.parse(raw);
            // A stored value that is not a list of ids is a value some other version wrote, or one
            // a reader edited by hand. Refusing it loses the favourites; trusting it corrupts the
            // picker on every open after.
            if (!Array.isArray(parsed) || parsed.some(id => typeof id !== 'string'))
                throw new TypeError('stored indicator favorites are not a list of ids');
            return parsed;
        },
        save: ids => storage.save(FAVORITES_KEY, JSON.stringify(ids)),
    };
}

/// The dialog's markup, for a page that has none of its own.
///
/// Built here rather than left to the caller because the module queries it by class name and the
/// package's stylesheet dresses it: a page hand-authoring forty lines to satisfy both is a page
/// that will get one class wrong and see an empty picker.
function appendDialogMarkup(host: ChartUiHost): HTMLElement {
    const t = host.translate;
    const root = document.createElement('div');
    root.className = 'chart-modal indicator-modal';
    root.tabIndex = -1;
    root.innerHTML = `
        <div class="modal-dialog modal-lg"><div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t('Indicators')}</h5>
                <button type="button" class="btn-close" data-close-modal>&times;</button>
            </div>
            <div class="modal-body">
                <div class="indicator-sidebar">
                    <input type="text" class="indicator-search-input"
                        placeholder="${t('Search indicators…')}" />
                    <div class="indicator-category-tabs"></div>
                    <div class="indicator-list"></div>
                </div>
                <div class="indicator-detail">
                    <div class="indicator-settings"></div>
                    <div class="active-indicators-panel">
                        <div class="panel-title">${t('Active indicators')}</div>
                        <div class="active-indicators-list"></div>
                    </div>
                </div>
            </div>
        </div></div>`;
    document.body.appendChild(root);
    return root;
}
