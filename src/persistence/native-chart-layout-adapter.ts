import {
    getSeriesDefinition,
    type ChartOptions,
    type IChartApi,
    type IPaneApi,
    type ISeriesApi,
    type PriceScaleModeValue,
    type SeriesOptions,
} from '../core/chart-api.js';
import {
    normalizePersistedObject,
    type PersistedObject,
} from './json-value.js';
import type {
    PersistedPane,
    PersistedSeries,
} from './chart-state.js';
import type {
    ChartStateLayoutAdapter,
    ChartStateLayoutSnapshot,
    MaybePromise,
} from './chart-state-persistence.js';

export interface NativeChartLayoutAdapterOptions {
    readonly chart: IChartApi;
    /** Root pane that cannot be removed. Defaults to the conventional `main` id. */
    readonly mainPaneId?: string;
    /** Overrides registry-based empty-series recreation (for host data-source wiring). */
    readonly createSeries?: (
        series: PersistedSeries,
        pane: IPaneApi,
    ) => MaybePromise<ISeriesApi<any, any> | null | void>;
    readonly includeSeries?: (series: ISeriesApi<any, any>) => boolean;
    /**
     * Called for a series that `capture()` deliberately skipped -- `persist: false`, or vetoed by
     * `includeSeries` -- and that `restore()` still had to detach because the pane holding it is
     * not part of the layout being restored. Series the adapter owns are never reported: taking
     * them down and building them again is what `restore()` is for.
     */
    readonly onRemoveSeries?: (series: ISeriesApi<any, any>) => void;
    readonly onUnknownSeries?: (series: PersistedSeries) => void;
}

/** Captures native pane/series metadata while deliberately excluding raw series data. */
export class NativeChartLayoutAdapter implements ChartStateLayoutAdapter {
    private readonly chart: IChartApi;
    private readonly mainPaneId: string;
    private readonly createSeries?: NativeChartLayoutAdapterOptions['createSeries'];
    private readonly includeSeries?: NativeChartLayoutAdapterOptions['includeSeries'];
    private readonly onRemoveSeries?: NativeChartLayoutAdapterOptions['onRemoveSeries'];
    private readonly onUnknownSeries?: NativeChartLayoutAdapterOptions['onUnknownSeries'];

    constructor(options: NativeChartLayoutAdapterOptions) {
        if (options === null || typeof options !== 'object'
            || options.chart === null || typeof options.chart !== 'object') {
            throw new TypeError('sschart: native chart layout adapter chart is required');
        }
        for (const [name, callback] of [
            ['createSeries', options.createSeries],
            ['includeSeries', options.includeSeries],
            ['onRemoveSeries', options.onRemoveSeries],
            ['onUnknownSeries', options.onUnknownSeries],
        ] as const) {
            if (callback !== undefined && typeof callback !== 'function')
                throw new TypeError(`sschart: native chart layout adapter ${name} must be a function`);
        }
        this.chart = options.chart;
        if (options.mainPaneId !== undefined
            && (typeof options.mainPaneId !== 'string' || options.mainPaneId.trim().length === 0)) {
            throw new TypeError('sschart: native chart layout adapter mainPaneId must be non-empty');
        }
        const panes = options.chart.panes();
        this.mainPaneId = options.mainPaneId?.trim()
            ?? (panes.some(pane => pane.id() === 'main') ? 'main' : panes[0]?.id() ?? 'main');
        this.createSeries = options.createSeries;
        this.includeSeries = options.includeSeries;
        this.onRemoveSeries = options.onRemoveSeries;
        this.onUnknownSeries = options.onUnknownSeries;
    }

    capture(): ChartStateLayoutSnapshot {
        const panes = this.chart.panes();
        const persistedPanes = panes.map(pane => this.capturePane(pane));
        const series: PersistedSeries[] = [];
        for (const pane of panes) {
            for (const item of pane.series()) {
                if (!this.isOwned(item)) continue;
                const rawOptions = item.options() as Readonly<Record<string, unknown>>;
                const { id: _id, persist: _persist, priceScaleId: _scale, ...styleOptions } = rawOptions;
                series.push(Object.freeze({
                    id: item.id(),
                    type: item.type(),
                    paneId: pane.id(),
                    priceScaleId: item.priceScaleId(),
                    options: normalizePersistedObject(styleOptions,
                        `series '${item.id()}' options`, { omitUndefined: true }),
                }));
            }
        }
        return Object.freeze({
            chartOptions: captureChartOptions(this.chart.options()),
            panes: Object.freeze(persistedPanes),
            series: Object.freeze(series),
        });
    }

    // A series is the adapter's own unless the caller said otherwise, by the same rule capture()
    // and restore() both answer to -- they must agree, or restore removes what capture skipped.
    private isOwned(series: ISeriesApi<any, any>): boolean {
        const options = series.options() as Readonly<Record<string, unknown>>;
        return options.persist !== false && this.includeSeries?.(series) !== false;
    }

    async restore(state: ChartStateLayoutSnapshot): Promise<void> {
        if (state === null || typeof state !== 'object')
            throw new TypeError('sschart: native chart layout restore state is required');
        const current = this.chart.panes();
        if (current.length === 0) throw new Error('sschart: native chart has no main pane');
        const main = current.find(pane => pane.id() === this.mainPaneId);
        if (main === undefined)
            throw new Error(`sschart: native main pane '${this.mainPaneId}' is unavailable`);
        const persistedMain = state.panes.find(pane => pane.id === main.id());
        if (persistedMain === undefined) {
            throw new Error(
                `sschart: persisted layout does not contain native main pane '${main.id()}'`,
            );
        }

        this.chart.applyOptions(state.chartOptions as unknown as ChartOptions);
        // Mirror the capture filter: a series capture() called none of its business must not be
        // torn down here either, or a controller that owns one -- a compare overlay, created with
        // persist:false -- keeps streaming into a series no chart holds any more, while the legend
        // still lists the instrument. Only the main pane survives a restore, so a foreign series
        // on any other pane has nowhere to stay; that one is detached and reported.
        for (const pane of current) {
            for (const series of [...pane.series()]) {
                const owned = this.isOwned(series);
                if (!owned && pane === main) continue;
                this.chart.removeSeries(series);
                if (!owned) this.onRemoveSeries?.(series);
            }
        }
        for (const pane of [...current].reverse()) {
            if (pane !== main) this.chart.removePane(pane);
        }

        main.applyOptions(paneOptions(persistedMain));
        const panes = new Map<string, IPaneApi>([[main.id(), main]]);
        for (const persisted of [...state.panes].sort((left, right) => left.order - right.order)) {
            if (persisted.id === main.id()) continue;
            const pane = this.chart.addPane({ id: persisted.id, ...paneOptions(persisted) });
            panes.set(persisted.id, pane);
        }
        for (const persisted of state.panes) {
            const pane = panes.get(persisted.id);
            if (pane === undefined) continue;
            for (const scale of persisted.priceScales) {
                pane.priceScale(scale.id).applyOptions({
                    mode: scale.mode as PriceScaleModeValue | undefined,
                    autoScale: scale.autoScale,
                    scaleMargins: scale.scaleMargins,
                });
            }
        }
        for (const persisted of state.series) {
            const pane = panes.get(persisted.paneId);
            if (pane === undefined)
                throw new Error(`sschart: series '${persisted.id}' references unavailable pane`);
            if (this.createSeries !== undefined) {
                await this.createSeries(persisted, pane);
                continue;
            }
            const definition = getSeriesDefinition(persisted.type);
            if (definition === undefined) {
                this.onUnknownSeries?.(persisted);
                continue;
            }
            pane.addSeries(definition, {
                ...(persisted.options as SeriesOptions),
                id: persisted.id,
                persist: true,
                priceScaleId: persisted.priceScaleId,
            });
        }
    }

    private capturePane(pane: IPaneApi): PersistedPane {
        const options = pane.options();
        const ids = new Set(pane.priceScaleIds());
        for (const series of pane.series()) ids.add(series.priceScaleId());
        if (ids.size === 0) ids.add('right');
        const priceScales = [...ids].sort().map(id => {
            const state = pane.priceScale(id).options();
            return Object.freeze({
                id,
                mode: state.mode,
                autoScale: state.autoScale,
                scaleMargins: Object.freeze({ ...state.scaleMargins }),
            });
        });
        return Object.freeze({
            id: pane.id(),
            order: options.order,
            height: options.height,
            minHeight: options.minHeight,
            state: options.state,
            priceScales: Object.freeze(priceScales),
        });
    }
}

function paneOptions(pane: PersistedPane): {
    readonly order: number;
    readonly height: number;
    readonly minHeight: number;
    readonly state: PersistedPane['state'];
} {
    return {
        order: pane.order,
        height: pane.height,
        minHeight: pane.minHeight,
        state: pane.state,
    };
}

function captureChartOptions(options: Readonly<ChartOptions>): PersistedObject {
    const timeScale = options.timeScale === undefined ? undefined : (() => {
        const { calendar: _calendar, formatter: _formatter, ...serializable } = options.timeScale;
        return serializable;
    })();
    return normalizePersistedObject({
        autoSize: options.autoSize,
        commandHistoryLimit: options.commandHistoryLimit,
        layout: options.layout,
        watermark: options.watermark,
        grid: options.grid,
        rightPriceScale: options.rightPriceScale,
        leftPriceScale: options.leftPriceScale,
        timeScale,
        crosshair: options.crosshair,
        handleScroll: options.handleScroll,
        handleScale: options.handleScale,
    }, 'chartOptions', { omitUndefined: true });
}
