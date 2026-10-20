// Public API module: chart/legend.d.ts
export { ChartLegend, fullscreenMenuLayer, } from './chart-legend.js';
export type { ChartLegendOptions, LegendBar, LegendChart, LegendChartType, LegendCrosshairParam, LegendIndicatorEngine, LegendIndicatorValue, LegendLine, LegendMenuLayer, LegendPaneHost, LegendSeriesData, LegendTradeMarks, } from './chart-legend.js';
export { TradeMarks, barOf, describeTrade, groupTradesByBar, tradeMarkers, } from './trade-marks.js';
export type { ChartTrade, TradeMarkColors, TradeMarksBar, TradeMarksChart, TradeMarksCrosshairParam, TradeMarksOptions, TradeMarksPlugin, TradeMarksSeries, } from './trade-marks.js';
export { consoleNotify, createTranslate, defaultChartFormatters, identityTranslate, standaloneHost, } from './chart-host.js';
export type { ChartFormatters, ChartUiHost, NotificationKind, Notify, Translate, } from './chart-host.js';

// Public API module: chart/chart-host.d.ts
export type Translate = (key: string, ...args: readonly string[]) => string;
export declare const identityTranslate: Translate;
export declare function createTranslate(dictionary: Readonly<Record<string, string>>): Translate;
export interface ChartFormatters {
    price(value: number): string;
    volume(value: number): string;
    time(timeSec: number): string;
}
export declare const defaultChartFormatters: ChartFormatters;
export type NotificationKind = 'success' | 'info' | 'warning' | 'error';
export type Notify = (message: string, kind: NotificationKind) => void;
export declare const consoleNotify: Notify;
export interface ChartUiHost {
    readonly translate: Translate;
    readonly formatters: ChartFormatters;
    readonly notify: Notify;
}
export declare const standaloneHost: ChartUiHost;
export interface ModalController {
    open(): void;
    close(): void;
    onClosed(handler: () => void): void;
}
export declare function createPlainModalController(root: HTMLElement): ModalController;

// Public API module: chart/chart-legend.d.ts
import type { ChartUiHost } from './chart-host.js';
import type { ChartTrade } from './trade-marks.js';
/**
 * A bar as the legend reads it. Every price field is optional on purpose: the crosshair
 * payload carries one entry per series, and a line/histogram/whitespace point has no OHLC —
 * which is exactly why `_onCrosshairMove` finite-checks a candidate before accepting it.
 */
export interface LegendBar {
    time: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
}
/** The per-series bar snapshot the host attaches to a crosshair event, keyed by series handle. */
export type LegendSeriesData = ReadonlyMap<unknown, LegendBar>;
/** The crosshair payload, reduced to the three fields this legend reads. */
export interface LegendCrosshairParam {
    time?: number | null;
    point?: {
        x: number;
        y: number;
    } | null;
    seriesData?: LegendSeriesData;
}
/**
 * The host chart, described structurally rather than imported: this legend is the same code
 * the web terminal runs, where the chart handle comes from the terminal's own charting stack,
 * while the demo mounts it on this package's engine. Both expose these two members.
 */
export interface LegendChart {
    subscribeCrosshairMove(handler: (param: LegendCrosshairParam) => void): void;
    /** Optional so an existing host that does not offer it still satisfies the contract. */
    unsubscribeCrosshairMove?(handler: (param: LegendCrosshairParam) => void): void;
    clearCrosshairPosition?(): void;
}
/** One indicator row as the indicator engine hands it to the legend. */
export interface LegendIndicatorValue {
    id: number;
    type: string;
    name: string;
    /** Output name -> value on the hovered bar; null where the study is sparse there. */
    values: Record<string, number | null | undefined>;
    /** Line colours, positionally aligned with `Object.keys(values)`. */
    colors: readonly string[];
    /** null = overlay on the main chart; anything else names the sub-pane it lives in. */
    paneId: string | null;
}
/**
 * A line the page draws itself and the legend names beside the candle: its value at the bar under the pointer, in its
 * own colour. It is no study of the indicator engine, so its row carries no edit or remove button.
 */
export interface LegendLine {
    name: string;
    color: string;
    /** The value at the bar that opens at `time`, or undefined where the line has none. */
    valueAt(time: number): number | undefined;
}
/** The trades marked on the chart, as the legend names them at a bar; `TradeMarks` is one. */
export interface LegendTradeMarks {
    /** The trades marked on the bar that opens at `time`; none where it has none. */
    barTrades(time: number): readonly ChartTrade[];
    colors(): {
        buy: string;
        sell: string;
        unknown: string;
    };
}
/** The slice of the indicator engine the legend talks to — same structural reasoning as LegendChart. */
export interface LegendIndicatorEngine {
    onChange: (() => void) | null;
    getIndicators(): readonly unknown[];
    getValuesAt(time: number | null | undefined, seriesData?: LegendSeriesData): readonly LegendIndicatorValue[];
    remove(id: number): void;
}
/**
 * Whatever owns the sub-panes an oscillator is drawn in.
 *
 * One member, because one is all the legend wants: somewhere to put a pane's values. It hands
 * back the element rather than taking a string of HTML, so the rows stay this legend's own nodes
 * carrying this legend's own handlers.
 */
export interface LegendPaneHost {
    /** The element a pane's indicator values belong in, or null once the pane is gone. */
    getValuesElement(paneId: string): HTMLElement | null;
}
/**
 * One entry of the chart-type menu behind the legend's toggle.
 *
 * The page supplies the list because the page owns the switcher: an entry for a rendering the
 * switcher does not implement is a menu item that does nothing when picked.
 */
export interface LegendChartType {
    /** Handed back through `onChartTypeChange`, and what `setChartType` matches on. */
    value: string;
    /** English source text; the legend words it through the host's translator. */
    label: string;
    /** The class list for the entry's icon element, e.g. `bi bi-bar-chart-fill`. */
    icon: string;
}
/**
 * Where the floating chart-type menu is appended. Called on every open, so a page that entered or
 * left fullscreen between two opens gets the menu in the layer that is on screen now.
 */
export type LegendMenuLayer = () => HTMLElement;
/**
 * The layer most pages want: the fullscreen element while one is up, the document body otherwise.
 * Nothing outside the fullscreen element is painted, so a menu in the body would simply not appear.
 */
export declare const fullscreenMenuLayer: LegendMenuLayer;
/** What the legend needs from the page it is mounted in. */
export interface ChartLegendOptions {
    /** The element the legend paints its strip and indicator rows into. */
    container: HTMLElement;
    /** Words and numbers: every user-visible string and every formatted value goes through it. */
    host: ChartUiHost;
    /** Where sub-pane indicator values are painted. */
    paneHost: LegendPaneHost;
    /** The renderings the page's chart-type switcher implements, in menu order. */
    chartTypes: readonly LegendChartType[];
    /** The layer the floating chart-type menu opens in; `fullscreenMenuLayer` suits most pages. */
    menuLayer: LegendMenuLayer;
}
export declare class ChartLegend {
    readonly _container: HTMLElement;
    readonly _host: ChartUiHost;
    readonly _paneHost: LegendPaneHost;
    readonly _chartTypes: readonly LegendChartType[];
    readonly _menuLayer: LegendMenuLayer;
    _chart: LegendChart | null;
    _rawCandles: readonly LegendBar[];
    _hasVolume: boolean;
    _indicatorEngine: LegendIndicatorEngine | null;
    _title: string;
    _lines: readonly LegendLine[];
    _lastLinesSignature: string | null;
    _tradeMarks: LegendTradeMarks | null;
    _isHovered: boolean;
    _isDisposed: boolean;
    _onMouseEnter: (() => void) | null;
    _onMouseLeave: (() => void) | null;
    _onClick: ((event: MouseEvent) => void) | null;
    _onCrosshair: ((param: LegendCrosshairParam) => void) | null;
    _onPaneClick: (event: MouseEvent) => void;
    _engineHook: {
        previous: (() => void) | null;
        wrapper: () => void;
    } | null;
    _lastIndSignature: string | null;
    _stripHasVolume: boolean | null;
    _lastSubPaneIds: Set<string>;
    _boundPaneValues: Map<string, HTMLElement>;
    _chartTypeMenu: HTMLElement | null;
    _chartTypeOutsideClick: ((event: MouseEvent) => void) | null;
    onEditIndicator: ((id: number, type: string) => void) | null;
    onChartTypeChange: ((type: string) => void) | null;
    _currentChartType: string;
    constructor(options: ChartLegendOptions);
    /** Attaches the legend to a chart: crosshair subscription plus the container's own listeners. */
    init(chart: LegendChart): void;
    /**
     * Detaches the legend: DOM listeners, the crosshair subscription and the engine hook it wrapped.
     * A terminal that rebuilds its chart on every symbol or timeframe change could not release the
     * legend at all before, so each rebuild left another set of listeners and another wrapper
     * around engine.onChange.
     */
    dispose(): void;
    /** Selects the rendering the toggle button reports; the page's switcher does the drawing. */
    setChartType(type: string): void;
    /** Hands the legend the bars behind the chart — the source it reads a hovered candle from. */
    setRawCandles(candles: readonly LegendBar[] | null | undefined): void;
    /** Names what the chart shows, ahead of the candle's prices: its instrument, say. An empty title names nothing. */
    setTitle(title: string): void;
    /** Hands the legend the lines it names beside the candle, in the order they are listed. */
    setLines(lines: readonly LegendLine[]): void;
    /**
     * Names the trades marked on the bar under the pointer in a row of their own, each side in the colour of its marks;
     * null takes the row away. Marks that were handed other trades are read again on the next paint, or at once by
     * `refresh()`.
     */
    setTradeMarks(marks: LegendTradeMarks | null): void;
    /** Points the legend at the indicator engine whose values it prints. */
    setIndicatorEngine(engine: LegendIndicatorEngine | null): void;
    refresh(): void;
    _onCrosshairMove(param: LegendCrosshairParam): void;
    _clearOHLCV(): void;
    _renderOHLCV(candle: LegendBar): void;
    /**
     * The trades marked on the bar: an entry for each side that has any, in the colour of its marks, naming the volume
     * and the price - for a side with several trades on the bar, how many, their volume and its average price.
     */
    _renderTrades(time: number | null): void;
    /** The page's own lines at the bar: a row of "name value" in each line's colour, built once per set of lines. */
    _renderLines(time: number | null | undefined): void;
    /**
     * The icon for the rendering on screen. A type the page never listed — set from a toolbar that
     * offers more than the menu does — wears the first entry's icon rather than no icon at all.
     */
    _currentChartTypeIcon(): string;
    /**
     * Opens the chart-type menu under its toggle. The menu is built in the host's menu layer rather
     * than inside the legend, whose HTML is rebuilt as bars tick — a menu in there is torn out of
     * the DOM the moment the user reaches for it.
     */
    _openChartTypeMenu(toggle: HTMLElement): void;
    /**
     * Takes this instance's menu down. One place for it, so choosing an item releases the outside
     * click listener too: removing the menu alone left the listener registered, holding the whole
     * detached subtree until some later click happened to land elsewhere.
     */
    _closeChartTypeMenu(): void;
    /**
     * Acts on a click that landed on an indicator's edit or remove button, wherever the row lives —
     * the main strip or a pane header. Answers whether it was one of those.
     */
    _handleIndicatorClick(target: Element | null): boolean;
    _renderIndicators(time: number | null | undefined, seriesData?: LegendSeriesData): void;
    /**
     * Paints the values that live in a sub-pane into that pane's values element, obtained from the
     * pane host; the overlay values in the same list belong to the main strip and are skipped here.
     * Grouped by paneId so two indicators sharing the same Percent pane (RSI + Stochastic) render
     * side by side, and each keeps its own edit + remove buttons so they are managed independently.
     */
    _paintSubPaneValues(values: readonly LegendIndicatorValue[]): void;
    _createPaneRow(ind: LegendIndicatorValue, named: boolean): HTMLElement;
    _createEditButton(ind: LegendIndicatorValue): HTMLElement;
    _createRemoveButton(ind: LegendIndicatorValue): HTMLElement;
    /** Binds this legend's click handling to a pane's values element, once per element. */
    _attachPaneValues(paneId: string, el: HTMLElement): void;
    _detachPaneValues(paneId: string): void;
}

// Public API module: chart/trade-marks.d.ts
import type { ChartUiHost } from './chart-host.js';
import type { SeriesMarker } from '../core/chart-api.js';
import type { TradingSide } from '../trading/model.js';
/** A trade as the marks read it. */
export interface ChartTrade {
    /** When it happened, UNIX seconds. */
    time: number;
    /** Its side; null when nothing says which. */
    side: TradingSide | null;
    price: number;
    volume: number;
}
/** The colours of the marks: one for each side and one for a trade of no known side. */
export interface TradeMarkColors {
    buy: string;
    sell: string;
    unknown: string;
}
/** A bar as the marks read it: when it opens, and how far it reaches, which is where its marks sit. */
export interface TradeMarksBar {
    time: number;
    high?: number;
    low?: number;
}
/** The crosshair payload, reduced to what the marks read. */
export interface TradeMarksCrosshairParam {
    time?: number | null;
    point?: {
        x: number;
        y: number;
    } | null;
}
/** The chart, described structurally as the legend describes it. */
export interface TradeMarksChart {
    subscribeCrosshairMove(handler: (param: TradeMarksCrosshairParam) => void): void;
    unsubscribeCrosshairMove(handler: (param: TradeMarksCrosshairParam) => void): void;
}
/** The candle series the trades are marked on. */
export interface TradeMarksSeries {
    data(): readonly TradeMarksBar[];
    priceToCoordinate(price: number): number | null;
}
/** Where the marks are drawn: the series' markers, as `createSeriesMarkers(series)` returns them. */
export interface TradeMarksPlugin {
    setMarkers(markers: SeriesMarker[]): void;
}
export interface TradeMarksOptions {
    chart: TradeMarksChart;
    series: TradeMarksSeries;
    markers: TradeMarksPlugin;
    /** The element the list of a mark's trades opens in. It sits over the chart and positions its children. */
    container: HTMLElement;
    /** Words the sides and formats the numbers of the marks and of the list. */
    host: ChartUiHost;
    colors: TradeMarkColors;
}
/** The bar a moment falls in: the last of the sorted bar times that is not after it; undefined before the first. */
export declare function barOf(time: number, barTimes: readonly number[]): number | undefined;
/** The trades of each bar, keyed by the time the bar opened. A trade before the first bar has no bar to be marked on. */
export declare function groupTradesByBar(trades: readonly ChartTrade[], barTimes: readonly number[]): Map<number, ChartTrade[]>;
/**
 * One mark per side of a bar: the buys under it, the sells over it, the trades of no known side on it. A mark for a
 * single trade says its price, a mark for several how many there are.
 */
export declare function tradeMarkers(groups: ReadonlyMap<number, readonly ChartTrade[]>, colors: TradeMarkColors, price: (value: number) => string): SeriesMarker[];
/** What the list says of a trade: its side, size, price and time, worded and formatted by the host. */
export declare function describeTrade(trade: ChartTrade, host: ChartUiHost): string;
/**
 * Trades marked on a candle series, and the list of a mark's trades under the pointer.
 *
 * The page hands over the trades; the bars are read from the series as it stands when they are handed over, so a
 * page that replaces the series' data hands the trades over again.
 */
export declare class TradeMarks {
    readonly _chart: TradeMarksChart;
    readonly _series: TradeMarksSeries;
    readonly _markers: TradeMarksPlugin;
    readonly _container: HTMLElement;
    readonly _host: ChartUiHost;
    _colors: TradeMarkColors;
    _groups: Map<number, ChartTrade[]>;
    _bars: Map<number, TradeMarksBar>;
    _tip: HTMLElement | null;
    _onCrosshair: ((param: TradeMarksCrosshairParam) => void) | null;
    constructor(options: TradeMarksOptions);
    /** Marks the trades on the bars the series holds now. */
    setTrades(trades: readonly ChartTrade[]): void;
    /** Repaints the marks in other colours: the page's theme changed. */
    setColors(colors: TradeMarkColors): void;
    /** The colours the marks are drawn in. */
    colors(): TradeMarkColors;
    /** The trades marked on the bar that opens at `time`, in the order they were handed over; none where it has none. */
    barTrades(time: number): readonly ChartTrade[];
    /** The trades of the mark at a point of a bar: the buys under the bar, the sells over it, the rest on it. */
    tradesAt(time: number, y: number): ChartTrade[];
    /** Takes the marks and the list off the chart and stops following the pointer. */
    dispose(): void;
    _paint(): void;
    _showTip(param: TradeMarksCrosshairParam): void;
    _createTip(): HTMLElement;
}

// Public API module: core/chart-api.d.ts
import { type TimeScaleFormatter } from '../time/time-axis-formatter.js';
import type { ITradingCalendar, TradingSessionKind } from '../time/trading-calendar.js';
import { type PaneOptions } from './model/pane-model.js';
import { type BarsInfo, type MismatchDirectionValue } from './model/series-store.js';
import { type ICommandStack } from './interaction/command-stack.js';
import { type InteractionStateSnapshot } from './interaction/interaction-controller.js';
import type { IChartPrimitive, PrimitiveAttachOptions, PrimitiveInteractionOptions, PrimitiveHitTestRole as PrimitiveHitTestRoleValue, PrimitiveZOrder as PrimitiveZOrderValue } from './primitives/primitive-api.js';
import type { TimeRange } from './scale/time-scale.js';
import { type SeriesDefinition, type TimedSeriesData } from '../series/registry.js';
export type { TimeRange } from './scale/time-scale.js';
export type { PaneOptions, PaneState } from './model/pane-model.js';
export { MismatchDirection } from './model/series-store.js';
export type { BarsInfo, MismatchDirectionValue } from './model/series-store.js';
export type { DataChangeKind, DataChangeSet } from './model/data-change-set.js';
export type { AutoscaleInfo, BitmapCoordinatesRenderingScope, CanvasRenderTarget, HitTestContext, IChartPrimitive, IPrimitiveRenderer, MediaCoordinatesRenderingScope, PrimitiveAxisView, PrimitiveAttachedContext, PrimitiveAttachOptions, PrimitiveDisposable, PrimitivePaneGeometry, PrimitivePaneView, PrimitiveHit, PrimitiveInteractionEvent, PrimitiveInteractionOptions, PrimitiveRect, PrimitiveSize, PrimitiveTheme, } from './primitives/primitive-api.js';
export { PrimitiveHitTestLocation, PrimitiveHitTestRole, PrimitivePaneViewClip, PrimitiveZOrder, } from './primitives/primitive-api.js';
export { InteractionState } from './interaction/interaction-controller.js';
export type { InteractionObjectRef, InteractionStateSnapshot, } from './interaction/interaction-controller.js';
export { CommandStack } from './interaction/command-stack.js';
export type { CommandStackListener, CommandStackSnapshot, ICommand, ICommandStack, } from './interaction/command-stack.js';
export { getSeriesDefinition, getSeriesTypes, registerSeries, seriesRendererRegistry, unregisterSeries, } from '../series/registry.js';
export type { CustomSeriesDefinition, IIncrementalSeriesDataProcessor, IncrementalSeriesDataProcessorFactory, ISeriesRenderer, PreparedSeriesData, SeriesDefinition, SeriesDataProcessor, SeriesDataProcessorPatch, SeriesDataUpdateKind, SeriesPriceRange, SeriesRendererContext, SeriesRendererPane, SeriesRendererTheme, TimedSeriesData, } from '../series/registry.js';
export type Time = number;
export interface WhitespaceData {
    time: Time;
}
export interface CandlestickData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
}
export interface LineData {
    time: Time;
    value: number;
}
export interface HistogramData {
    time: Time;
    value: number;
    color?: string;
}
export interface AreaData {
    time: Time;
    value: number;
}
export interface BandData {
    time: Time;
    value: number;
    upper: number;
    lower: number;
}
export type SeriesKind = 'Candlestick' | 'Bar' | 'Line' | 'Histogram' | 'Area' | 'Band' | 'PointFigure' | 'Renko';
export declare const CandlestickSeries: SeriesDefinition<CandlestickData, SeriesOptions>;
export declare const BarSeries: SeriesDefinition<CandlestickData, SeriesOptions>;
export declare const LineSeries: SeriesDefinition<LineData, SeriesOptions>;
export declare const HistogramSeries: SeriesDefinition<HistogramData, SeriesOptions>;
export declare const AreaSeries: SeriesDefinition<AreaData, SeriesOptions>;
export declare const BandSeries: SeriesDefinition<BandData, SeriesOptions>;
export declare const PointFigureSeries: SeriesDefinition<CandlestickData, SeriesOptions>;
export declare const RenkoSeries: SeriesDefinition<CandlestickData, SeriesOptions>;
export declare const ColorType: {
    readonly Solid: 'solid';
    readonly VerticalGradient: 'gradient';
};
export declare const LineStyle: {
    readonly Solid: 0;
    readonly Dotted: 1;
    readonly Dashed: 2;
    readonly LargeDashed: 3;
    readonly SparseDotted: 4;
};
export type LineStyleValue = typeof LineStyle[keyof typeof LineStyle];
export declare const CrosshairMode: {
    readonly Magnet: 0;
    readonly Normal: 1;
};
export type CrosshairModeValue = typeof CrosshairMode[keyof typeof CrosshairMode];
export declare const PriceScaleMode: {
    readonly Normal: 0;
    readonly Logarithmic: 1;
    readonly Percentage: 2;
    readonly IndexedTo100: 3;
};
export type PriceScaleModeValue = typeof PriceScaleMode[keyof typeof PriceScaleMode];
export declare const TimeScaleMode: {
    readonly Continuous: 'continuous';
    readonly Ordinal: 'ordinal';
    readonly SessionAware: 'session-aware';
};
export type TimeScaleModeValue = typeof TimeScaleMode[keyof typeof TimeScaleMode];
export interface PriceLineOptions {
    price: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: LineStyleValue;
    lineVisible?: boolean;
    axisLabelVisible?: boolean;
    axisLabelColor?: string;
    axisLabelTextColor?: string;
    title?: string;
    id?: string;
    onClose?: () => void;
    anchored?: boolean;
    draggable?: boolean;
    onDrag?: (price: number) => void;
    onDragCommit?: (price: number) => void;
}
export interface IPriceLine {
    applyOptions(patch: Partial<PriceLineOptions>): void;
    options(): PriceLineOptions;
}
export interface SeriesMarker {
    time: Time;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
    text?: string;
}
export interface PriceFormat {
    type?: 'price' | 'volume' | 'percent';
    precision?: number;
    minMove?: number;
}
export interface SeriesOptions {
    upColor?: string;
    downColor?: string;
    borderVisible?: boolean;
    borderUpColor?: string;
    borderDownColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
    color?: string;
    lineColor?: string;
    lineWidth?: number;
    lineStyle?: LineStyleValue;
    lineVisible?: boolean;
    pointMarkersVisible?: boolean;
    pointMarkersRadius?: number;
    topColor?: string;
    bottomColor?: string;
    upperColor?: string;
    lowerColor?: string;
    fillColor?: string;
    positiveFillColor?: string;
    negativeFillColor?: string;
    upperLineWidth?: number;
    lowerLineWidth?: number;
    upperLineStyle?: LineStyleValue;
    lowerLineStyle?: LineStyleValue;
    upperLineVisible?: boolean;
    lowerLineVisible?: boolean;
    fillVisible?: boolean;
    base?: number;
    /** Stable persistence key. Generated once when omitted and immutable afterwards. */
    id?: string;
    /** False for runtime-owned output series (for example indicator painter internals). */
    persist?: boolean;
    /** False hides rendering, autoscale, crosshair values and series-owned primitives. */
    visible?: boolean;
    priceScaleId?: string;
    priceLineVisible?: boolean;
    lastValueVisible?: boolean;
    priceLineSource?: 'lastBar' | 'lastVisible';
    priceFormat?: PriceFormat;
    boxSize?: number;
    reversal?: number;
}
export interface TimeScaleOptions {
    borderColor?: string;
    timeVisible?: boolean;
    secondsVisible?: boolean;
    visible?: boolean;
    /** Explicit time-domain mapping. Defaults to continuous. */
    mode?: TimeScaleModeValue;
    /** Required by session-aware mode. */
    calendar?: ITradingCalendar;
    /** Sessions retained by session-aware mode. Omit to retain every kind. */
    sessionKinds?: readonly TradingSessionKind[];
    /** BCP 47 locale. Defaults to deterministic en-GB. */
    locale?: string;
    /** IANA timezone. Defaults to the calendar timezone, then UTC. */
    timeZone?: string;
    /** Optional formatter shared by tick and crosshair labels. */
    formatter?: TimeScaleFormatter;
}
export interface ChartOptions {
    width?: number;
    height?: number;
    autoSize?: boolean;
    commandHistoryLimit?: number;
    layout?: {
        background?: {
            type?: string;
            color?: string;
        };
        textColor?: string;
        fontFamily?: string;
        attributionLogo?: boolean;
        fontSize?: number;
    };
    watermark?: {
        visible?: boolean;
        text?: string;
        color?: string;
        fontSize?: number;
        fontFamily?: string;
        fontStyle?: string;
        vertAlign?: 'top' | 'center' | 'bottom';
        horzAlign?: 'left' | 'center' | 'right';
    };
    grid?: {
        vertLines?: {
            color?: string;
            visible?: boolean;
        };
        horzLines?: {
            color?: string;
            visible?: boolean;
        };
    };
    rightPriceScale?: {
        borderColor?: string;
        scaleMargins?: {
            top?: number;
            bottom?: number;
        };
    };
    leftPriceScale?: {
        borderColor?: string;
        scaleMargins?: {
            top?: number;
            bottom?: number;
        };
    };
    timeScale?: TimeScaleOptions;
    crosshair?: {
        vertLine?: {
            color?: string;
            visible?: boolean;
        };
        horzLine?: {
            color?: string;
            visible?: boolean;
        };
        mode?: CrosshairModeValue;
    };
    handleScroll?: boolean | {
        mouseWheel?: boolean;
        pressedMouseMove?: boolean;
    };
    handleScale?: boolean | {
        axisPressedMouseMove?: boolean;
        mouseWheel?: boolean;
    };
}
export declare function renkoBars(candles: ReadonlyArray<CandlestickData>, boxSize?: number): CandlestickData[];
export declare function pnfBars(candles: ReadonlyArray<CandlestickData>, boxSize?: number, reversal?: number): CandlestickData[];
export interface PriceScaleOptions {
    scaleMargins?: {
        top?: number;
        bottom?: number;
    };
    mode?: PriceScaleModeValue;
    autoScale?: boolean;
}
export interface ResolvedPriceScaleOptions {
    readonly scaleMargins: Readonly<{
        top: number;
        bottom: number;
    }>;
    readonly mode: PriceScaleModeValue;
    readonly autoScale: boolean;
}
export interface SeriesHoveredObject {
    readonly type: 'series';
    readonly series: ISeriesApi<any, any>;
    readonly data: TimedSeriesData;
}
export interface PriceLineHoveredObject {
    readonly type: 'price-line';
    readonly series: ISeriesApi<any, any>;
    readonly priceLine: IPriceLine;
    readonly id: string | null;
}
export interface PrimitiveHoveredObject {
    readonly type: 'primitive';
    readonly primitive: IChartPrimitive;
    readonly id: string;
    readonly role: PrimitiveHitTestRoleValue;
    readonly cursor: string;
    readonly zOrder: PrimitiveZOrderValue;
    readonly data: unknown;
    readonly interaction: Readonly<Required<PrimitiveInteractionOptions>>;
}
export type HoveredObject = SeriesHoveredObject | PriceLineHoveredObject | PrimitiveHoveredObject;
export interface CrosshairEvent {
    readonly time: Time | null;
    readonly logical: number | null;
    readonly point: {
        x: number;
        y: number;
    } | null;
    readonly paneId: string | null;
    readonly price: number | null;
    readonly seriesData: ReadonlyMap<ISeriesApi<any, any>, TimedSeriesData>;
    readonly hoveredObject: HoveredObject | null;
    readonly sourceEvent: PointerEvent | MouseEvent | null;
}
export interface CrosshairPosition {
    readonly time: Time;
    readonly price?: number;
    readonly pane?: IPaneApi;
    readonly series?: ISeriesApi<any, any>;
}
export type RangeListener = (range: TimeRange | null) => void;
export type CrosshairListener = (param: CrosshairEvent) => void;
export interface ChartClick {
    price: number | null;
    time: Time | null;
    point: {
        x: number;
        y: number;
    };
    paneId: string;
    seriesData: ReadonlyMap<ISeriesApi<any, any>, TimedSeriesData>;
    button: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    hoveredObject: HoveredObject | null;
}
export type ClickListener = (c: ChartClick) => void;
export type InteractionStateListener = (state: InteractionStateSnapshot) => void;
export interface OrderPlace {
    price: number;
    button: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
}
export type OrderPlaceListener = (e: OrderPlace) => void;
export interface LogicalRange {
    from: number;
    to: number;
}
export type LogicalRangeListener = (range: LogicalRange | null) => void;
export interface IPriceScaleApi {
    applyOptions(patch: PriceScaleOptions): void;
    options(): ResolvedPriceScaleOptions;
}
export interface ISeriesMarkersPlugin {
    setMarkers(markers: SeriesMarker[]): void;
}
export interface ISeriesApi<TData extends TimedSeriesData = TimedSeriesData, TOptions extends SeriesOptions = SeriesOptions> {
    id(): string;
    type(): string;
    options(): Readonly<TOptions>;
    setData(points: ReadonlyArray<TData>): void;
    update(point: TData): void;
    prependData(points: ReadonlyArray<TData>): void;
    pop(count?: number): TData[];
    data(): readonly TData[];
    dataByIndex(logicalIndex: number, mismatchDirection?: MismatchDirectionValue): TData | null;
    barsInLogicalRange(range: LogicalRange): BarsInfo | null;
    applyOptions(patch: Partial<TOptions>): void;
    priceScaleId(): string;
    priceScale(): IPriceScaleApi;
    createPriceLine(options: PriceLineOptions): IPriceLine;
    removePriceLine(line: IPriceLine): void;
    /** Finite renderer-defined prices eligible for cursor and drawing snapping. */
    magnetValues(data: TData): readonly number[];
    priceToCoordinate(price: number): number | null;
    coordinateToPrice(y: number): number | null;
}
export interface ITimeScaleApi {
    fitContent(): void;
    setVisibleRange(range: TimeRange): void;
    getVisibleRange(): TimeRange | null;
    scrollToRealTime(): void;
    subscribeVisibleTimeRangeChange(cb: RangeListener): void;
    unsubscribeVisibleTimeRangeChange(cb: RangeListener): void;
    getVisibleLogicalRange(): LogicalRange | null;
    setVisibleLogicalRange(range: LogicalRange): void;
    subscribeVisibleLogicalRangeChange(cb: LogicalRangeListener): void;
    unsubscribeVisibleLogicalRangeChange(cb: LogicalRangeListener): void;
    timeToCoordinate(time: Time): number | null;
    coordinateToTime(x: number): Time | null;
    logicalToCoordinate(index: number): number | null;
    coordinateToLogical(x: number): number | null;
}
export interface PaneSize {
    width: number;
    height: number;
    top: number;
}
export interface IPaneApi {
    id(): string;
    addSeries<TData extends TimedSeriesData, TOptions extends SeriesOptions = SeriesOptions>(definition: SeriesDefinition<TData, TOptions>, options?: Partial<TOptions>): ISeriesApi<TData, TOptions>;
    removeSeries(series: ISeriesApi): void;
    series(): readonly ISeriesApi[];
    priceScaleIds(): readonly string[];
    priceScale(scaleId?: string): IPriceScaleApi;
    timeScale(): ITimeScaleApi;
    applyOptions(options: Omit<PaneOptions, 'id'>): void;
    options(): Required<PaneOptions>;
    getSize(): PaneSize;
}
export interface OrderPlacementOptions {
    modifier?: 'ctrl' | 'shift' | 'alt';
    color?: string;
    title?: string;
}
export interface IChartApi {
    addPane(options?: PaneOptions): IPaneApi;
    panes(): readonly IPaneApi[];
    removePane(pane: IPaneApi): void;
    addSeries<TData extends TimedSeriesData, TOptions extends SeriesOptions = SeriesOptions>(definition: SeriesDefinition<TData, TOptions>, options?: Partial<TOptions>, pane?: IPaneApi): ISeriesApi<TData, TOptions>;
    /** Moves the existing series instance and its attached primitives to another pane. */
    moveSeries(series: ISeriesApi, pane: IPaneApi): void;
    removeSeries(series: ISeriesApi): void;
    attachPrimitive(primitive: IChartPrimitive, options?: PrimitiveAttachOptions): void;
    detachPrimitive(primitive: IChartPrimitive): void;
    commandStack(): ICommandStack;
    interactionState(): InteractionStateSnapshot;
    subscribeInteractionStateChange(cb: InteractionStateListener): void;
    unsubscribeInteractionStateChange(cb: InteractionStateListener): void;
    beginDrawing(): void;
    finishDrawing(): void;
    timeScale(): ITimeScaleApi;
    priceScale(scaleId?: string): IPriceScaleApi;
    subscribeClick(cb: ClickListener): void;
    unsubscribeClick(cb: ClickListener): void;
    subscribeCrosshairMove(cb: CrosshairListener): void;
    unsubscribeCrosshairMove(cb: CrosshairListener): void;
    setCrosshairPosition(position: CrosshairPosition): void;
    clearCrosshairPosition(): void;
    setOrderPlacement(options: OrderPlacementOptions | null): void;
    subscribeOrderPlace(cb: OrderPlaceListener): void;
    unsubscribeOrderPlace(cb: OrderPlaceListener): void;
    draggingLine(): IPriceLine | null;
    options(): Readonly<ChartOptions>;
    applyOptions(patch: ChartOptions): void;
    resize(width: number, height: number): void;
    takeScreenshot(): HTMLCanvasElement;
    remove(): void;
}
export declare function createChart(container: HTMLElement, options?: ChartOptions): IChartApi;
export declare function createSeriesMarkers(series: ISeriesApi, markers?: SeriesMarker[]): ISeriesMarkersPlugin;
export declare const version = "sschart-experimental-0.1";

// Public API module: core/disposable.d.ts
export interface IDisposable {
    dispose(): void;
}
export type DisposeCallback = () => void;
export declare function toDisposable(callback: DisposeCallback): IDisposable;
/** Owns a group of resources and releases them once, in reverse order. */
export declare class DisposableStore implements IDisposable {
    private readonly items;
    private disposed;
    get isDisposed(): boolean;
    add<T extends IDisposable>(item: T): T;
    defer(callback: DisposeCallback): IDisposable;
    listen<TEvent extends Event>(target: EventTarget, type: string, listener: (event: TEvent) => void, options?: boolean | AddEventListenerOptions): IDisposable;
    clear(): void;
    dispose(): void;
}
/** A replaceable resource slot used for pending RAFs, requests and workers. */
export declare class MutableDisposable implements IDisposable {
    private current;
    private disposed;
    set value(next: IDisposable | null);
    get value(): IDisposable | null;
    clear(): void;
    dispose(): void;
}

// Public API module: core/interaction/command-stack.d.ts
export interface ICommand {
    readonly label?: string;
    execute(): void;
    undo(): void;
    redo?(): void;
}
export interface CommandStackSnapshot {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly undoLabel: string | null;
    readonly redoLabel: string | null;
    readonly undoCount: number;
    readonly redoCount: number;
    readonly transactionActive: boolean;
}
export type CommandStackListener = (snapshot: CommandStackSnapshot) => void;
export interface ICommandStack {
    execute(command: ICommand): void;
    undo(): boolean;
    redo(): boolean;
    beginTransaction(label?: string): void;
    commitTransaction(): boolean;
    rollbackTransaction(): boolean;
    transaction<T>(label: string, action: () => T): T;
    clear(): void;
    snapshot(): CommandStackSnapshot;
    subscribe(listener: CommandStackListener): void;
    unsubscribe(listener: CommandStackListener): void;
}
/** Bounded, failure-safe command history shared by drawings and trading overlays. */
export declare class CommandStack implements ICommandStack {
    private readonly historyLimit;
    private readonly undoStack;
    private readonly redoStack;
    private readonly listeners;
    private activeTransaction;
    private running;
    private disposed;
    constructor(historyLimit?: number);
    execute(command: ICommand): void;
    undo(): boolean;
    redo(): boolean;
    beginTransaction(label?: string): void;
    commitTransaction(): boolean;
    rollbackTransaction(): boolean;
    transaction<T>(label: string, action: () => T): T;
    clear(): void;
    snapshot(): CommandStackSnapshot;
    subscribe(listener: CommandStackListener): void;
    unsubscribe(listener: CommandStackListener): void;
    dispose(): void;
    private record;
    private trimHistory;
    private run;
    private assertCommand;
    private assertAlive;
    private assertNoTransaction;
    private requireTransaction;
    private emit;
}

// Public API module: core/interaction/interaction-controller.d.ts
import type { IChartPrimitive, PrimitiveHitTestRole } from '../primitives/primitive-api.js';
export declare const InteractionState: Readonly<{
    readonly Idle: 'idle';
    readonly Hover: 'hover';
    readonly Drawing: 'drawing';
    readonly Selected: 'selected';
    readonly DraggingBody: 'dragging-body';
    readonly DraggingHandle: 'dragging-handle';
    readonly Panning: 'panning';
    readonly Scaling: 'scaling';
}>;
export type InteractionState = typeof InteractionState[keyof typeof InteractionState];
export interface InteractionObjectRef {
    readonly primitive: IChartPrimitive;
    readonly id: string;
    readonly role: PrimitiveHitTestRole;
}
export interface InteractionStateSnapshot {
    readonly state: InteractionState;
    readonly hovered: InteractionObjectRef | null;
    readonly selected: InteractionObjectRef | null;
}
export interface InteractionPoint {
    readonly x: number;
    readonly y: number;
}
export type InteractionPressTarget = {
    readonly kind: 'primitive';
    readonly object: InteractionObjectRef;
    readonly selectable: boolean;
    readonly draggable: boolean;
} | {
    readonly kind: 'pane';
} | {
    readonly kind: 'scale';
} | {
    readonly kind: 'legacy-line';
    readonly objectId: string;
};
export interface InteractionMovement {
    readonly point: InteractionPoint;
    readonly startPoint: InteractionPoint;
    readonly delta: InteractionPoint;
    readonly totalDelta: InteractionPoint;
    readonly state: InteractionState;
    readonly started: boolean;
}
export declare class InteractionController {
    private readonly changed;
    private readonly dragThreshold;
    private state;
    private hovered;
    private selected;
    private press;
    constructor(changed?: (snapshot: InteractionStateSnapshot) => void, dragThreshold?: number);
    snapshot(): InteractionStateSnapshot;
    get hasActivePress(): boolean;
    hover(object: InteractionObjectRef | null): void;
    pointerDown(point: InteractionPoint, target: InteractionPressTarget): void;
    pointerMove(point: InteractionPoint): InteractionMovement | null;
    pointerUp(point: InteractionPoint): InteractionMovement | null;
    cancel(): void;
    beginDrawing(): void;
    finishDrawing(selected?: InteractionObjectRef | null): void;
    clearSelection(): void;
    forgetPrimitive(primitive: IChartPrimitive): void;
    private setState;
    private emit;
}

// Public API module: core/model/data-change-set.d.ts
export type DataChangeKind = 'replace' | 'update' | 'append' | 'prepend' | 'pop' | 'clear';
export interface DataChangeSet {
    readonly kind: DataChangeKind;
    readonly version: number;
    readonly fromIndex: number;
    readonly toIndex: number;
    readonly added: number;
    readonly removed: number;
}

// Public API module: core/model/pane-model.d.ts
import { PriceScaleModel } from '../scale/price-scale.js';
export type PaneState = 'normal' | 'minimized' | 'maximized';
export interface PaneOptions {
    id?: string;
    height?: number;
    minHeight?: number;
    order?: number;
    state?: PaneState;
}
export declare class PaneModel<TSeries> {
    readonly id: string;
    height: number;
    minHeight: number;
    order: number;
    state: PaneState;
    priceZoom: number;
    readonly series: TSeries[];
    private readonly scales;
    constructor(options: Required<PaneOptions>);
    applyOptions(options: Omit<PaneOptions, 'id'>): void;
    addSeries(series: TSeries): void;
    removeSeries(series: TSeries): boolean;
    priceScale(id?: string): PriceScaleModel;
    priceScaleIds(): readonly string[];
}

// Public API module: core/model/series-store.d.ts
import type { DataChangeSet } from './data-change-set.js';
export interface TimedValue {
    time: number;
}
export interface LogicalIndexRange {
    from: number;
    to: number;
}
export declare const MismatchDirection: {
    readonly NearestLeft: -1;
    readonly None: 0;
    readonly NearestRight: 1;
};
export type MismatchDirectionValue = typeof MismatchDirection[keyof typeof MismatchDirection];
export interface BarsInfo {
    barsBefore: number;
    barsAfter: number;
    from: number;
    to: number;
}
export interface IndexedData<TValue> {
    readonly from: number;
    readonly to: number;
    readonly points: readonly TValue[];
}
/** Sorted, versioned storage plus logarithmic time/index lookups. */
export declare class SeriesStore<TValue extends TimedValue> {
    private readonly items;
    private currentVersion;
    get version(): number;
    get length(): number;
    get values(): readonly TValue[];
    get first(): TValue | undefined;
    get last(): TValue | undefined;
    replace(points: ReadonlyArray<TValue>): DataChangeSet;
    update(point: TValue): DataChangeSet | null;
    prepend(points: ReadonlyArray<TValue>): DataChangeSet | null;
    pop(count?: number): {
        points: TValue[];
        change: DataChangeSet | null;
    };
    /** Applies a validated tail splice without copying or sorting the prefix. */
    replaceTail(fromIndex: number, removed: number, points: ReadonlyArray<TValue>): DataChangeSet | null;
    snapshot(): readonly TValue[];
    dataByIndex(index: number, mismatchDirection?: MismatchDirectionValue): TValue | null;
    pointAtTime(time: number): TValue | null;
    nearest(time: number): TValue | null;
    visibleRange(fromTime: number, toTime: number, neighbourPadding?: number): IndexedData<TValue>;
    barsInLogicalRange(range: LogicalIndexRange): BarsInfo | null;
    lowerBound(time: number): number;
    upperBound(time: number): number;
    private change;
}

// Public API module: core/primitives/primitive-api.d.ts
import type { IDisposable } from '../disposable.js';
import type { ICommandStack } from '../interaction/command-stack.js';
import type { IChartApi, IPaneApi, ISeriesApi, SeriesOptions, Time, TimedSeriesData, LogicalRange } from '../chart-api.js';
/** Closed primitive layer set. Arbitrary numeric z-indexes are intentionally unsupported. */
export declare const PrimitiveZOrder: Readonly<{
    readonly Background: 'background';
    readonly Bottom: 'bottom';
    readonly Normal: 'normal';
    readonly Top: 'top';
}>;
export type PrimitiveZOrder = typeof PrimitiveZOrder[keyof typeof PrimitiveZOrder];
export declare const PrimitivePaneViewClip: Readonly<{
    readonly Plot: 'plot';
    readonly Pane: 'pane';
}>;
export type PrimitivePaneViewClip = typeof PrimitivePaneViewClip[keyof typeof PrimitivePaneViewClip];
export declare const PrimitiveHitTestRole: Readonly<{
    readonly Body: 'body';
    readonly Handle: 'handle';
    readonly Label: 'label';
    readonly CloseButton: 'close-button';
}>;
export type PrimitiveHitTestRole = typeof PrimitiveHitTestRole[keyof typeof PrimitiveHitTestRole];
export declare const PrimitiveHitTestLocation: Readonly<{
    readonly Pane: 'pane';
    readonly PriceAxis: 'price-axis';
    readonly TimeAxis: 'time-axis';
}>;
export type PrimitiveHitTestLocation = typeof PrimitiveHitTestLocation[keyof typeof PrimitiveHitTestLocation];
/** A resource owned by a primitive attachment. */
export type PrimitiveDisposable = IDisposable | (() => void);
export interface PrimitiveTheme {
    readonly backgroundColor: string;
    readonly textColor: string;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly verticalGridColor: string;
    readonly horizontalGridColor: string;
}
export interface PrimitiveAttachOptions {
    /** Pane to which the primitive belongs. Defaults to the main pane. */
    readonly pane?: IPaneApi;
    /** Optional series used as the default price scale and coordinate source. */
    readonly series?: ISeriesApi<TimedSeriesData, SeriesOptions>;
    /** Price scale used when no explicit scale is passed to a conversion. */
    readonly priceScaleId?: string;
}
export interface PrimitiveSize {
    readonly width: number;
    readonly height: number;
}
export interface PrimitiveRect extends PrimitiveSize {
    readonly x: number;
    readonly y: number;
}
export interface PrimitivePaneGeometry extends PrimitiveRect {
    readonly plot: PrimitiveRect;
    readonly isLast: boolean;
}
export interface MediaCoordinatesRenderingScope {
    readonly context: CanvasRenderingContext2D;
    readonly mediaSize: PrimitiveSize;
}
export interface BitmapCoordinatesRenderingScope extends MediaCoordinatesRenderingScope {
    readonly bitmapSize: PrimitiveSize;
    readonly horizontalPixelRatio: number;
    readonly verticalPixelRatio: number;
}
/** A renderer receives scoped access to canvas state for the duration of draw(). */
export interface CanvasRenderTarget {
    readonly pane: PrimitivePaneGeometry;
    useMediaCoordinateSpace<T>(consumer: (scope: MediaCoordinatesRenderingScope) => T): T;
    useBitmapCoordinateSpace<T>(consumer: (scope: BitmapCoordinatesRenderingScope) => T): T;
}
export interface IPrimitiveRenderer {
    draw(target: CanvasRenderTarget): void;
}
export interface PrimitivePaneView {
    zOrder(): PrimitiveZOrder;
    clip?(): PrimitivePaneViewClip;
    renderer(): IPrimitiveRenderer | null;
}
export interface PrimitiveAxisView {
    coordinate(): number | null;
    text(): string;
    backgroundColor(): string;
    textColor?(): string;
    visible?(): boolean;
    tickVisible?(): boolean;
    /** Price-axis side/scale. Defaults to the attached series scale, then right. */
    priceScaleId?(): string;
}
/**
 * Stable services exposed to an attached primitive. The implementation never
 * leaks ChartImpl or a long-lived raw CanvasRenderingContext.
 */
export interface PrimitiveAttachedContext {
    readonly chart: IChartApi;
    readonly pane: IPaneApi;
    readonly series: ISeriesApi<TimedSeriesData, SeriesOptions> | null;
    readonly priceScaleId: string;
    readonly commandStack: ICommandStack;
    requestUpdate(): void;
    timeToCoordinate(time: Time): number | null;
    coordinateToTime(x: number): Time | null;
    priceToCoordinate(price: number, scaleId?: string): number | null;
    coordinateToPrice(y: number, scaleId?: string): number | null;
    pixelRatio(): number;
    theme(): Readonly<PrimitiveTheme>;
    /** The resource is released automatically on detach or chart removal. */
    addDisposable(resource: PrimitiveDisposable): void;
}
export interface AutoscaleInfo {
    readonly priceRange: {
        readonly min: number;
        readonly max: number;
    };
    /** Extra media-coordinate pixels reserved around the primitive. */
    readonly margins?: {
        readonly above?: number;
        readonly below?: number;
    };
}
export interface PrimitiveHit {
    /** Stable within the primitive lifetime and persisted model. */
    readonly id: string;
    readonly role: PrimitiveHitTestRole;
    readonly cursor?: string;
    readonly zOrder?: PrimitiveZOrder;
    readonly data?: unknown;
    readonly interaction?: PrimitiveInteractionOptions;
}
export interface PrimitiveInteractionOptions {
    readonly selectable?: boolean;
    readonly draggable?: boolean;
    /** Consume the pointer gesture without selecting or dragging (for buttons). */
    readonly consumePointer?: boolean;
}
export interface PrimitiveInteractionEvent {
    readonly point: Readonly<{
        x: number;
        y: number;
    }>;
    readonly startPoint: Readonly<{
        x: number;
        y: number;
    }>;
    readonly delta: Readonly<{
        x: number;
        y: number;
    }>;
    readonly totalDelta: Readonly<{
        x: number;
        y: number;
    }>;
    readonly hit: Readonly<{
        id: string;
        role: PrimitiveHitTestRole;
        data: unknown;
    }>;
    readonly sourceEvent: PointerEvent;
}
export interface HitTestContext {
    readonly pane: IPaneApi;
    readonly series: ISeriesApi<TimedSeriesData, SeriesOptions> | null;
    readonly priceScaleId: string;
    readonly location: PrimitiveHitTestLocation;
    readonly sourceEvent: PointerEvent | MouseEvent | null;
}
/** Public lifecycle contract shared by overlays, drawings and trading tools. */
export interface IChartPrimitive {
    attached(context: PrimitiveAttachedContext): void;
    detached(): void;
    updateAllViews(): void;
    paneViews?(): readonly PrimitivePaneView[];
    priceAxisViews?(): readonly PrimitiveAxisView[];
    timeAxisViews?(): readonly PrimitiveAxisView[];
    autoscaleInfo?(range: LogicalRange): AutoscaleInfo | null;
    hitTest?(point: Readonly<{
        x: number;
        y: number;
    }>, context: HitTestContext): PrimitiveHit | null;
    onPointerDown?(event: PrimitiveInteractionEvent): void;
    onPointerMove?(event: PrimitiveInteractionEvent): void;
    onPointerUp?(event: PrimitiveInteractionEvent): void;
    onPointerCancel?(event: PrimitiveInteractionEvent): void;
}

// Public API module: core/scale/price-scale.d.ts
export interface PriceScaleMargins {
    top: number;
    bottom: number;
}
export interface PriceRange {
    min: number;
    max: number;
    mode: number;
    baseValue: number;
    baseValues: ReadonlyMap<object, number>;
}
/** Mutable state of one named price scale inside one pane. */
export declare class PriceScaleModel {
    readonly id: string;
    margins: PriceScaleMargins;
    mode: number;
    frozenRange: PriceRange | null;
    constructor(id: string);
    setMargins(margins: Partial<PriceScaleMargins>): void;
    setMode(mode: number): void;
}

// Public API module: core/scale/time-scale.d.ts
export interface TimeRange {
    from: number;
    to: number;
}
/** Canonical time-domain state shared by every pane in a chart. */
export declare class TimeScaleModel {
    dataFrom: number;
    dataTo: number;
    visibleFrom: number;
    visibleTo: number;
    get dataRange(): TimeRange;
    get visibleRange(): TimeRange | null;
    /**
     * `span` is the fallback width for a degenerate range -- one bar, where from === to. Rejecting
     * that case left the model on its constructor defaults, so a chart fed a single candle (the
     * ordinary start of a live feed, and any single-point series) never showed anything: fitContent
     * re-fitted the stale 0..1 window and setVisibleRange was clamped back to it.
     */
    updateDataRange(from: number, to: number, span?: number): boolean;
    fitContent(): boolean;
    scrollToRealTime(gapRatio?: number): boolean;
    setVisibleRange(range: TimeRange, clampToData?: boolean): boolean;
    clampVisibleRange(nextFrom: number, nextTo: number): void;
}

// Public API module: series/registry.d.ts
export interface TimedSeriesData {
    time: number;
}
export interface SeriesPriceRange {
    min: number;
    max: number;
}
export interface SeriesRendererPane {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
}
export interface SeriesRendererTheme {
    fontFamily: string;
    textColor: string;
    horizontalGridColor: string;
    verticalGridColor: string;
}
export interface SeriesRendererContext<TData extends TimedSeriesData = TimedSeriesData, TOptions extends object = object> {
    readonly target: CanvasRenderingContext2D;
    readonly data: readonly TData[];
    readonly allData: readonly TData[];
    readonly options: Readonly<TOptions>;
    readonly priceRange: SeriesPriceRange;
    readonly visibleTimeRange: Readonly<{
        from: number;
        to: number;
    }>;
    readonly pane: SeriesRendererPane;
    readonly theme: SeriesRendererTheme;
    readonly barSpacing: number;
    readonly metadata: Readonly<Record<string, unknown>>;
    timeToCoordinate(time: number): number;
    priceToCoordinate(price: number): number;
}
export interface PreparedSeriesData<TData extends TimedSeriesData = TimedSeriesData> {
    readonly data: readonly TData[];
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export type SeriesDataProcessor<TData extends TimedSeriesData, TOptions extends object> = (data: readonly TData[], options: Readonly<TOptions>) => PreparedSeriesData<TData>;
export type SeriesDataUpdateKind = 'append' | 'update';
/** A tail splice emitted by a stateful series data processor. */
export interface SeriesDataProcessorPatch<TData extends TimedSeriesData = TimedSeriesData> {
    readonly fromIndex: number;
    readonly removed: number;
    readonly data: readonly TData[];
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Per-series processor instance for transforms whose live update is cheaper
 * than rebuilding their complete output (for example Renko and Point & Figure).
 */
export interface IIncrementalSeriesDataProcessor<TData extends TimedSeriesData, TOptions extends object> {
    reset(data: readonly TData[], options: Readonly<TOptions>): PreparedSeriesData<TData>;
    update(point: TData, options: Readonly<TOptions>, kind: SeriesDataUpdateKind): SeriesDataProcessorPatch<TData> | null;
}
export type IncrementalSeriesDataProcessorFactory<TData extends TimedSeriesData, TOptions extends object> = () => IIncrementalSeriesDataProcessor<TData, TOptions>;
export interface ISeriesRenderer<TData extends TimedSeriesData = TimedSeriesData, TOptions extends object = object> {
    readonly dataPadding?: number;
    /** Allows all-data overlays to render when no source point intersects the viewport. */
    readonly drawOutsideVisibleRange?: boolean;
    draw(context: SeriesRendererContext<TData, TOptions>): void;
    priceRange?(data: readonly TData[], options: Readonly<TOptions>): SeriesPriceRange | null;
    priceValue?(data: TData, options: Readonly<TOptions>): number | null;
    colorAt?(data: TData, options: Readonly<TOptions>): string | null;
    magnetValues?(data: TData, options: Readonly<TOptions>): readonly number[];
}
declare const seriesDataType: unique symbol;
declare const seriesOptionsType: unique symbol;
export interface SeriesDefinition<TData extends TimedSeriesData = TimedSeriesData, TOptions extends object = object> {
    readonly type: string;
    /** Type-only fields used to preserve data/options inference for registry references. */
    readonly [seriesDataType]?: TData;
    readonly [seriesOptionsType]?: TOptions;
}
export interface CustomSeriesDefinition<TData extends TimedSeriesData = TimedSeriesData, TOptions extends object = object> extends SeriesDefinition<TData, TOptions> {
    readonly defaultOptions: Readonly<TOptions>;
    readonly renderer: ISeriesRenderer<TData, TOptions>;
    readonly dataProcessor?: SeriesDataProcessor<TData, TOptions>;
    readonly incrementalDataProcessorFactory?: IncrementalSeriesDataProcessorFactory<TData, TOptions>;
    readonly affectsTimeScale?: boolean;
}
export declare class SeriesRendererRegistry {
    private readonly definitions;
    register<TData extends TimedSeriesData, TOptions extends object>(definition: CustomSeriesDefinition<TData, TOptions>): CustomSeriesDefinition<TData, TOptions>;
    unregister(type: string): boolean;
    has(type: string): boolean;
    get(type: string): CustomSeriesDefinition<any, any> | undefined;
    resolve(definition: SeriesDefinition<any, any>): CustomSeriesDefinition<any, any>;
    reference<TData extends TimedSeriesData = TimedSeriesData, TOptions extends object = object>(type: string): SeriesDefinition<TData, TOptions>;
    types(): readonly string[];
}
export declare const seriesRendererRegistry: SeriesRendererRegistry;
export declare function registerSeries<TData extends TimedSeriesData, TOptions extends object>(definition: CustomSeriesDefinition<TData, TOptions>): CustomSeriesDefinition<TData, TOptions>;
export declare function unregisterSeries(type: string): boolean;
export declare function getSeriesDefinition(type: string): CustomSeriesDefinition<any, any> | undefined;
export declare function getSeriesTypes(): readonly string[];
export {};

// Public API module: time/time-axis-formatter.d.ts
import type { Time } from '../core/chart-api.js';
export declare const TimeScaleLabelKind: Readonly<{
    readonly Tick: 'tick';
    readonly Crosshair: 'crosshair';
}>;
export type TimeScaleLabelKind = typeof TimeScaleLabelKind[keyof typeof TimeScaleLabelKind];
export interface TimeScaleFormatContext {
    readonly kind: TimeScaleLabelKind;
    readonly locale: string;
    readonly timeZone: string;
    readonly timeVisible: boolean;
    readonly secondsVisible: boolean;
    readonly tickStep: number | null;
}
export type TimeScaleFormatter = (time: Time, context: TimeScaleFormatContext) => string;
export interface TimeAxisFormatterOptions {
    readonly locale?: string;
    readonly timeZone?: string;
    readonly timeVisible?: boolean;
    readonly secondsVisible?: boolean;
    readonly formatter?: TimeScaleFormatter;
}
/** Cached Intl formatter shared by time-axis ticks and crosshair labels. */
export declare class TimeAxisFormatter {
    readonly locale: string;
    readonly timeZone: string;
    private readonly timeVisible;
    private readonly secondsVisible;
    private readonly custom;
    private readonly formatters;
    private readonly partsFormatter;
    constructor(options?: TimeAxisFormatterOptions);
    formatCrosshair(time: Time): string;
    formatTick(time: Time, step: number): string;
    private tryCustom;
    private format;
    private localDateParts;
}

// Public API module: time/trading-calendar.d.ts
import type { Time, TimeRange } from '../core/chart-api.js';
/** ISO-8601 weekday: Monday is 1 and Sunday is 7. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Calendar-local date in the strict YYYY-MM-DD form. */
export type LocalDate = string;
export interface LocalTimeOfDay {
    readonly hour: number;
    readonly minute: number;
    readonly second?: number;
}
export declare const TradingSessionKind: Readonly<{
    readonly PreMarket: 'pre-market';
    readonly Regular: 'regular';
    readonly PostMarket: 'post-market';
}>;
export type TradingSessionKind = typeof TradingSessionKind[keyof typeof TradingSessionKind];
/** One local-time session shape, reusable by weekly rules and date overrides. */
export interface TradingSessionTemplate {
    readonly id: string;
    readonly kind: TradingSessionKind;
    readonly open: LocalTimeOfDay;
    readonly close: LocalTimeOfDay;
    /** Explicitly places close on the opening day (0) or the following local day (1). */
    readonly closeDayOffset?: 0 | 1;
}
/** A recurring session whose weekday is the local date on which it opens. */
export interface TradingSessionRule extends TradingSessionTemplate {
    readonly weekdays: readonly IsoWeekday[];
}
/** Replaces every recurring session for one local trading date, e.g. an early close. */
export interface TradingDayOverride {
    readonly date: LocalDate;
    readonly sessions: readonly TradingSessionTemplate[];
}
export interface TradingSchedule {
    readonly id?: string;
    /** IANA timezone, for example America/New_York or Europe/Moscow. */
    readonly timeZone: string;
    readonly sessions: readonly TradingSessionRule[];
    /** Fully closed local trading dates. */
    readonly holidays?: readonly LocalDate[];
    /** Date-specific replacement sessions. */
    readonly overrides?: readonly TradingDayOverride[];
}
/** One concrete half-open UTC interval [openTime, closeTime). */
export interface TradingSession {
    readonly id: string;
    readonly ruleId: string;
    readonly kind: TradingSessionKind;
    readonly tradingDate: LocalDate;
    readonly openTime: Time;
    readonly closeTime: Time;
    readonly isOverride: boolean;
}
/** Immutable calendar boundary used by scale, shading and bar-clock features. */
export interface ITradingCalendar {
    schedule(): TradingSchedule;
    /** Returns sessions intersecting the half-open UTC range [from, to). */
    sessionsInRange(range: TimeRange, kinds?: readonly TradingSessionKind[]): readonly TradingSession[];
    sessionAt(time: Time, kinds?: readonly TradingSessionKind[]): TradingSession | null;
    isTradingTime(time: Time, kinds?: readonly TradingSessionKind[]): boolean;
    nextSession(time: Time, kinds?: readonly TradingSessionKind[]): TradingSession | null;
    previousSession(time: Time, kinds?: readonly TradingSessionKind[]): TradingSession | null;
}

// Public API module: trading/model.d.ts
import type { Time } from '../core/chart-api.js';
export declare const TradingSide: Readonly<{
    readonly Buy: 'buy';
    readonly Sell: 'sell';
}>;
export type TradingSide = typeof TradingSide[keyof typeof TradingSide];
export declare const ChartOrderType: Readonly<{
    readonly Market: 'market';
    readonly Limit: 'limit';
    readonly Stop: 'stop';
    readonly StopLimit: 'stop-limit';
}>;
export type ChartOrderType = typeof ChartOrderType[keyof typeof ChartOrderType];
export declare const ChartOrderStatus: Readonly<{
    readonly Pending: 'pending';
    readonly Working: 'working';
    readonly PartiallyFilled: 'partially-filled';
    readonly Filled: 'filled';
    readonly Cancelled: 'cancelled';
    readonly Rejected: 'rejected';
    readonly Expired: 'expired';
}>;
export type ChartOrderStatus = typeof ChartOrderStatus[keyof typeof ChartOrderStatus];
export declare const ChartOrderTimeInForce: Readonly<{
    readonly Day: 'day';
    readonly GoodTillCancelled: 'good-till-cancelled';
    readonly ImmediateOrCancel: 'immediate-or-cancel';
    readonly FillOrKill: 'fill-or-kill';
}>;
export type ChartOrderTimeInForce = typeof ChartOrderTimeInForce[keyof typeof ChartOrderTimeInForce];
export declare const ChartPositionSide: Readonly<{
    readonly Long: 'long';
    readonly Short: 'short';
}>;
export type ChartPositionSide = typeof ChartPositionSide[keyof typeof ChartPositionSide];
export declare const ChartBracketRole: Readonly<{
    readonly Entry: 'entry';
    readonly StopLoss: 'stop-loss';
    readonly TakeProfit: 'take-profit';
}>;
export type ChartBracketRole = typeof ChartBracketRole[keyof typeof ChartBracketRole];
export declare const ChartExecutionLiquidity: Readonly<{
    readonly Maker: 'maker';
    readonly Taker: 'taker';
    readonly Unknown: 'unknown';
}>;
export type ChartExecutionLiquidity = typeof ChartExecutionLiquidity[keyof typeof ChartExecutionLiquidity];
export declare const TradingIntentKind: Readonly<{
    readonly PlaceOrder: 'place-order';
    readonly ModifyOrder: 'modify-order';
    readonly CancelOrder: 'cancel-order';
    readonly ClosePosition: 'close-position';
    readonly ReversePosition: 'reverse-position';
    readonly CreateStopLoss: 'create-stop-loss';
    readonly EditStopLoss: 'edit-stop-loss';
    readonly RemoveStopLoss: 'remove-stop-loss';
    readonly CreateTakeProfit: 'create-take-profit';
    readonly EditTakeProfit: 'edit-take-profit';
    readonly RemoveTakeProfit: 'remove-take-profit';
}>;
export type TradingIntentKind = typeof TradingIntentKind[keyof typeof TradingIntentKind];
export interface TradingModelNormalizationOptions {
    readonly tickSize: number;
    /** Tick-grid origin. Defaults to zero. */
    readonly priceOrigin?: number;
    /** Optional quantity grid. Quantities remain positive finite numbers when omitted. */
    readonly quantityStep?: number;
}
export interface ChartBracketRelationship {
    readonly groupId: string;
    readonly role: ChartBracketRole;
    /** Protection orders point either at their entry order or at an open position. */
    readonly parentOrderId?: string;
    readonly positionId?: string;
}
export interface ChartOrderPermissions {
    readonly canModify: boolean;
    readonly canCancel: boolean;
}
/** Canonical broker-owned order snapshot. The chart never mutates this object optimistically. */
export interface ChartOrder {
    readonly id: string;
    readonly revision?: number;
    readonly side: TradingSide;
    readonly type: ChartOrderType;
    readonly status: ChartOrderStatus;
    readonly timeInForce: ChartOrderTimeInForce;
    readonly quantity: number;
    readonly filledQuantity: number;
    readonly price?: number;
    readonly stopPrice?: number;
    readonly averageFillPrice?: number;
    readonly createdAt?: Time;
    readonly updatedAt?: Time;
    readonly bracket?: ChartBracketRelationship;
    /** Missing permissions make the entity read-only. */
    readonly permissions?: ChartOrderPermissions;
    readonly label?: string;
    readonly statusReason?: string;
}
export interface ChartPnlSnapshot {
    readonly realized: number;
    readonly unrealized: number;
    readonly currency?: string;
    readonly markPrice?: number;
    readonly time?: Time;
}
export interface ChartPositionPermissions {
    readonly canClose: boolean;
    readonly canReverse: boolean;
    readonly canProtect: boolean;
}
/** Canonical broker-owned position. Quantity is positive; direction lives only in side. */
export interface ChartPosition {
    readonly id: string;
    readonly revision?: number;
    readonly side: ChartPositionSide;
    readonly quantity: number;
    readonly averagePrice: number;
    readonly openedAt?: Time;
    readonly pnl?: ChartPnlSnapshot;
    readonly permissions?: ChartPositionPermissions;
    readonly label?: string;
}
export interface ChartExecution {
    readonly id: string;
    readonly orderId?: string;
    readonly positionId?: string;
    readonly time: Time;
    readonly side: TradingSide;
    readonly price: number;
    readonly quantity: number;
    readonly liquidity?: ChartExecutionLiquidity;
    /** Signed fee: a negative value represents a rebate. */
    readonly fee?: number;
    readonly feeCurrency?: string;
}
/** One-sided quotes are valid; at least one of bid, ask or last must be present. */
export interface ChartQuote {
    readonly time: Time;
    readonly bidPrice?: number;
    readonly bidSize?: number;
    readonly askPrice?: number;
    readonly askSize?: number;
    readonly lastPrice?: number;
    readonly lastSize?: number;
}
export interface ChartOrderRequest {
    readonly clientOrderId?: string;
    readonly side: TradingSide;
    readonly type: ChartOrderType;
    readonly timeInForce: ChartOrderTimeInForce;
    readonly quantity: number;
    readonly price?: number;
    readonly stopPrice?: number;
    readonly bracketGroupId?: string;
}
export interface ChartOrderModification {
    readonly quantity?: number;
    readonly price?: number;
    readonly stopPrice?: number;
    readonly timeInForce?: ChartOrderTimeInForce;
}
export interface TradingIntentBase<TKind extends TradingIntentKind = TradingIntentKind> {
    readonly intentId: string;
    readonly kind: TKind;
    /** Unix seconds at which the chart emitted the intent. */
    readonly createdAt: Time;
}
export interface PlaceOrderIntent extends TradingIntentBase<typeof TradingIntentKind.PlaceOrder> {
    readonly order: ChartOrderRequest;
}
export interface ModifyOrderIntent extends TradingIntentBase<typeof TradingIntentKind.ModifyOrder> {
    readonly orderId: string;
    readonly expectedRevision?: number;
    readonly changes: ChartOrderModification;
}
export interface CancelOrderIntent extends TradingIntentBase<typeof TradingIntentKind.CancelOrder> {
    readonly orderId: string;
    readonly expectedRevision?: number;
}
export interface ClosePositionIntent extends TradingIntentBase<typeof TradingIntentKind.ClosePosition> {
    readonly positionId: string;
    readonly expectedRevision?: number;
    /** Omitted quantity means close the complete canonical position. */
    readonly quantity?: number;
}
export interface ReversePositionIntent extends TradingIntentBase<typeof TradingIntentKind.ReversePosition> {
    readonly positionId: string;
    readonly expectedRevision?: number;
    /** Omitted quantity means open the same quantity on the opposite side. */
    readonly quantity?: number;
}
export interface CreateStopLossIntent extends TradingIntentBase<typeof TradingIntentKind.CreateStopLoss> {
    readonly positionId: string;
    readonly price: number;
    readonly quantity?: number;
    readonly clientOrderId?: string;
    readonly bracketGroupId?: string;
}
export interface EditStopLossIntent extends TradingIntentBase<typeof TradingIntentKind.EditStopLoss> {
    readonly orderId: string;
    readonly expectedRevision?: number;
    readonly price: number;
    readonly quantity?: number;
}
export interface RemoveStopLossIntent extends TradingIntentBase<typeof TradingIntentKind.RemoveStopLoss> {
    readonly orderId: string;
    readonly expectedRevision?: number;
}
export interface CreateTakeProfitIntent extends TradingIntentBase<typeof TradingIntentKind.CreateTakeProfit> {
    readonly positionId: string;
    readonly price: number;
    readonly quantity?: number;
    readonly clientOrderId?: string;
    readonly bracketGroupId?: string;
}
export interface EditTakeProfitIntent extends TradingIntentBase<typeof TradingIntentKind.EditTakeProfit> {
    readonly orderId: string;
    readonly expectedRevision?: number;
    readonly price: number;
    readonly quantity?: number;
}
export interface RemoveTakeProfitIntent extends TradingIntentBase<typeof TradingIntentKind.RemoveTakeProfit> {
    readonly orderId: string;
    readonly expectedRevision?: number;
}
export type TradingIntent = PlaceOrderIntent | ModifyOrderIntent | CancelOrderIntent | ClosePositionIntent | ReversePositionIntent | CreateStopLossIntent | EditStopLossIntent | RemoveStopLossIntent | CreateTakeProfitIntent | EditTakeProfitIntent | RemoveTakeProfitIntent;
export declare function normalizeChartOrder(value: ChartOrder, options: TradingModelNormalizationOptions): ChartOrder;
export declare function normalizeChartOrders(values: readonly ChartOrder[], options: TradingModelNormalizationOptions): readonly ChartOrder[];
export declare function normalizeChartPosition(value: ChartPosition, options: TradingModelNormalizationOptions): ChartPosition;
export declare function normalizeChartPositions(values: readonly ChartPosition[], options: TradingModelNormalizationOptions): readonly ChartPosition[];
export declare function normalizeChartExecution(value: ChartExecution, options: TradingModelNormalizationOptions): ChartExecution;
export declare function normalizeChartExecutions(values: readonly ChartExecution[], options: TradingModelNormalizationOptions): readonly ChartExecution[];
export declare function normalizeChartQuote(value: ChartQuote, options: TradingModelNormalizationOptions): ChartQuote;
export declare function normalizeChartOrderRequest(value: ChartOrderRequest, options: TradingModelNormalizationOptions): ChartOrderRequest;
export declare function normalizeTradingIntent(value: TradingIntent, options: TradingModelNormalizationOptions): TradingIntent;
export declare function chartOrderRemainingQuantity(order: ChartOrder): number;
export declare function chartPnlTotal(pnl: ChartPnlSnapshot): number;
export declare function normalizeTradingModelOptions(options: TradingModelNormalizationOptions): TradingModelNormalizationOptions;
/** Quantizes an interactive preview onto the same grid used by canonical validation. */
export declare function quantizeTradingPrice(value: number, options: TradingModelNormalizationOptions): number;
