import {
    AreaSeries,
    BarSeries,
    CandlestickSeries,
    LineSeries,
    PointFigureSeries,
    RenkoSeries,
} from './engine.js';
import {
    PointFigureDataRuntime,
    RenkoDataRuntime,
} from '../series/derived-data.js';
import type {
    CandlestickData,
    IChartApi,
    ISeriesApi,
    LineData,
    SeriesOptions,
} from '../core/chart-api.js';
import type { OhlcData } from '../series/derived-data.js';
import type { ChartUiHost } from './chart-host.js';

/**
 * One source bar. Only OHLC is read here; volume and the per-bar volume-by-price ladder ride
 * along untouched so the caller can hand the switcher the very same objects it feeds the chart.
 */
export interface ChartTypeSwitcherCandle extends OhlcData {
    volume?: number;
    levels?: unknown;
}

/** How the source bars are drawn. */
export const ChartType = {
    Candle: 'candle',
    Bar: 'bar',
    Line: 'line',
    Area: 'area',
    HeikinAshi: 'heikin',
    Renko: 'renko',
    PointFigure: 'pf',
} as const;

/** One of the types `ChartType` names. */
export type ChartTypeValue = typeof ChartType[keyof typeof ChartType];

/** The whole vocabulary, for a page that offers all of it. */
export const allChartTypes: readonly ChartTypeValue[] = [
    ChartType.Candle,
    ChartType.Bar,
    ChartType.Line,
    ChartType.Area,
    ChartType.HeikinAshi,
    ChartType.Renko,
    ChartType.PointFigure,
];

/**
 * Read a chart type out of a string the page kept for itself - a saved layout, a `data-` attribute
 * on a button - answering null when it names no type this module draws.
 */
export function parseChartType(value: string): ChartTypeValue | null {
    return (allChartTypes as readonly string[]).includes(value) ? value as ChartTypeValue : null;
}

/**
 * Whether the type redraws the source bars into bars of its own - Renko bricks, P&F columns.
 * Indicators then run over those rather than over the source, and there is no per-bar volume to
 * draw beneath them: both are the page's business, so it has to be able to ask.
 */
export function isDerivedChartType(type: ChartTypeValue): boolean {
    return type === ChartType.Renko || type === ChartType.PointFigure;
}

/**
 * The colours a page draws its bars in.
 *
 * Up and down are a page-wide decision - the blotter, the depth ladder and the chart have to agree
 * on which way is green - so a published module cannot hold an opinion about them.
 */
export interface ChartTypePalette {
    /** A bar that closed at or above its open, and the rising Renko brick / P&F column. */
    up: string;
    /** A bar that closed below its open, and the falling Renko brick / P&F column. */
    down: string;
    /** The line the line and area types draw. */
    line: string;
    /** The area fill immediately under that line. */
    areaTop: string;
    /** The area fill where it reaches the bottom of the pane, usually all but transparent. */
    areaBottom: string;
}

/** A palette that stands on its own, for a page with no colours of its own to impose. */
export const defaultChartTypePalette: ChartTypePalette = {
    up: '#00c853',
    down: '#ff3d57',
    line: '#4a9eff',
    areaTop: 'rgba(74,158,255,0.3)',
    areaBottom: 'rgba(74,158,255,0.02)',
};

/** Told which series draws the bars now, and which type it draws them as. */
export type ChartSeriesChangedHandler = (series: ISeriesApi, type: ChartTypeValue) => void;

/** What the switcher needs from the page that mounts it. */
export interface ChartTypeSwitcherOptions {
    /** The chart whose main series is replaced on every switch. */
    chart: IChartApi;

    /** The series that chart already shows. The first switch removes it. */
    series: ISeriesApi;

    /** The type `series` draws, which only the page that created it knows. */
    initialType: ChartTypeValue;

    /**
     * The types this page offers. Switching to anything else is refused and reported through the
     * host, so a stored layout naming a type the page has since stopped offering says so instead
     * of leaving a control that does nothing.
     */
    availableTypes: readonly ChartTypeValue[];

    /** The colours to draw in. */
    palette: ChartTypePalette;

    /** The page itself: how it words things and where it puts messages. */
    host: ChartUiHost;
}

/** One Heikin-Ashi bar's own open and close, which is all the next bar is derived from. */
interface HeikinAshiBar {
    time: number;
    open: number;
    close: number;
}

/**
 * Draws one set of source bars as candles, bars, a line, an area, Heikin-Ashi, Renko or P&F.
 *
 * A shape change is a different renderer, so the series is recreated rather than reconfigured and
 * every handle the page holds on the old one goes stale. `onSeriesChanged` is how the page learns
 * about that; nothing here re-points a consumer on the page's behalf.
 */
export class ChartTypeSwitcher {
    _chart: IChartApi;
    _host: ChartUiHost;
    _palette: ChartTypePalette;
    _availableTypes: readonly ChartTypeValue[];
    _currentSeries: ISeriesApi;
    _currentType: ChartTypeValue;
    _rawCandles: readonly ChartTypeSwitcherCandle[] = [];
    _derivedRuntime: RenkoDataRuntime | PointFigureDataRuntime | null = null;
    _seriesChanged: ChartSeriesChangedHandler[] = [];
    /** The last CLOSED bar - the only legitimate seed for the forming bar's open. */
    _closedHeikin: HeikinAshiBar | null = null;
    /** The bar being formed, so a tick replacing it is told apart from one opening the next. */
    _liveHeikin: HeikinAshiBar | null = null;

    constructor(options: ChartTypeSwitcherOptions) {
        this._chart = options.chart;
        this._host = options.host;
        this._palette = options.palette;
        this._availableTypes = options.availableTypes;
        this._currentSeries = options.series;
        this._currentType = options.initialType;
    }

    /**
     * The bars every type is drawn from. The array is held by reference, so a page that mutates
     * its live window in place gets the current window on the next switch without saying so again.
     */
    setRawCandles(candles: readonly ChartTypeSwitcherCandle[]) {
        this._rawCandles = candles;
    }

    /**
     * Draw the source bars as `type` and hand back the series that draws them now, which is the
     * current one when the type is already drawn or is not among the ones this page offers.
     */
    switchType(type: ChartTypeValue): ISeriesApi {
        if (type === this._currentType) return this._currentSeries;

        if (!this._availableTypes.includes(type)) {
            this._host.notify(this._host.translate('Chart type {0} is not available.', type), 'warning');
            return this._currentSeries;
        }

        // Price formatting lives on the series, so recreating one drops it and the axis falls back
        // to the engine's default precision ("0.44" where it read "0.4438"). The instrument's tick
        // size is the page's to know, so the format moves across rather than being decided here.
        const priceFormat = this._currentSeries.options().priceFormat;

        try { this._chart.removeSeries(this._currentSeries); } catch { /* already detached */ }

        const bars = this._rawCandles;
        const ohlc = () => bars.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
        const closes = () => bars.map(c => ({ time: c.time, value: c.close }));
        const palette = this._palette;
        const candleColors: Partial<SeriesOptions> = {
            upColor: palette.up,
            downColor: palette.down,
            borderUpColor: palette.up,
            borderDownColor: palette.down,
            wickUpColor: palette.up,
            wickDownColor: palette.down,
        };

        let series: ISeriesApi;
        let derivedRuntime: RenkoDataRuntime | PointFigureDataRuntime | null = null;
        switch (type) {
            case ChartType.Candle: {
                const created = this._chart.addSeries(CandlestickSeries, { ...candleColors, priceFormat });
                created.setData(ohlc());
                series = created;
                break;
            }

            case ChartType.Bar: {
                const created = this._chart.addSeries(BarSeries, {
                    upColor: palette.up,
                    downColor: palette.down,
                    priceFormat,
                });
                created.setData(ohlc());
                series = created;
                break;
            }

            case ChartType.Line: {
                const created = this._chart.addSeries(LineSeries, {
                    color: palette.line,
                    lineWidth: 2,
                    priceFormat,
                });
                created.setData(closes());
                series = created;
                break;
            }

            case ChartType.Area: {
                const created = this._chart.addSeries(AreaSeries, {
                    topColor: palette.areaTop,
                    bottomColor: palette.areaBottom,
                    lineColor: palette.line,
                    lineWidth: 2,
                    priceFormat,
                });
                created.setData(closes());
                series = created;
                break;
            }

            case ChartType.HeikinAshi: {
                const created = this._chart.addSeries(CandlestickSeries, { ...candleColors, priceFormat });
                created.setData(this._computeHeikinAshi(bars));
                series = created;
                break;
            }

            case ChartType.Renko: {
                derivedRuntime = new RenkoDataRuntime();
                derivedRuntime.reset(bars);
                const created = this._chart.addSeries(RenkoSeries, {
                    upColor: palette.up,
                    downColor: palette.down,
                    boxSize: derivedRuntime.boxSize,
                    priceFormat,
                });
                created.setData(ohlc());
                series = created;
                break;
            }

            case ChartType.PointFigure: {
                derivedRuntime = new PointFigureDataRuntime();
                derivedRuntime.reset(bars);
                const created = this._chart.addSeries(PointFigureSeries, {
                    upColor: palette.up,
                    downColor: palette.down,
                    boxSize: derivedRuntime.boxSize,
                    reversal: derivedRuntime.reversal,
                    priceFormat,
                });
                created.setData(ohlc());
                series = created;
                break;
            }
        }

        this._currentSeries = series;
        this._currentType = type;
        this._derivedRuntime = derivedRuntime;
        // Over a copy: a handler is free to unsubscribe itself while being told.
        for (const handler of this._seriesChanged.slice()) handler(series, type);
        return series;
    }

    /**
     * Be told the series that draws the bars now, every time the type changes.
     *
     * Everything the page aimed at the previous series - a drawing layer, a context menu, the
     * price lines of resting orders - has to be re-aimed here. A handle left on the removed series
     * draws nothing and reports nothing, so the loss shows up as orders that stopped being drawn
     * rather than as an error.
     *
     * Returns the undo.
     */
    onSeriesChanged(handler: ChartSeriesChangedHandler): () => void {
        this._seriesChanged.push(handler);
        return () => {
            const index = this._seriesChanged.indexOf(handler);
            if (index >= 0) this._seriesChanged.splice(index, 1);
        };
    }

    /** The series drawing the bars right now. */
    getCurrentSeries(): ISeriesApi {
        return this._currentSeries;
    }

    /**
     * The type being drawn right now. A page usually has more than one control over this - a menu
     * in the legend, a row of buttons in its own chrome - and each has to read the type rather
     * than remember what it last asked for.
     */
    getCurrentType(): ChartTypeValue {
        return this._currentType;
    }

    /** The types this page offers, in the order it gave them. */
    getAvailableTypes(): readonly ChartTypeValue[] {
        return this._availableTypes;
    }

    /**
     * The bars indicators should run over: the derived bricks or columns where the type builds its
     * own, and the source bars otherwise.
     */
    getIndicatorCandles(): readonly ChartTypeSwitcherCandle[] {
        return this._derivedRuntime?.data ?? this._rawCandles;
    }

    /** Move the forming bar on by one tick, whichever type is being drawn. */
    updatePrice(candle: ChartTypeSwitcherCandle) {
        const type = this._currentType;
        if (type === ChartType.Candle || type === ChartType.Bar || isDerivedChartType(type)) {
            (this._currentSeries as ISeriesApi<CandlestickData>).update(candle);
            if (this._derivedRuntime !== null) this._derivedRuntime.update(candle);
        } else if (type === ChartType.HeikinAshi) {
            (this._currentSeries as ISeriesApi<CandlestickData>).update(this._advanceHeikinAshi(candle));
        } else {
            (this._currentSeries as ISeriesApi<LineData>).update({ time: candle.time, value: candle.close });
        }
    }

    /**
     * Advance the Heikin-Ashi state by one tick and return the bar to draw.
     *
     * A bar's open is fixed the moment the bar starts, at the midpoint of the previous bar's own
     * Heikin-Ashi open and close; only close, high and low move while the bar forms. A live feed
     * mostly replaces the forming bar rather than appending, so the pair the open is derived from
     * has to be the last CLOSED bar. Deriving it from the forming bar's own previous tick averages
     * the open with a close that is already inside the bar, so the open walks towards the close and
     * every bar after it is seeded from the drifted pair.
     */
    _advanceHeikinAshi(candle: ChartTypeSwitcherCandle): CandlestickData {
        const close = (candle.open + candle.high + candle.low + candle.close) / 4;

        let forming = this._liveHeikin;
        if (forming === null || forming.time !== candle.time) {
            // A different bar than the one being formed: that one is final now, and it is the pair
            // this one's open comes from. With nothing before it the bar seeds itself, the same
            // convention the history pass uses for its first bar.
            if (forming !== null) this._closedHeikin = forming;
            const seed = this._closedHeikin ?? { time: candle.time, open: candle.open, close: candle.close };
            forming = { time: candle.time, open: (seed.open + seed.close) / 2, close };
            this._liveHeikin = forming;
        } else {
            forming.close = close;
        }

        return {
            time: candle.time,
            open: forming.open,
            high: Math.max(candle.high, forming.open, close),
            low: Math.min(candle.low, forming.open, close),
            close,
        };
    }

    _computeHeikinAshi(candles: readonly ChartTypeSwitcherCandle[]): OhlcData[] {
        if (candles.length === 0) {
            this._closedHeikin = null;
            this._liveHeikin = null;
            return [];
        }

        const result: OhlcData[] = [];
        let prevOpen = candles[0].open;
        let prevClose = candles[0].close;

        for (const c of candles) {
            const haClose = (c.open + c.high + c.low + c.close) / 4;
            const haOpen = (prevOpen + prevClose) / 2;
            const haHigh = Math.max(c.high, haOpen, haClose);
            const haLow = Math.min(c.low, haOpen, haClose);
            result.push({ time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose });
            prevOpen = haOpen;
            prevClose = haClose;
        }

        // The last bar of the history is the one live ticks go on replacing, so it is the forming
        // bar rather than a closed one; the bar before it is what its open was drawn from. Seed
        // both, and a first tick carrying that same time is recognised as the replacement it is.
        const last = result[result.length - 1];
        const previous = result[result.length - 2];
        this._closedHeikin = previous === undefined
            ? null
            : { time: previous.time, open: previous.open, close: previous.close };
        this._liveHeikin = { time: last.time, open: last.open, close: last.close };
        return result;
    }
}
