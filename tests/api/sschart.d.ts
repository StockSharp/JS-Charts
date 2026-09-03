// Public API module: index.d.ts
export * from './core/chart-api.js';
export * from './primitives/horizontal-line.js';
export * from './primitives/trend-line.js';
export * from './primitives/session-shading.js';
export * from './data/index.js';
export * from './time/index.js';
export * from './drawings/index.js';
export * from './persistence/index.js';
export * from './workspace/index.js';
export * from './orderflow/index.js';
export * from './trading/index.js';
export type { IndicatorPaneChart, IndicatorPaneHost } from './chart/indicators/pane-host.js';

// Public API module: chart/indicators/pane-host.d.ts
export interface IndicatorPaneChart {
    priceScale(scaleId?: string): {
        applyOptions(options: Record<string, unknown>): void;
    };
    applyOptions(options?: Record<string, unknown>): void;
}
export interface IndicatorPaneHost {
    getPaneByMeasure(measure: string | null): string | null;
    addPane(label: string, measure: string | null): string | null;
    getChart(paneId: string): IndicatorPaneChart | null;
    removePane(paneId: string): void;
    restorePane?(paneId: string): string | null;
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

// Public API module: data/aggregation.d.ts
import type { OhlcvBar } from './data-source.js';
import type { ChartDataViewBuilder, ChartDataViewUpdater } from './chart-data-store.js';
export interface OhlcvAggregationOptions {
    readonly intervalSeconds: number;
    readonly originTime?: number;
}
export declare const FixedResolutionUnit: Readonly<{
    readonly Second: 'second';
    readonly Minute: 'minute';
    readonly Hour: 'hour';
    readonly Day: 'day';
    readonly Week: 'week';
}>;
export type FixedResolutionUnit = typeof FixedResolutionUnit[keyof typeof FixedResolutionUnit];
export interface FixedResolution {
    readonly amount: number;
    readonly unit: FixedResolutionUnit;
    readonly seconds: number;
}
/** Parses common fixed resolutions while intentionally excluding calendar months. */
export declare function parseFixedResolution(resolution: string): FixedResolution;
/** Converts common trading resolutions to a fixed duration. Calendar months are intentionally excluded. */
export declare function resolutionToSeconds(resolution: string): number;
/** Stable time-bucket OHLCV reduction. Empty market gaps do not create synthetic bars. */
export declare function aggregateOhlcvBars(bars: readonly OhlcvBar[], options: OhlcvAggregationOptions): readonly OhlcvBar[];
/** Ready-to-use ChartDataController view builder for fixed-duration OHLCV feeds. */
export declare const ohlcvDataViewBuilder: ChartDataViewBuilder<OhlcvBar>;
/** Rebuilds only the final time bucket after a replace-last or append update. */
export declare const ohlcvDataViewUpdater: ChartDataViewUpdater<OhlcvBar>;

// Public API module: data/bar-normalization.d.ts
import type { TimedSeriesData } from '../core/chart-api.js';
import type { BarsPage } from './data-source.js';
/** Validates ascending source order and keeps the last value for duplicate timestamps. */
export declare function normalizeBars<TBar extends TimedSeriesData>(bars: readonly TBar[]): readonly TBar[];
export declare function normalizeBarsPage<TBar extends TimedSeriesData>(value: BarsPage<TBar>): BarsPage<TBar>;

// Public API module: data/chart-data-controller.d.ts
import type { IChartApi, ISeriesApi, SeriesOptions, TimedSeriesData } from '../core/chart-api.js';
import type { IChartDataSource, SymbolInfo } from './data-source.js';
import { type ChartDataViewBuilder, type ChartDataViewUpdater } from './chart-data-store.js';
import type { LodCacheSnapshot } from './lod-cache.js';
import { type RealtimeReconnectPolicy, type RealtimeScheduler } from './reconnect-policy.js';
export declare const ChartDataStatus: Readonly<{
    readonly Idle: 'idle';
    readonly Resolving: 'resolving';
    readonly Loading: 'loading';
    readonly Ready: 'ready';
    readonly Error: 'error';
    readonly Disposed: 'disposed';
}>;
export type ChartDataStatus = typeof ChartDataStatus[keyof typeof ChartDataStatus];
export declare const RealtimeStatus: Readonly<{
    readonly Disconnected: 'disconnected';
    readonly Connecting: 'connecting';
    readonly Connected: 'connected';
    readonly Reconnecting: 'reconnecting';
    readonly Error: 'error';
}>;
export type RealtimeStatus = typeof RealtimeStatus[keyof typeof RealtimeStatus];
export interface ChartDataSelection {
    readonly symbol: string;
    readonly resolution: string;
}
export interface ChartDataControllerSnapshot {
    readonly status: ChartDataStatus;
    readonly generation: number;
    readonly selection: ChartDataSelection | null;
    readonly symbolInfo: SymbolInfo | null;
    readonly loadedBars: number;
    readonly renderedBars: number;
    readonly groupingLevel: number;
    readonly realtimeStatus: RealtimeStatus;
    readonly realtimeUpdates: number;
    readonly realtimeError: unknown | null;
    readonly reconnectAttempt: number;
    readonly nextReconnectDelayMs: number | null;
    readonly hasMoreBefore: boolean;
    readonly hasMoreAfter: boolean;
    readonly loadingHistory: boolean;
    readonly historyError: unknown | null;
    readonly error: unknown | null;
}
export type ChartDataControllerListener = (snapshot: ChartDataControllerSnapshot) => void;
export interface ChartDataControllerOptions<TBar extends TimedSeriesData, TSeriesOptions extends SeriesOptions = SeriesOptions> {
    readonly chart: IChartApi;
    readonly series: ISeriesApi<TBar, TSeriesOptions>;
    readonly dataSource: IChartDataSource<TBar>;
    readonly initialCount?: number;
    readonly historyCount?: number;
    readonly historyPrefetchThreshold?: number;
    readonly autoPrefetch?: boolean;
    readonly viewBuilder?: ChartDataViewBuilder<TBar>;
    readonly viewUpdater?: ChartDataViewUpdater<TBar>;
    readonly initialGroupingLevel?: number;
    readonly lodCacheSize?: number;
    readonly autoScrollRealtime?: boolean;
    /** Applies SymbolInfo.tradingSchedule to the chart without changing the time-scale mode. */
    readonly applySymbolTradingSchedule?: boolean;
    readonly reconnectPolicy?: RealtimeReconnectPolicy;
    readonly realtimeScheduler?: RealtimeScheduler;
}
/**
 * Optional adapter between an imperative series and an asynchronous datafeed.
 * Manual series.setData/update use remains independent of this controller.
 */
export declare class ChartDataController<TBar extends TimedSeriesData, TSeriesOptions extends SeriesOptions = SeriesOptions> {
    private readonly options;
    private readonly coordinator;
    private readonly listeners;
    private readonly initialCount;
    private readonly historyCount;
    private readonly historyPrefetchThreshold;
    private readonly autoPrefetch;
    private readonly dataStore;
    private readonly renderedStore;
    private groupingLevelValue;
    private readonly autoScrollRealtime;
    private readonly applySymbolTradingSchedule;
    private symbolTradingCalendarApplied;
    private readonly reconnectBackoff;
    private readonly realtimeScheduler;
    private realtimeUnsubscribe;
    private realtimeTicket;
    private reconnectTimer;
    private activeLoad;
    private historyLoad;
    private currentTicket;
    private currentSelection;
    private currentSymbolInfo;
    private state;
    private disposed;
    private readonly visibleRangeListener;
    constructor(options: ChartDataControllerOptions<TBar, TSeriesOptions>);
    snapshot(): ChartDataControllerSnapshot;
    rawData(): readonly TBar[];
    /** Immutable half-open raw-data window without copying the complete history. */
    rawDataSlice(fromIndex?: number, toIndex?: number): readonly TBar[];
    renderedData(): readonly TBar[];
    groupingLevel(): number;
    lodCacheSnapshot(): LodCacheSnapshot;
    setGroupingLevel(level: number): void;
    subscribe(listener: ChartDataControllerListener): void;
    unsubscribe(listener: ChartDataControllerListener): void;
    setSelection(selection: ChartDataSelection): Promise<SymbolInfo | null>;
    reload(): Promise<SymbolInfo | null>;
    loadMoreBefore(): Promise<number>;
    cancel(): void;
    dispose(): void;
    private startLoad;
    private load;
    private applyTradingCalendar;
    private prefetchForRange;
    private loadHistory;
    private viewContext;
    private applyRenderView;
    private startRealtime;
    private handleRealtimeUpdate;
    private handleRealtimeError;
    private scheduleRealtimeReconnect;
    private stopRealtime;
    private clearReconnectTimer;
    private setState;
    private emit;
    private assertAlive;
}

// Public API module: data/chart-data-store.d.ts
import type { DataChangeSet } from '../core/model/data-change-set.js';
import type { TimedSeriesData } from '../core/chart-api.js';
import { type LodCacheSnapshot } from './lod-cache.js';
export interface ChartDataViewContext {
    readonly symbol: string;
    readonly resolution: string;
    readonly groupingLevel: number;
}
export type ChartDataViewBuilder<TBar extends TimedSeriesData> = (rawBars: readonly TBar[], context: ChartDataViewContext) => readonly TBar[];
export type ChartDataViewUpdater<TBar extends TimedSeriesData> = (rawBars: readonly TBar[], context: ChartDataViewContext, change: DataChangeSet) => TBar | null;
export interface ChartDataViewUpdate<TBar extends TimedSeriesData> {
    readonly change: DataChangeSet;
    /** Null asks the controller to rebuild the complete derived view. */
    readonly viewBar: TBar | null;
}
export interface ChartDataStoreOptions<TBar extends TimedSeriesData> {
    readonly viewBuilder?: ChartDataViewBuilder<TBar>;
    readonly viewUpdater?: ChartDataViewUpdater<TBar>;
    readonly lodCacheSize?: number;
}
/** Raw history owner with a separately cached render view. */
export declare class ChartDataStore<TBar extends TimedSeriesData> {
    private readonly rawStore;
    private readonly lodCache;
    private readonly viewBuilder?;
    private readonly viewUpdater?;
    constructor(options?: ChartDataStoreOptions<TBar>);
    get version(): number;
    get length(): number;
    get first(): TBar | undefined;
    get last(): TBar | undefined;
    get hasViewBuilder(): boolean;
    replace(bars: readonly TBar[]): DataChangeSet;
    prepend(bars: readonly TBar[]): DataChangeSet | null;
    update(bar: TBar): DataChangeSet | null;
    updateView(bar: TBar, context: ChartDataViewContext): ChartDataViewUpdate<TBar> | null;
    clear(): void;
    raw(): readonly TBar[];
    rawSlice(fromIndex?: number, toIndex?: number): readonly TBar[];
    view(context: ChartDataViewContext): readonly TBar[];
    lodCacheSnapshot(): LodCacheSnapshot;
}

// Public API module: data/data-request-coordinator.d.ts
export interface DataRequestTicket {
    readonly generation: number;
    readonly signal: AbortSignal;
}
/** Owns one request generation and makes stale-result checks explicit. */
export declare class DataRequestCoordinator {
    private generation;
    private active;
    private disposed;
    begin(): DataRequestTicket;
    isCurrent(ticket: DataRequestTicket): boolean;
    cancel(): void;
    dispose(): void;
}

// Public API module: data/data-source.d.ts
import type { CandlestickData, PriceFormat, Time, TimedSeriesData } from '../core/chart-api.js';
import type { TradingSchedule } from '../time/trading-calendar.js';
export interface OhlcvBar extends CandlestickData {
    readonly volume?: number;
}
export interface ResolveSymbolRequest {
    readonly symbol: string;
}
/** Datafeed-owned identity, display metadata and optional exchange calendar. */
export interface SymbolInfo {
    readonly id: string;
    readonly ticker?: string;
    readonly name?: string;
    readonly exchange?: string;
    readonly priceFormat?: PriceFormat;
    readonly tradingSchedule?: TradingSchedule;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export interface BarsRequest {
    readonly symbol: string;
    readonly resolution: string;
    readonly from?: Time;
    readonly to?: Time;
    readonly countBack?: number;
}
export interface BarsPage<TBar extends TimedSeriesData = OhlcvBar> {
    readonly bars: readonly TBar[];
    readonly hasMoreBefore: boolean;
    readonly hasMoreAfter?: boolean;
}
export interface BarsSubscription {
    readonly symbol: string;
    readonly resolution: string;
}
export interface BarUpdate<TBar extends TimedSeriesData = OhlcvBar> {
    readonly bar: TBar;
    readonly isFinal?: boolean;
}
export type Unsubscribe = () => void;
/** Broker/vendor-neutral history and realtime boundary. */
export interface IChartDataSource<TBar extends TimedSeriesData = OhlcvBar> {
    resolveSymbol(request: ResolveSymbolRequest, signal: AbortSignal): Promise<SymbolInfo>;
    getBars(request: BarsRequest, signal: AbortSignal): Promise<BarsPage<TBar>>;
    subscribeBars(request: BarsSubscription, listener: (update: BarUpdate<TBar>) => void, errorListener?: (error: unknown) => void): Unsubscribe;
}

// Public API module: data/index.d.ts
export * from './data-source.js';
export * from './data-request-coordinator.js';
export * from './chart-data-controller.js';
export * from './bar-normalization.js';
export * from './chart-data-store.js';
export * from './aggregation.js';
export * from './lod-cache.js';
export * from './reconnect-policy.js';

// Public API module: data/lod-cache.d.ts
export interface LodCacheKey {
    readonly symbol: string;
    readonly resolution: string;
    readonly groupingLevel: number;
}
export interface LodCacheSnapshot {
    readonly size: number;
    readonly capacity: number;
    readonly hits: number;
    readonly misses: number;
    readonly keys: readonly LodCacheKey[];
}
/** Bounded LRU for derived views. Raw-data version is part of entry validity. */
export declare class LodCache<TValue extends {}> {
    private readonly maxEntries;
    private readonly entries;
    private hitCount;
    private missCount;
    constructor(maxEntries?: number);
    get(key: LodCacheKey, sourceVersion: number): TValue | undefined;
    set(key: LodCacheKey, sourceVersion: number, value: TValue): void;
    getOrCreate(key: LodCacheKey, sourceVersion: number, factory: () => TValue): TValue;
    invalidateExceptVersion(sourceVersion: number): void;
    clear(): void;
    snapshot(): LodCacheSnapshot;
}

// Public API module: data/reconnect-policy.d.ts
export interface RealtimeReconnectPolicy {
    readonly enabled?: boolean;
    readonly initialDelayMs?: number;
    readonly maxDelayMs?: number;
    readonly multiplier?: number;
    readonly maxAttempts?: number;
    readonly jitterRatio?: number;
}
export interface ReconnectAttempt {
    readonly attempt: number;
    readonly delayMs: number;
}
export interface RealtimeScheduler {
    setTimeout(callback: () => void, delayMs: number): unknown;
    clearTimeout(handle: unknown): void;
    random(): number;
}
/** Deterministic stateful backoff; scheduling remains owned by the controller. */
export declare class RealtimeReconnectBackoff {
    private readonly random;
    private readonly policy;
    private attempts;
    constructor(policy?: RealtimeReconnectPolicy, random?: () => number);
    get attemptCount(): number;
    next(): ReconnectAttempt | null;
    reset(): void;
}
export declare function defaultRealtimeScheduler(): RealtimeScheduler;

// Public API module: drawings/built-in-analysis-drawings.d.ts
import type { LineStyleValue } from '../core/chart-api.js';
import type { DrawingOptions } from './drawing-model.js';
import { DrawingDefinitionRegistry, type DrawingDefinition } from './drawing-registry.js';
export interface FibonacciDrawingOptions extends DrawingOptions {
    readonly color: string;
    readonly lineWidth: number;
    readonly lineStyle: LineStyleValue;
    readonly fillColor: string;
    readonly levels: readonly number[];
    readonly labelsVisible: boolean;
    readonly fontSize: number;
    readonly extendRight: boolean;
}
export interface MeasureDrawingOptions extends DrawingOptions {
    readonly color: string;
    readonly lineWidth: number;
    readonly fillColor: string;
    readonly labelColor: string;
    readonly labelBackgroundColor: string;
    readonly fontSize: number;
}
export declare const builtInAnalysisDrawingDefinitions: readonly [DrawingDefinition<FibonacciDrawingOptions>, DrawingDefinition<MeasureDrawingOptions>];
export declare function registerBuiltInAnalysisDrawings(registry: DrawingDefinitionRegistry): void;

// Public API module: drawings/built-in-line-drawings.d.ts
import type { LineStyleValue } from '../core/chart-api.js';
import type { DrawingOptions } from './drawing-model.js';
import { DrawingDefinitionRegistry, type DrawingDefinition } from './drawing-registry.js';
export declare const BuiltInDrawingType: Readonly<{
    readonly HorizontalLine: 'horizontal-line';
    readonly VerticalLine: 'vertical-line';
    readonly TrendLine: 'trend-line';
    readonly Ray: 'ray';
    readonly Rectangle: 'rectangle';
    readonly Text: 'text';
    readonly Note: 'note';
    readonly FibonacciRetracement: 'fibonacci-retracement';
    readonly Measure: 'measure';
    readonly LongPosition: 'long-position';
    readonly ShortPosition: 'short-position';
}>;
export type BuiltInDrawingType = typeof BuiltInDrawingType[keyof typeof BuiltInDrawingType];
export interface LineDrawingOptions extends DrawingOptions {
    readonly color: string;
    readonly lineWidth: number;
    readonly lineStyle: LineStyleValue;
}
export declare const builtInLineDrawingDefinitions: readonly DrawingDefinition<LineDrawingOptions>[];
export declare function registerBuiltInLineDrawings(registry: DrawingDefinitionRegistry): void;

// Public API module: drawings/built-in-position-drawings.d.ts
import type { DrawingOptions } from './drawing-model.js';
import { DrawingDefinitionRegistry, type DrawingDefinition } from './drawing-registry.js';
export interface PositionDrawingOptions extends DrawingOptions {
    readonly entryColor: string;
    readonly targetColor: string;
    readonly stopColor: string;
    readonly targetFillColor: string;
    readonly stopFillColor: string;
    readonly textColor: string;
    readonly lineWidth: number;
    readonly fontSize: number;
    readonly quantity: number;
}
export declare const builtInPositionDrawingDefinitions: readonly [DrawingDefinition<PositionDrawingOptions>, DrawingDefinition<PositionDrawingOptions>];
export declare function registerBuiltInPositionDrawings(registry: DrawingDefinitionRegistry): void;

// Public API module: drawings/built-in-shape-drawings.d.ts
import type { LineStyleValue } from '../core/chart-api.js';
import type { DrawingOptions } from './drawing-model.js';
import { DrawingDefinitionRegistry, type DrawingDefinition } from './drawing-registry.js';
export interface RectangleDrawingOptions extends DrawingOptions {
    readonly color: string;
    readonly lineWidth: number;
    readonly lineStyle: LineStyleValue;
    readonly fillColor: string;
}
export interface TextDrawingOptions extends DrawingOptions {
    readonly text: string;
    readonly color: string;
    readonly backgroundColor: string;
    readonly borderColor: string;
    readonly borderWidth: number;
    readonly fontSize: number;
    readonly fontFamily: string;
    readonly padding: number;
}
export declare const builtInShapeDrawingDefinitions: readonly [DrawingDefinition<RectangleDrawingOptions>, DrawingDefinition<TextDrawingOptions>, DrawingDefinition<TextDrawingOptions>];
export declare function registerBuiltInShapeDrawings(registry: DrawingDefinitionRegistry): void;

// Public API module: drawings/drawing-controller.d.ts
import type { IChartApi, ICommandStack } from '../core/chart-api.js';
import { type DrawingInstance, type DrawingOptions, type DrawingPoint } from './drawing-model.js';
import { type DrawingDefinitionRegistry } from './drawing-registry.js';
import { type DrawingMagnetOptions, type DrawingMagnetSettings } from './drawing-magnet.js';
export interface DrawingInstancePatch {
    readonly paneId?: string;
    readonly points?: readonly DrawingPoint[];
    readonly options?: DrawingOptions;
    readonly visible?: boolean;
    readonly locked?: boolean;
    readonly zOrder?: number;
}
export interface CreateDrawingOptions {
    readonly id?: string;
    readonly paneId?: string;
    readonly options?: DrawingOptions;
    readonly visible?: boolean;
    readonly locked?: boolean;
    readonly zOrder?: number;
}
export interface DrawingControllerOptions {
    readonly chart: IChartApi;
    readonly registry?: DrawingDefinitionRegistry;
    readonly commandStack?: ICommandStack;
    readonly idFactory?: (type: string) => string;
    readonly magnet?: DrawingMagnetOptions;
}
export type DrawingControllerListener = (drawings: readonly DrawingInstance[]) => void;
export interface DrawingCreationSnapshot {
    readonly type: string;
    readonly name: string;
    readonly paneId: string | null;
    readonly points: readonly DrawingPoint[];
    readonly previewPoint: DrawingPoint | null;
    readonly minimumPoints: number;
    readonly maximumPoints: number;
}
export type DrawingCreationListener = (creation: DrawingCreationSnapshot | null) => void;
export interface DrawingRestoreOptions {
    readonly unknownType?: 'skip' | 'error';
}
export interface SkippedDrawing {
    readonly id: string;
    readonly type: string;
    readonly reason: 'unknown-type';
}
export interface DrawingRestoreResult {
    readonly restored: readonly DrawingInstance[];
    readonly skipped: readonly SkippedDrawing[];
}
/** Owns serializable drawings, primitive bindings and one undoable mutation path. */
export declare class DrawingController {
    private readonly chart;
    private readonly registry;
    private readonly commands;
    private readonly idFactory?;
    private readonly magnet;
    private readonly records;
    private readonly listeners;
    private readonly creationListeners;
    private activeCreation;
    private nextId;
    private nextDraftId;
    private disposed;
    private readonly handleChartClick;
    private readonly handleCrosshairMove;
    constructor(options: DrawingControllerOptions);
    drawings(): readonly DrawingInstance[];
    get(id: string): DrawingInstance | undefined;
    has(id: string): boolean;
    magnetOptions(): DrawingMagnetSettings;
    applyMagnetOptions(patch: DrawingMagnetOptions): void;
    creation(): DrawingCreationSnapshot | null;
    beginCreation(type: string, options?: CreateDrawingOptions): void;
    finishCreation(): DrawingInstance | null;
    cancelCreation(): boolean;
    subscribeCreation(listener: DrawingCreationListener): void;
    unsubscribeCreation(listener: DrawingCreationListener): void;
    replaceAll(instances: readonly DrawingInstance[], options?: DrawingRestoreOptions): DrawingRestoreResult;
    create(type: string, points: readonly DrawingPoint[], options?: CreateDrawingOptions): DrawingInstance;
    add(instance: DrawingInstance): DrawingInstance;
    update(id: string, patch: DrawingInstancePatch): DrawingInstance;
    updateOptions(id: string, patch: DrawingOptions): DrawingInstance;
    setVisible(id: string, visible: boolean): DrawingInstance;
    setLocked(id: string, locked: boolean): DrawingInstance;
    moveToPane(id: string, paneId: string): DrawingInstance;
    remove(id: string): boolean;
    duplicate(id: string, duplicateId?: string): DrawingInstance;
    clear(): boolean;
    subscribe(listener: DrawingControllerListener): void;
    unsubscribe(listener: DrawingControllerListener): void;
    dispose(): void;
    private acceptCreationPoint;
    private previewCreationPoint;
    private magnetInput;
    private refreshDraft;
    private clearDraft;
    private endCreation;
    private unsubscribeCreationInput;
    private normalizeCreateOptions;
    private executeInsert;
    private executeReplace;
    private insertInternal;
    private replaceInternal;
    private removeInternal;
    private clearInternal;
    private previewFromPrimitive;
    private commitFromPrimitive;
    private cancelFromPrimitive;
    private primitiveCandidate;
    private attach;
    private detach;
    private resolvePane;
    private prepare;
    private requireDefinition;
    private requireRecord;
    private generateId;
    private nextZOrder;
    private emit;
    private emitCreation;
    private assertAlive;
}

// Public API module: drawings/drawing-magnet.d.ts
import type { IPaneApi, ISeriesApi } from '../core/chart-api.js';
import type { TimedSeriesData } from '../series/registry.js';
import type { DrawingPoint } from './drawing-model.js';
export declare const DrawingMagnetMode: Readonly<{
    readonly None: 'none';
    readonly Weak: 'weak';
    readonly Strong: 'strong';
}>;
export type DrawingMagnetMode = typeof DrawingMagnetMode[keyof typeof DrawingMagnetMode];
export interface DrawingMagnetOptions {
    readonly mode?: DrawingMagnetMode;
    /** Maximum vertical distance in CSS pixels for weak snapping. */
    readonly maxDistance?: number;
}
export interface DrawingMagnetSettings {
    readonly mode: DrawingMagnetMode;
    readonly maxDistance: number;
}
export interface DrawingMagnetInput {
    readonly time: number;
    readonly price: number;
    readonly coordinate: Readonly<{
        x: number;
        y: number;
    }>;
    readonly pane: IPaneApi;
    readonly seriesData: ReadonlyMap<ISeriesApi<any, any>, TimedSeriesData>;
}
export interface DrawingMagnetResult {
    readonly point: DrawingPoint;
    readonly snapped: boolean;
    readonly series: ISeriesApi<any, any> | null;
    readonly distance: number | null;
}
/** Resolves drawing anchors against renderer-defined values in screen space. */
export declare class DrawingMagnet {
    private settings;
    constructor(options?: DrawingMagnetOptions);
    options(): DrawingMagnetSettings;
    applyOptions(patch: DrawingMagnetOptions): void;
    resolve(input: DrawingMagnetInput): DrawingMagnetResult;
}

// Public API module: drawings/drawing-model.d.ts
import type { Time } from '../core/chart-api.js';
export type DrawingJsonValue = string | number | boolean | null | readonly DrawingJsonValue[] | {
    readonly [key: string]: DrawingJsonValue;
};
export type DrawingOptions = Readonly<Record<string, DrawingJsonValue>>;
export interface DrawingPoint {
    readonly time: Time;
    readonly price: number;
}
/** Pure persisted drawing state. It deliberately contains no runtime objects. */
export interface DrawingInstance<TOptions extends DrawingOptions = DrawingOptions> {
    readonly id: string;
    readonly type: string;
    readonly paneId: string;
    readonly points: readonly DrawingPoint[];
    readonly options: TOptions;
    readonly visible: boolean;
    readonly locked: boolean;
    readonly zOrder: number;
}
export declare function normalizeDrawingInstance<TOptions extends DrawingOptions = DrawingOptions>(value: DrawingInstance<TOptions>): DrawingInstance<TOptions>;
export declare function normalizeDrawingOptions(value: DrawingOptions): DrawingOptions;

// Public API module: drawings/drawing-registry.d.ts
import type { IChartPrimitive } from '../core/chart-api.js';
import { type DrawingInstance, type DrawingOptions } from './drawing-model.js';
export interface DrawingPointSchema {
    readonly min: number;
    readonly max: number;
}
export interface DrawingPrimitiveEvents<TOptions extends DrawingOptions = DrawingOptions> {
    /** Live gesture state; the controller does not add it to command history. */
    preview(instance: DrawingInstance<TOptions>): void;
    /** Final gesture state; the controller records one undoable command. */
    commit(instance: DrawingInstance<TOptions>): void;
    /** Cancels the current gesture and restores its pre-gesture model. */
    cancel(instance: DrawingInstance<TOptions>): void;
}
export interface DrawingPrimitiveBinding<TOptions extends DrawingOptions = DrawingOptions> {
    readonly primitive: IChartPrimitive;
    update(instance: DrawingInstance<TOptions>): void;
    dispose?(): void;
}
export interface DrawingDefinition<TOptions extends DrawingOptions = DrawingOptions> {
    readonly type: string;
    readonly name: string;
    readonly points: DrawingPointSchema;
    readonly defaultOptions: TOptions;
    /** Validates and canonicalizes JSON-safe options before they enter the model. */
    readonly normalizeOptions?: (options: TOptions) => TOptions;
    create(instance: DrawingInstance<TOptions>, events: DrawingPrimitiveEvents<TOptions>): DrawingPrimitiveBinding<TOptions>;
}
/** Extensible drawing type catalog. Unknown persisted types are resolved as undefined. */
export declare class DrawingDefinitionRegistry {
    private readonly definitions;
    register<TOptions extends DrawingOptions>(definition: DrawingDefinition<TOptions>): DrawingDefinition<TOptions>;
    unregister(type: string): boolean;
    has(type: string): boolean;
    get(type: string): DrawingDefinition | undefined;
    types(): readonly string[];
}
export declare const drawingDefinitionRegistry: DrawingDefinitionRegistry;
export declare function registerDrawing<TOptions extends DrawingOptions>(definition: DrawingDefinition<TOptions>): DrawingDefinition<TOptions>;
export declare function unregisterDrawing(type: string): boolean;
export declare function getDrawingDefinition(type: string): DrawingDefinition | undefined;
export declare function getDrawingTypes(): readonly string[];

// Public API module: drawings/index.d.ts
export * from './drawing-model.js';
export * from './drawing-registry.js';
export * from './drawing-controller.js';
export * from './drawing-magnet.js';
export * from './interactive-drawing-primitive.js';
export * from './built-in-line-drawings.js';
export * from './built-in-shape-drawings.js';
export * from './built-in-analysis-drawings.js';
export * from './built-in-position-drawings.js';

// Public API module: drawings/interactive-drawing-primitive.d.ts
import type { AutoscaleInfo, HitTestContext, IChartPrimitive, LogicalRange, PrimitiveAttachedContext, PrimitiveHit, PrimitiveInteractionEvent, PrimitivePaneView, PrimitiveRect, PrimitiveTheme } from '../core/chart-api.js';
import { type DrawingInstance } from './drawing-model.js';
import type { DrawingPrimitiveBinding, DrawingPrimitiveEvents } from './drawing-registry.js';
export interface DrawingScreenPoint {
    readonly x: number;
    readonly y: number;
}
export interface DrawingPrimitiveGeometryContext {
    readonly instance: DrawingInstance;
    readonly points: readonly DrawingScreenPoint[];
    readonly plot: PrimitiveRect;
    timeToCoordinate(time: number): number | null;
    priceToCoordinate(price: number): number | null;
}
export interface DrawingPrimitiveDrawContext extends DrawingPrimitiveGeometryContext {
    readonly context: CanvasRenderingContext2D;
    readonly theme: Readonly<PrimitiveTheme>;
    readonly pixelRatio: number;
    readonly selected: boolean;
}
export interface DrawingPrimitiveBodyHit {
    readonly cursor?: string;
}
export interface DrawingPrimitiveVisual {
    draw(context: DrawingPrimitiveDrawContext): void;
    hitTest(point: Readonly<DrawingScreenPoint>, context: DrawingPrimitiveGeometryContext): DrawingPrimitiveBodyHit | null;
    autoscaleInfo?(instance: DrawingInstance, range: LogicalRange): AutoscaleInfo | null;
    handleColor?(instance: DrawingInstance): string;
}
export interface DrawingPrimitiveHitData {
    readonly kind: 'drawing';
    readonly primitive: InteractiveDrawingPrimitive;
    readonly part: 'body' | 'point';
    readonly pointIndex: number | null;
}
/** Shared interaction shell for serializable drawing visuals. */
export declare class InteractiveDrawingPrimitive implements IChartPrimitive {
    private model;
    private readonly events;
    private readonly visual;
    private context;
    private plot;
    private screen;
    private drag;
    private selected;
    private readonly renderer;
    private readonly paneView;
    private readonly interactionListener;
    constructor(instance: DrawingInstance, events: DrawingPrimitiveEvents, visual: DrawingPrimitiveVisual);
    instance(): DrawingInstance;
    update(instance: DrawingInstance): void;
    attached(context: PrimitiveAttachedContext): void;
    detached(): void;
    updateAllViews(): void;
    paneViews(): readonly PrimitivePaneView[];
    autoscaleInfo(range: LogicalRange): AutoscaleInfo | null;
    hitTest(point: Readonly<DrawingScreenPoint>, context: HitTestContext): PrimitiveHit | null;
    onPointerDown(event: PrimitiveInteractionEvent): void;
    onPointerMove(event: PrimitiveInteractionEvent): void;
    onPointerUp(): void;
    onPointerCancel(): void;
    private cancelDrag;
    private hit;
    private pointFromCoordinate;
    private refreshScreen;
    private draw;
    private drawHandles;
}
export declare function createInteractiveDrawingBinding(instance: DrawingInstance, events: DrawingPrimitiveEvents, visual: DrawingPrimitiveVisual): DrawingPrimitiveBinding;

// Public API module: orderflow/aggregation.d.ts
import type { Time } from '../core/chart-api.js';
import { type FootprintBar, type FootprintNormalizationOptions, type OrderFlowTrade } from './model.js';
export interface FootprintAggregationOptions extends FootprintNormalizationOptions {
    /** Fixed bar duration in seconds. */
    readonly barDuration: number;
    /** Origin used to align bar boundaries. Defaults to the UNIX epoch. */
    readonly timeOrigin?: Time;
}
export type FootprintAggregationUpdateKind = 'append' | 'update';
/** One tail-only change produced from a chronologically appended trade. */
export interface FootprintAggregationPatch {
    readonly kind: FootprintAggregationUpdateKind;
    readonly fromIndex: number;
    readonly removed: 0 | 1;
    readonly data: readonly FootprintBar[];
}
/**
 * Stateful trade-to-footprint aggregation. New trades touch only the current
 * level and replace only the current immutable bar, or append one new bar.
 */
export declare class FootprintAggregator {
    private readonly config;
    private readonly normalization;
    private readonly dataValue;
    private readonly ids;
    private tail;
    private previousTime;
    private previousSequence;
    constructor(options: FootprintAggregationOptions);
    get size(): number;
    get latest(): FootprintBar | null;
    /** Returns a stable immutable point-in-time copy. It is never mutated by later pushes. */
    snapshot(): readonly FootprintBar[];
    /** Atomically replaces all state from an ordered trade snapshot. */
    reset(values: readonly OrderFlowTrade[]): readonly FootprintBar[];
    /** Appends one chronological trade and emits a one-bar tail patch. */
    push(value: OrderFlowTrade): FootprintAggregationPatch;
    clear(): void;
    private validateNext;
    private remember;
    private ingest;
}
export declare function aggregateFootprintBars(trades: readonly OrderFlowTrade[], options: FootprintAggregationOptions): readonly FootprintBar[];

// Public API module: orderflow/footprint-series.d.ts
import type { SeriesOptions } from '../core/chart-api.js';
import type { CustomSeriesDefinition } from '../series/registry.js';
import { type FootprintBar } from './model.js';
import { type FootprintMetricsOptions } from './metrics.js';
export declare const FootprintDisplayMode: Readonly<{
    readonly BidAsk: 'bid-ask';
    readonly Delta: 'delta';
    readonly Total: 'total';
    readonly Ladder: 'ladder';
}>;
export type FootprintDisplayMode = typeof FootprintDisplayMode[keyof typeof FootprintDisplayMode];
export declare const FootprintDetailLevel: Readonly<{
    readonly Auto: 'auto';
    readonly Numbers: 'numbers';
    readonly Heatmap: 'heatmap';
    readonly Summary: 'summary';
}>;
export type FootprintDetailLevel = typeof FootprintDetailLevel[keyof typeof FootprintDetailLevel];
export type ResolvedFootprintDetailLevel = Exclude<FootprintDetailLevel, typeof FootprintDetailLevel.Auto>;
export interface FootprintDetailGeometry {
    readonly barSpacing: number;
    readonly cellHeight: number;
}
export interface FootprintSeriesOptions extends SeriesOptions, FootprintMetricsOptions {
    readonly mode: FootprintDisplayMode;
    readonly detailLevel: FootprintDetailLevel;
    readonly bidColor: string;
    readonly askColor: string;
    readonly positiveDeltaColor: string;
    readonly negativeDeltaColor: string;
    readonly totalColor: string;
    readonly pocColor: string;
    readonly valueAreaColor: string;
    readonly imbalanceColor: string;
    readonly unfinishedAuctionColor: string;
    readonly cellOpacity: number;
    readonly fontSize: number;
    readonly minimumNumbersBarSpacing: number;
    readonly minimumNumbersCellHeight: number;
    readonly minimumHeatmapBarSpacing: number;
    readonly minimumHeatmapCellHeight: number;
    readonly showPoc: boolean;
    readonly showValueArea: boolean;
    readonly showImbalances: boolean;
    readonly showUnfinishedAuctions: boolean;
}
export declare const defaultFootprintSeriesOptions: Readonly<FootprintSeriesOptions>;
export declare function resolveFootprintDetailLevel(geometry: FootprintDetailGeometry, options?: Readonly<FootprintSeriesOptions>): ResolvedFootprintDetailLevel;
export declare const FootprintSeries: CustomSeriesDefinition<FootprintBar, FootprintSeriesOptions>;

// Public API module: orderflow/index.d.ts
export * from './model.js';
export * from './aggregation.js';
export * from './metrics.js';
export * from './footprint-series.js';
export * from './volume-profile.js';
export * from './volume-profile-series.js';
export * from './tpo-series.js';

// Public API module: orderflow/metrics.d.ts
import { type FootprintBar, type FootprintNormalizationOptions } from './model.js';
export declare const FootprintPocTieBreak: Readonly<{
    readonly ClosestToClose: 'closest-to-close';
    readonly LowerPrice: 'lower-price';
    readonly HigherPrice: 'higher-price';
}>;
export type FootprintPocTieBreak = typeof FootprintPocTieBreak[keyof typeof FootprintPocTieBreak];
export declare const FootprintAuctionCompletion: Readonly<{
    readonly Finished: 'finished';
    readonly Unfinished: 'unfinished';
    readonly Unavailable: 'unavailable';
}>;
export type FootprintAuctionCompletion = typeof FootprintAuctionCompletion[keyof typeof FootprintAuctionCompletion];
export type FootprintImbalanceSide = 'buy' | 'sell';
export interface FootprintMetricsOptions extends FootprintNormalizationOptions {
    /** Fraction of total volume included in value area. Defaults to 0.7. */
    readonly valueAreaPercentage?: number;
    /** Required dominant/opposing diagonal ratio. Defaults to 3. */
    readonly imbalanceRatio?: number;
    /** Required dominant-side volume. Defaults to zero. */
    readonly imbalanceMinimumVolume?: number;
    /** Consecutive same-side imbalances required for a stack. Defaults to 3. */
    readonly stackedImbalanceCount?: number;
    /** Deterministic policy for equal-volume POC candidates. */
    readonly pocTieBreak?: FootprintPocTieBreak;
}
export interface FootprintLevelMetrics {
    readonly price: number;
    readonly bidVolume: number;
    readonly askVolume: number;
    readonly totalVolume: number;
    readonly delta: number;
    readonly tradeCount?: number;
    readonly buyImbalance: boolean;
    readonly sellImbalance: boolean;
}
export interface FootprintValueArea {
    readonly low: number;
    readonly high: number;
    readonly volume: number;
    readonly targetVolume: number;
    readonly percentage: number;
}
export interface FootprintImbalance {
    readonly side: FootprintImbalanceSide;
    readonly price: number;
    readonly volume: number;
    readonly comparedPrice: number;
    readonly comparedVolume: number;
    /** Infinity when the valid opposing cell is zero. */
    readonly ratio: number;
}
export interface FootprintStackedImbalance {
    readonly side: FootprintImbalanceSide;
    readonly low: number;
    readonly high: number;
    readonly levelCount: number;
}
export interface FootprintAuctionMetrics {
    readonly low: FootprintAuctionCompletion;
    readonly high: FootprintAuctionCompletion;
}
export interface FootprintBarMetrics {
    readonly time: number;
    readonly totalBidVolume: number;
    readonly totalAskVolume: number;
    readonly totalVolume: number;
    readonly delta: number;
    /** Sum only when every level supplied tradeCount; otherwise null. */
    readonly tradeCount: number | null;
    readonly pocPrice: number;
    readonly pocVolume: number;
    readonly valueArea: FootprintValueArea;
    readonly imbalances: readonly FootprintImbalance[];
    readonly stackedImbalances: readonly FootprintStackedImbalance[];
    readonly auction: FootprintAuctionMetrics;
    readonly levels: readonly FootprintLevelMetrics[];
}
/**
 * Computes exact per-bar order-flow metrics. The result depends only on the bar
 * and calculation options; viewport and renderer state never enter this path.
 *
 * Buy imbalance compares ask(P) with bid(P - tick). Sell imbalance compares
 * bid(P) with ask(P + tick). A comparison outside the bar range is unavailable.
 */
export declare function calculateFootprintMetrics(value: FootprintBar, options: FootprintMetricsOptions): FootprintBarMetrics;

// Public API module: orderflow/model.d.ts
import type { CandlestickData, Time } from '../core/chart-api.js';
export declare const OrderFlowDataMode: Readonly<{
    readonly Exact: 'exact';
    readonly Approximate: 'approximate';
}>;
export type OrderFlowDataMode = typeof OrderFlowDataMode[keyof typeof OrderFlowDataMode];
export declare const TradeAggressorSide: Readonly<{
    /** Aggressive buyer: the trade executed against resting liquidity at the ask. */
    readonly Buy: 'buy';
    /** Aggressive seller: the trade executed against resting liquidity at the bid. */
    readonly Sell: 'sell';
}>;
export type TradeAggressorSide = typeof TradeAggressorSide[keyof typeof TradeAggressorSide];
export declare const FootprintApproximation: Readonly<{
    /** Candle volume distributed over its low/high range. Never treated as exact order flow. */
    readonly UniformCandleRange: 'uniform-candle-range';
    /** Venue/vendor supplied estimates without aggressor-side executions. */
    readonly VendorEstimated: 'vendor-estimated';
    /** Real trades whose aggressor side could not be classified. */
    readonly UnclassifiedTrades: 'unclassified-trades';
}>;
export type FootprintApproximation = typeof FootprintApproximation[keyof typeof FootprintApproximation];
/** One classified market execution used to construct exact footprint data. */
export interface OrderFlowTrade {
    readonly time: Time;
    readonly price: number;
    readonly volume: number;
    readonly aggressorSide: TradeAggressorSide;
    readonly id?: string;
    /** Optional venue ordering key for trades sharing one timestamp. */
    readonly sequence?: number;
}
export interface FootprintLevel {
    /** Tick-aligned execution price. */
    readonly price: number;
    /** Volume of aggressive sells executed against resting bids. */
    readonly bidVolume: number;
    /** Volume of aggressive buys executed against resting asks. */
    readonly askVolume: number;
    readonly tradeCount?: number;
}
/** Exact aggressor-classified volume-at-price for one OHLC bar. */
export interface FootprintBar extends CandlestickData {
    readonly dataMode: typeof OrderFlowDataMode.Exact;
    /** Strictly ascending, unique and tick-aligned levels. */
    readonly levels: readonly FootprintLevel[];
}
export type ExactFootprintBar = FootprintBar;
export interface ApproximateFootprintLevel {
    readonly price: number;
    readonly totalVolume: number;
    readonly tradeCount?: number;
}
/**
 * Explicitly non-exact volume-at-price. It cannot be passed to APIs requiring FootprintBar,
 * because total volume has no fabricated bid/ask split.
 */
export interface ApproximateFootprintBar extends CandlestickData {
    readonly dataMode: typeof OrderFlowDataMode.Approximate;
    readonly approximation: FootprintApproximation;
    readonly levels: readonly ApproximateFootprintLevel[];
}
export type OrderFlowBar = FootprintBar | ApproximateFootprintBar;
export interface FootprintNormalizationOptions {
    readonly tickSize: number;
    /** Tick-grid origin. Defaults to zero. */
    readonly priceOrigin?: number;
}
/** Validates and snapshots an OHLC point on the same price grid as order-flow data. */
export declare function normalizeTickAlignedCandle(value: CandlestickData, options: FootprintNormalizationOptions): CandlestickData;
export declare function normalizeOrderFlowTrade(value: OrderFlowTrade, options: FootprintNormalizationOptions): OrderFlowTrade;
export declare function normalizeOrderFlowTrades(values: readonly OrderFlowTrade[], options: FootprintNormalizationOptions): readonly OrderFlowTrade[];
export declare function normalizeFootprintLevel(value: FootprintLevel, options: FootprintNormalizationOptions): FootprintLevel;
export declare function normalizeFootprintBar(value: FootprintBar, options: FootprintNormalizationOptions): FootprintBar;
export declare function normalizeFootprintBars(values: readonly FootprintBar[], options: FootprintNormalizationOptions): readonly FootprintBar[];
export declare function normalizeApproximateFootprintBar(value: ApproximateFootprintBar, options: FootprintNormalizationOptions): ApproximateFootprintBar;
export declare function normalizeApproximateFootprintBars(values: readonly ApproximateFootprintBar[], options: FootprintNormalizationOptions): readonly ApproximateFootprintBar[];
export declare function isExactFootprintBar(value: OrderFlowBar): value is FootprintBar;
export declare function isApproximateFootprintBar(value: OrderFlowBar): value is ApproximateFootprintBar;
export declare function footprintLevelVolume(level: FootprintLevel): number;
export declare function footprintBarVolume(bar: FootprintBar): number;

// Public API module: orderflow/tpo-series.d.ts
import type { CandlestickData, SeriesOptions } from '../core/chart-api.js';
import type { CustomSeriesDefinition } from '../series/registry.js';
import { type FootprintNormalizationOptions } from './model.js';
export interface TpoBar extends CandlestickData {
    /** Stable, serializable trading-session identity. */
    readonly sessionId: string;
}
export interface TpoCalculationOptions extends FootprintNormalizationOptions {
    readonly valueAreaPercentage?: number;
    readonly initialBalancePeriods?: number;
    readonly symbolSequence?: string;
    /** Safety bound for one candle's inclusive low/high tick span. */
    readonly maxLevelsPerBar?: number;
}
export interface TpoLevel {
    readonly price: number;
    readonly count: number;
    readonly periodIndexes: readonly number[];
    readonly symbols: readonly string[];
    readonly singlePrint: boolean;
}
export interface TpoValueArea {
    readonly low: number;
    readonly high: number;
    readonly count: number;
    readonly targetCount: number;
    readonly percentage: number;
}
export interface TpoSessionProfile {
    readonly sessionId: string;
    readonly from: number;
    readonly to: number;
    readonly periodCount: number;
    readonly totalTpos: number;
    readonly levels: readonly TpoLevel[];
    readonly pocPrice: number;
    readonly pocCount: number;
    readonly valueArea: TpoValueArea;
    readonly initialBalanceLow: number;
    readonly initialBalanceHigh: number;
}
export declare function normalizeTpoBar(value: TpoBar, options: FootprintNormalizationOptions): TpoBar;
export declare function normalizeTpoBars(values: readonly TpoBar[], options: FootprintNormalizationOptions): readonly TpoBar[];
export declare function tpoSymbolForPeriod(periodIndex: number, symbolSequence?: string): string;
export declare function calculateTpoProfiles(values: readonly TpoBar[], options: TpoCalculationOptions): readonly TpoSessionProfile[];
export declare const TpoDisplayMode: Readonly<{
    readonly Auto: 'auto';
    readonly Letters: 'letters';
    readonly Blocks: 'blocks';
}>;
export type TpoDisplayMode = typeof TpoDisplayMode[keyof typeof TpoDisplayMode];
export interface TpoSeriesOptions extends SeriesOptions, TpoCalculationOptions {
    readonly displayMode: TpoDisplayMode;
    readonly letterColor: string;
    readonly blockColor: string;
    readonly singlePrintColor: string;
    readonly pocColor: string;
    readonly valueAreaColor: string;
    readonly initialBalanceColor: string;
    readonly cellOpacity: number;
    readonly fontSize: number;
    readonly showPoc: boolean;
    readonly showValueArea: boolean;
    readonly showInitialBalance: boolean;
    readonly showSinglePrints: boolean;
}
export declare const defaultTpoSeriesOptions: Readonly<TpoSeriesOptions>;
export declare const TpoSeries: CustomSeriesDefinition<TpoBar, TpoSeriesOptions>;

// Public API module: orderflow/volume-profile-series.d.ts
import type { SeriesOptions, TimeRange } from '../core/chart-api.js';
import type { CustomSeriesDefinition } from '../series/registry.js';
import { type FootprintBar } from './model.js';
import { type VolumeProfileCalculationOptions } from './volume-profile.js';
export declare const VolumeProfileRangeMode: Readonly<{
    readonly Visible: 'visible';
    readonly Fixed: 'fixed';
    readonly Session: 'session';
}>;
export type VolumeProfileRangeMode = typeof VolumeProfileRangeMode[keyof typeof VolumeProfileRangeMode];
export declare const VolumeProfileDisplayMode: Readonly<{
    readonly Total: 'total';
    readonly BidAsk: 'bid-ask';
    readonly Delta: 'delta';
}>;
export type VolumeProfileDisplayMode = typeof VolumeProfileDisplayMode[keyof typeof VolumeProfileDisplayMode];
export declare const VolumeProfileAlignment: Readonly<{
    readonly Left: 'left';
    readonly Right: 'right';
}>;
export type VolumeProfileAlignment = typeof VolumeProfileAlignment[keyof typeof VolumeProfileAlignment];
/** Serializable half-open session boundary [from, to). */
export interface VolumeProfileSessionRange {
    readonly id: string;
    readonly from: number;
    readonly to: number;
}
export interface ExactVolumeProfileRangeOptions {
    readonly rangeMode: VolumeProfileRangeMode;
    readonly fixedRange?: TimeRange;
    readonly sessionRanges: readonly VolumeProfileSessionRange[];
    /** Defaults to the viewport end. */
    readonly sessionAnchorTime?: number;
}
export interface ExactVolumeProfileSeriesOptions extends SeriesOptions, VolumeProfileCalculationOptions, ExactVolumeProfileRangeOptions {
    readonly displayMode: VolumeProfileDisplayMode;
    readonly alignment: VolumeProfileAlignment;
    readonly profileWidth: number;
    readonly cellOpacity: number;
    readonly totalColor: string;
    readonly bidColor: string;
    readonly askColor: string;
    readonly positiveDeltaColor: string;
    readonly negativeDeltaColor: string;
    readonly pocColor: string;
    readonly valueAreaColor: string;
    readonly developingValueAreaColor: string;
    readonly showPoc: boolean;
    readonly showValueArea: boolean;
    readonly showLabels: boolean;
    readonly showDevelopingLevels: boolean;
    readonly fontSize: number;
}
export declare const defaultExactVolumeProfileSeriesOptions: Readonly<ExactVolumeProfileSeriesOptions>;
/** Selects the exact source bars for visible, fixed, or serializable session ranges. */
export declare function selectExactVolumeProfileBars(bars: readonly FootprintBar[], visibleRange: TimeRange, options: Readonly<ExactVolumeProfileRangeOptions>): readonly FootprintBar[];
export declare const ExactVolumeProfileSeries: CustomSeriesDefinition<FootprintBar, ExactVolumeProfileSeriesOptions>;

// Public API module: orderflow/volume-profile.d.ts
import { FootprintApproximation, OrderFlowDataMode, type FootprintBar, type FootprintNormalizationOptions, type OrderFlowBar } from './model.js';
import { FootprintPocTieBreak, type FootprintValueArea } from './metrics.js';
export declare const VolumeProfileStatus: Readonly<{
    readonly Ready: 'ready';
    readonly Empty: 'empty';
    readonly Approximate: 'approximate';
    readonly Mixed: 'mixed';
}>;
export type VolumeProfileStatus = typeof VolumeProfileStatus[keyof typeof VolumeProfileStatus];
export interface VolumeProfileCalculationOptions extends FootprintNormalizationOptions {
    readonly valueAreaPercentage?: number;
    readonly pocTieBreak?: FootprintPocTieBreak;
}
export interface ExactVolumeProfileLevel {
    readonly price: number;
    readonly bidVolume: number;
    readonly askVolume: number;
    readonly totalVolume: number;
    readonly delta: number;
    readonly tradeCount?: number;
}
interface ExactVolumeProfileBase {
    readonly dataMode: typeof OrderFlowDataMode.Exact;
    readonly barCount: number;
    readonly levels: readonly ExactVolumeProfileLevel[];
    readonly totalBidVolume: number;
    readonly totalAskVolume: number;
    readonly totalVolume: number;
    readonly delta: number;
    readonly tradeCount: number | null;
}
export interface ReadyExactVolumeProfile extends ExactVolumeProfileBase {
    readonly status: typeof VolumeProfileStatus.Ready;
    readonly from: number;
    readonly to: number;
    readonly pocPrice: number;
    readonly pocVolume: number;
    readonly valueArea: FootprintValueArea;
}
export interface EmptyExactVolumeProfile extends ExactVolumeProfileBase {
    readonly status: typeof VolumeProfileStatus.Empty;
    readonly from: null;
    readonly to: null;
    readonly pocPrice: null;
    readonly pocVolume: 0;
    readonly valueArea: null;
}
export type ExactVolumeProfile = ReadyExactVolumeProfile | EmptyExactVolumeProfile;
export interface UnavailableVolumeProfile {
    readonly status: typeof VolumeProfileStatus.Approximate | typeof VolumeProfileStatus.Mixed;
    readonly inputMode: typeof OrderFlowDataMode.Approximate | 'mixed';
    readonly profile: null;
    readonly approximations: readonly FootprintApproximation[];
    readonly message: string;
}
export type VolumeProfileResolution = ExactVolumeProfile | UnavailableVolumeProfile;
export type VolumeProfileAggregationUpdateKind = 'append' | 'update';
export interface VolumeProfileAggregationUpdate {
    readonly kind: VolumeProfileAggregationUpdateKind;
    readonly profile: ReadyExactVolumeProfile;
}
export interface DevelopingVolumeProfilePoint {
    readonly time: number;
    readonly totalBidVolume: number;
    readonly totalAskVolume: number;
    readonly totalVolume: number;
    readonly delta: number;
    readonly pocPrice: number;
    readonly pocVolume: number;
    readonly valueAreaLow: number;
    readonly valueAreaHigh: number;
}
/**
 * Incremental exact volume-at-price accumulator. Append and replace-last apply
 * level deltas only; they never rebuild prior bars or distribute candle volume.
 */
export declare class ExactVolumeProfileAccumulator {
    private readonly options;
    private base;
    private levels;
    private firstTime;
    private lastBar;
    private count;
    constructor(options: VolumeProfileCalculationOptions);
    get barCount(): number;
    reset(values: readonly FootprintBar[]): ExactVolumeProfile;
    push(value: FootprintBar): VolumeProfileAggregationUpdate;
    snapshot(): ExactVolumeProfile;
}
export declare function calculateVolumeProfile(bars: readonly FootprintBar[], options: VolumeProfileCalculationOptions): ExactVolumeProfile;
/**
 * Resolves heterogeneous input without ever converting approximate total
 * volume into a fake exact bid/ask profile.
 */
export declare function resolveVolumeProfile(bars: readonly OrderFlowBar[], options: VolumeProfileCalculationOptions): VolumeProfileResolution;
export declare function calculateDevelopingVolumeProfile(bars: readonly FootprintBar[], options: VolumeProfileCalculationOptions): readonly DevelopingVolumeProfilePoint[];
export {};

// Public API module: persistence/chart-state-persistence.d.ts
import type { DrawingController, DrawingRestoreResult } from '../drawings/drawing-controller.js';
import { type ChartStateV1, type PersistedChartOptions, type PersistedIndicator, type PersistedPane, type PersistedSeries } from './chart-state.js';
export type MaybePromise<T> = T | Promise<T>;
export interface ChartStateLayoutSnapshot {
    readonly chartOptions: PersistedChartOptions;
    readonly panes: readonly PersistedPane[];
    readonly series: readonly PersistedSeries[];
}
export interface ChartStateLayoutAdapter {
    capture(): ChartStateLayoutSnapshot;
    restore(state: ChartStateLayoutSnapshot): MaybePromise<void>;
}
export interface ChartStateIndicatorAdapter {
    capture(): readonly PersistedIndicator[];
    /** Releases runtime series before the layout removes or recreates their panes. */
    clear(): MaybePromise<void>;
    restore(indicators: readonly PersistedIndicator[]): MaybePromise<void>;
}
/** Host-owned storage. Implementations may use files, a backend, IndexedDB, etc. */
export interface ChartStateStorage {
    load(key: string): MaybePromise<string | null>;
    save(key: string, value: string): MaybePromise<void>;
    remove(key: string): MaybePromise<void>;
}
export interface ChartStatePersistenceOptions<TContext = void> {
    readonly layout: ChartStateLayoutAdapter;
    readonly indicators: ChartStateIndicatorAdapter;
    readonly drawings: DrawingController;
    readonly storage: ChartStateStorage;
    /** Host selects layout-bound vs per-symbol (or any other) storage scope here. */
    readonly key: (context: TContext) => string;
    readonly pretty?: boolean;
}
export interface ChartStateRestoreResult {
    readonly state: ChartStateV1;
    readonly drawings: DrawingRestoreResult;
}
/** Coordinates validated snapshots without owning a storage technology or scope policy. */
export declare class ChartStatePersistence<TContext = void> {
    private readonly layout;
    private readonly indicators;
    private readonly drawings;
    private readonly storage;
    private readonly resolveKey;
    private readonly pretty;
    constructor(options: ChartStatePersistenceOptions<TContext>);
    snapshot(): ChartStateV1;
    restore(value: ChartStateV1): Promise<ChartStateRestoreResult>;
    save(context: TContext): Promise<ChartStateV1>;
    load(context: TContext): Promise<ChartStateRestoreResult | null>;
    remove(context: TContext): Promise<void>;
    private key;
}

// Public API module: persistence/chart-state.d.ts
import { type DrawingInstance } from '../drawings/drawing-model.js';
import { type PersistedObject } from './json-value.js';
import { type IndicatorSource } from '@stocksharp/indicators';
export declare const CHART_STATE_SCHEMA_VERSION: 1;
export type PersistedChartOptions = PersistedObject;
export type PersistedSeriesOptions = PersistedObject;
export type PersistedIndicatorParameters = PersistedObject;
export type PersistedIndicatorStyles = PersistedObject;
export type PersistedDrawing = DrawingInstance;
export interface PersistedPriceScale {
    readonly id: string;
    readonly mode?: number;
    readonly autoScale?: boolean;
    readonly scaleMargins?: Readonly<{
        top: number;
        bottom: number;
    }>;
}
export interface PersistedPane {
    readonly id: string;
    readonly order: number;
    readonly height: number;
    readonly minHeight: number;
    readonly state: 'normal' | 'minimized' | 'maximized';
    readonly priceScales: readonly PersistedPriceScale[];
}
export interface PersistedSeries {
    readonly id: string;
    readonly type: string;
    readonly paneId: string;
    readonly priceScaleId: string;
    readonly options: PersistedSeriesOptions;
}
export interface PersistedIndicator {
    readonly id: string;
    readonly type: string;
    readonly paneId: string | null;
    readonly params: PersistedIndicatorParameters;
    readonly styles: PersistedIndicatorStyles;
    readonly source?: IndicatorSource;
    readonly visible?: boolean;
    /** Omitted for automatic scale routing. */
    readonly priceScaleId?: string;
}
export interface ChartStateV1 {
    readonly schemaVersion: typeof CHART_STATE_SCHEMA_VERSION;
    readonly chartOptions: PersistedChartOptions;
    readonly panes: readonly PersistedPane[];
    readonly series: readonly PersistedSeries[];
    readonly indicators: readonly PersistedIndicator[];
    readonly drawings: readonly PersistedDrawing[];
}
export declare function normalizeChartStateV1(value: unknown): ChartStateV1;

// Public API module: persistence/index.d.ts
export * from './json-value.js';
export * from './chart-state.js';
export * from './migrations.js';
export * from './serializer.js';
export * from './chart-state-persistence.js';
export * from './native-chart-layout-adapter.js';
export * from './indicator-engine-state-adapter.js';

// Public API module: persistence/indicator-engine-state-adapter.d.ts
import type { PersistedIndicator } from './chart-state.js';
import type { ChartStateIndicatorAdapter, MaybePromise } from './chart-state-persistence.js';
import { type IndicatorSource } from '@stocksharp/indicators';
export interface PersistableIndicatorStyleSeries {
    options?(): object;
    applyOptions?(options: object): void;
}
export interface PersistableIndicatorEntry {
    readonly id: string | number;
    persistenceId?: string;
    readonly type: string;
    readonly paneId: string | null;
    readonly params: object;
    readonly seriesRefs?: readonly PersistableIndicatorStyleSeries[];
    readonly styleSources?: Readonly<Record<string, PersistableIndicatorStyleSeries>>;
    readonly outputNames?: readonly string[];
    readonly legendSources?: Readonly<Record<string, {
        readonly series?: PersistableIndicatorStyleSeries;
        readonly field?: string;
        readonly colorOption?: string;
        readonly lineWidthOption?: string;
        readonly lineStyleOption?: string;
        readonly visibilityOption?: string;
    }>>;
    colors?: string[];
    readonly source?: IndicatorSource;
    readonly visible?: boolean;
    /** Explicit scale selection; undefined means automatic routing. */
    readonly priceScaleId?: string;
}
export interface IndicatorEnginePersistenceApi {
    getIndicators(): readonly PersistableIndicatorEntry[];
    removeAll(): MaybePromise<void>;
    add(type: string, params: object, targetPaneId?: string, persistence?: {
        readonly persistenceId?: string;
        readonly source?: IndicatorSource;
        readonly priceScaleId?: string;
    }): MaybePromise<PersistableIndicatorEntry | null>;
    setVisible(id: string | number, visible: boolean): boolean;
}
export interface IndicatorEngineStateAdapterOptions {
    readonly engine: IndicatorEnginePersistenceApi;
    /** Maps a persisted pane to a host pane-controller target when ids differ. */
    readonly resolveTargetPaneId?: (indicator: PersistedIndicator) => string | undefined;
    readonly onUnknownIndicator?: (indicator: PersistedIndicator) => void;
    readonly onUnknownStyle?: (indicator: PersistedIndicator, styleId: string) => void;
}
/** Persists indicator configuration and painter styles without computed output data. */
export declare class IndicatorEngineStateAdapter implements ChartStateIndicatorAdapter {
    private readonly engine;
    private readonly resolveTargetPaneId?;
    private readonly onUnknownIndicator?;
    private readonly onUnknownStyle?;
    constructor(options: IndicatorEngineStateAdapterOptions);
    capture(): readonly PersistedIndicator[];
    clear(): MaybePromise<void>;
    restore(indicators: readonly PersistedIndicator[]): Promise<void>;
    private targetPaneId;
}

// Public API module: persistence/json-value.d.ts
export type PersistedJsonValue = string | number | boolean | null | readonly PersistedJsonValue[] | PersistedObject;
export interface PersistedObject {
    readonly [key: string]: PersistedJsonValue;
}
export interface PersistedObjectNormalizationOptions {
    /** Omit undefined object properties. Undefined array items remain invalid. */
    readonly omitUndefined?: boolean;
}
/** Deep-clones JSON data into immutable, prototype-safe library state. */
export declare function normalizePersistedObject(value: unknown, path?: string, options?: PersistedObjectNormalizationOptions): PersistedObject;

// Public API module: persistence/migrations.d.ts
export type RawChartState = Readonly<Record<string, unknown>>;
export type ChartStateMigration = (state: RawChartState) => RawChartState;
export declare class ChartStateMigrationRegistry {
    private readonly migrations;
    register(fromVersion: number, migration: ChartStateMigration): void;
    migrate(value: unknown, targetVersion?: 1): RawChartState;
}
export declare const chartStateMigrations: ChartStateMigrationRegistry;

// Public API module: persistence/native-chart-layout-adapter.d.ts
import { type IChartApi, type IPaneApi, type ISeriesApi } from '../core/chart-api.js';
import type { PersistedSeries } from './chart-state.js';
import type { ChartStateLayoutAdapter, ChartStateLayoutSnapshot, MaybePromise } from './chart-state-persistence.js';
export interface NativeChartLayoutAdapterOptions {
    readonly chart: IChartApi;
    /** Root pane that cannot be removed. Defaults to the conventional `main` id. */
    readonly mainPaneId?: string;
    /** Overrides registry-based empty-series recreation (for host data-source wiring). */
    readonly createSeries?: (series: PersistedSeries, pane: IPaneApi) => MaybePromise<ISeriesApi<any, any> | null | void>;
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
export declare class NativeChartLayoutAdapter implements ChartStateLayoutAdapter {
    private readonly chart;
    private readonly mainPaneId;
    private readonly createSeries?;
    private readonly includeSeries?;
    private readonly onRemoveSeries?;
    private readonly onUnknownSeries?;
    constructor(options: NativeChartLayoutAdapterOptions);
    capture(): ChartStateLayoutSnapshot;
    private isOwned;
    restore(state: ChartStateLayoutSnapshot): Promise<void>;
    private capturePane;
}

// Public API module: persistence/serializer.d.ts
import { type ChartStateV1 } from './chart-state.js';
import { type ChartStateMigrationRegistry } from './migrations.js';
export interface SerializeChartStateOptions {
    readonly pretty?: boolean;
}
export interface DeserializeChartStateOptions {
    readonly migrations?: ChartStateMigrationRegistry;
}
export declare function serializeChartState(state: ChartStateV1, options?: SerializeChartStateOptions): string;
export declare function deserializeChartState(value: string | unknown, options?: DeserializeChartStateOptions): ChartStateV1;

// Public API module: primitives/horizontal-line.d.ts
import type { AutoscaleInfo, HitTestContext, IChartPrimitive, LineStyleValue, LogicalRange, PrimitiveAttachedContext, PrimitiveAxisView, PrimitiveHit, PrimitiveInteractionEvent, PrimitivePaneView, PrimitiveZOrder as PrimitiveZOrderValue } from '../core/chart-api.js';
export interface HorizontalLineOptions {
    /** Stable model identifier. It cannot be changed after construction. */
    readonly id?: string;
    readonly price: number;
    readonly color?: string;
    readonly lineWidth?: number;
    readonly lineStyle?: LineStyleValue;
    readonly axisLabelVisible?: boolean;
    readonly axisLabelColor?: string;
    readonly axisLabelTextColor?: string;
    readonly title?: string;
    readonly draggable?: boolean;
    /** Include the line price in the attached scale's autoscale range. */
    readonly autoscale?: boolean;
    readonly zOrder?: PrimitiveZOrderValue;
    readonly priceFormatter?: (price: number) => string;
}
export type HorizontalLineOptionsPatch = Partial<Omit<HorizontalLineOptions, 'id'>>;
export type ResolvedHorizontalLineOptions = Readonly<Required<HorizontalLineOptions>>;
/**
 * Reference interactive primitive. Attach it with chart.attachPrimitive(),
 * optionally passing a series so its price scale and formatting domain match.
 */
export declare class HorizontalLine implements IChartPrimitive {
    private readonly stableId;
    private readonly model;
    private context;
    private plot;
    private coordinate;
    private drag;
    private selected;
    private readonly renderer;
    private readonly paneView;
    private readonly axisView;
    private readonly interactionListener;
    constructor(options: HorizontalLineOptions);
    id(): string;
    price(): number;
    options(): ResolvedHorizontalLineOptions;
    setPrice(price: number): void;
    applyOptions(patch: HorizontalLineOptionsPatch): void;
    attached(context: PrimitiveAttachedContext): void;
    detached(): void;
    updateAllViews(): void;
    paneViews(): readonly PrimitivePaneView[];
    priceAxisViews(): readonly PrimitiveAxisView[];
    autoscaleInfo(_range: LogicalRange): AutoscaleInfo | null;
    hitTest(point: Readonly<{
        x: number;
        y: number;
    }>, context: HitTestContext): PrimitiveHit | null;
    onPointerDown(): void;
    onPointerMove(event: PrimitiveInteractionEvent): void;
    onPointerUp(): void;
    onPointerCancel(): void;
    private finishDrag;
    private assignPrice;
    private refreshCoordinate;
    private lineCoordinate;
    private axisBackground;
    private axisTextColor;
    private axisText;
    private draw;
}

// Public API module: primitives/session-shading.d.ts
import { type IChartPrimitive, type PrimitiveAttachedContext, type PrimitivePaneView, type PrimitiveZOrder as PrimitiveZOrderValue } from '../core/chart-api.js';
import { type ITradingCalendar, type TradingSession, type TradingSessionKind as TradingSessionKindValue } from '../time/trading-calendar.js';
export interface SessionShadingStyle {
    readonly color?: string;
    readonly visible?: boolean;
}
export interface SessionShadingOptions {
    readonly id?: string;
    readonly calendar: ITradingCalendar;
    readonly styles?: Partial<Record<TradingSessionKindValue, SessionShadingStyle>>;
    readonly zOrder?: PrimitiveZOrderValue;
}
export type SessionShadingOptionsPatch = Partial<Omit<SessionShadingOptions, 'id'>>;
export interface ResolvedSessionShadingStyle {
    readonly color: string;
    readonly visible: boolean;
}
export interface ResolvedSessionShadingOptions {
    readonly id: string;
    readonly calendar: ITradingCalendar;
    readonly styles: Readonly<Record<TradingSessionKindValue, ResolvedSessionShadingStyle>>;
    readonly zOrder: PrimitiveZOrderValue;
}
/** Calendar-backed pane background implemented only through the public primitive API. */
export declare class SessionShading implements IChartPrimitive {
    private readonly stableId;
    private readonly model;
    private context;
    private range;
    private sessions;
    private cache;
    private readonly renderer;
    private readonly paneView;
    constructor(options: SessionShadingOptions);
    id(): string;
    options(): ResolvedSessionShadingOptions;
    visibleSessions(): readonly TradingSession[];
    applyOptions(patch: SessionShadingOptionsPatch): void;
    attached(context: PrimitiveAttachedContext): void;
    detached(): void;
    updateAllViews(): void;
    paneViews(): readonly PrimitivePaneView[];
    private refresh;
    private invalidateCache;
    private draw;
}

// Public API module: primitives/trend-line.d.ts
import type { AutoscaleInfo, HitTestContext, IChartPrimitive, LineStyleValue, LogicalRange, PrimitiveAttachedContext, PrimitiveHit, PrimitiveInteractionEvent, PrimitivePaneView, PrimitiveZOrder as PrimitiveZOrderValue, Time } from '../core/chart-api.js';
export interface TrendLinePoint {
    readonly time: Time;
    readonly price: number;
}
export interface TrendLineOptions {
    /** Stable model identifier. It cannot be changed after construction. */
    readonly id?: string;
    readonly start: TrendLinePoint;
    readonly end: TrendLinePoint;
    readonly color?: string;
    readonly lineWidth?: number;
    readonly lineStyle?: LineStyleValue;
    readonly draggable?: boolean;
    readonly autoscale?: boolean;
    readonly extendLeft?: boolean;
    readonly extendRight?: boolean;
    readonly zOrder?: PrimitiveZOrderValue;
}
export type TrendLineOptionsPatch = Partial<Omit<TrendLineOptions, 'id'>>;
export interface ResolvedTrendLineOptions {
    readonly id: string;
    readonly start: TrendLinePoint;
    readonly end: TrendLinePoint;
    readonly color: string;
    readonly lineWidth: number;
    readonly lineStyle: LineStyleValue;
    readonly draggable: boolean;
    readonly autoscale: boolean;
    readonly extendLeft: boolean;
    readonly extendRight: boolean;
    readonly zOrder: PrimitiveZOrderValue;
}
/** Reference two-point drawing built exclusively on the public primitive API. */
export declare class TrendLine implements IChartPrimitive {
    private readonly stableId;
    private readonly model;
    private context;
    private plot;
    private screen;
    private drag;
    private selected;
    private readonly renderer;
    private readonly paneView;
    private readonly interactionListener;
    constructor(options: TrendLineOptions);
    id(): string;
    startPoint(): TrendLinePoint;
    endPoint(): TrendLinePoint;
    points(): Readonly<{
        start: TrendLinePoint;
        end: TrendLinePoint;
    }>;
    options(): ResolvedTrendLineOptions;
    setPoints(start: TrendLinePoint, end: TrendLinePoint): void;
    applyOptions(patch: TrendLineOptionsPatch): void;
    attached(context: PrimitiveAttachedContext): void;
    detached(): void;
    updateAllViews(): void;
    paneViews(): readonly PrimitivePaneView[];
    autoscaleInfo(_range: LogicalRange): AutoscaleInfo | null;
    hitTest(pointToTest: Readonly<{
        x: number;
        y: number;
    }>, context: HitTestContext): PrimitiveHit | null;
    onPointerDown(event: PrimitiveInteractionEvent): void;
    onPointerMove(event: PrimitiveInteractionEvent): void;
    onPointerUp(): void;
    onPointerCancel(): void;
    private hit;
    private finishDrag;
    private assignPoints;
    private pointFromCoordinate;
    private refreshScreen;
    private visibleSegment;
    private draw;
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

// Public API module: time/bar-clock.d.ts
import type { Time } from '../core/chart-api.js';
import { type ITradingCalendar, type TradingSession, type TradingSessionKind as TradingSessionKindValue } from './trading-calendar.js';
export declare const BarClockState: Readonly<{
    readonly Pending: 'pending';
    readonly Open: 'open';
    readonly Closed: 'closed';
}>;
export type BarClockState = typeof BarClockState[keyof typeof BarClockState];
export interface BarClockOptions {
    readonly calendar?: ITradingCalendar;
    /** Defaults to regular sessions when a calendar is present. */
    readonly sessionKinds?: readonly TradingSessionKindValue[];
}
export interface TradingBarBounds {
    readonly resolution: string;
    readonly intervalSeconds: number;
    readonly openTime: Time;
    readonly closeTime: Time;
    readonly durationSeconds: number;
    readonly session: TradingSession | null;
}
export interface BarCountdown {
    readonly state: BarClockState;
    readonly now: Time;
    readonly bounds: TradingBarBounds;
    readonly untilOpenSeconds: number;
    readonly elapsedSeconds: number;
    readonly remainingSeconds: number;
    readonly progress: number;
}
/**
 * Resolves the close of a feed bar from its open timestamp. Intraday bars are
 * truncated at their owning session close; D/W bars advance by local trading
 * dates rather than by browser-local midnights.
 */
export declare function resolveTradingBarBounds(barOpenTime: Time, resolution: string, options?: BarClockOptions): TradingBarBounds | null;
/** Deterministic countdown snapshot. The caller owns the clock and supplies now. */
export declare function calculateBarCountdown(barOpenTime: Time, resolution: string, now: Time, options?: BarClockOptions): BarCountdown | null;

// Public API module: time/index.d.ts
export * from './trading-calendar.js';
export * from './trading-calendar-engine.js';
export * from './time-axis-formatter.js';
export * from './bar-clock.js';

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

// Public API module: time/trading-calendar-engine.d.ts
import type { Time, TimeRange } from '../core/chart-api.js';
import { type ITradingCalendar, type TradingSchedule, type TradingSession, type TradingSessionKind as TradingSessionKindValue } from './trading-calendar.js';
/** IANA/DST-aware materializer for recurring exchange sessions. */
export declare class TradingCalendar implements ITradingCalendar {
    private readonly scheduleValue;
    private readonly formatter;
    private readonly holidays;
    private readonly overrides;
    private readonly sessionCache;
    private readonly offsetCache;
    constructor(schedule: TradingSchedule);
    schedule(): TradingSchedule;
    sessionsInRange(range: TimeRange, kinds?: readonly TradingSessionKindValue[]): readonly TradingSession[];
    sessionAt(time: Time, kinds?: readonly TradingSessionKindValue[]): TradingSession | null;
    isTradingTime(time: Time, kinds?: readonly TradingSessionKindValue[]): boolean;
    nextSession(time: Time, kinds?: readonly TradingSessionKindValue[]): TradingSession | null;
    previousSession(time: Time, kinds?: readonly TradingSessionKindValue[]): TradingSession | null;
    private sessionsForDate;
    private materialize;
    private localDateAt;
    private parseDate;
    private isoWeekday;
    private localParts;
    private toUtc;
    private firstInstantAfterGap;
    private offsetsForDate;
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

// Public API module: trading/index.d.ts
export * from './model.js';
export * from './trading-layer.js';
export * from './trading-layer-primitive.js';
export * from './trading-order-placement-adapter.js';

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

// Public API module: trading/trading-layer-primitive.d.ts
import type { AutoscaleInfo, HitTestContext, IChartPrimitive, LogicalRange, PrimitiveAttachedContext, PrimitiveAxisView, PrimitiveHit, PrimitiveInteractionEvent, PrimitivePaneView, PrimitiveZOrder as PrimitiveZOrderValue } from '../core/chart-api.js';
import { type ChartExecution, type ChartOrder, type ChartPosition, type ChartQuote } from './model.js';
import type { ITradingLayer } from './trading-layer.js';
export declare const TradingPrimitiveEntityKind: Readonly<{
    readonly Order: 'order';
    readonly Position: 'position';
    readonly Execution: 'execution';
    readonly Quote: 'quote';
}>;
export type TradingPrimitiveEntityKind = typeof TradingPrimitiveEntityKind[keyof typeof TradingPrimitiveEntityKind];
export declare const TradingQuoteKind: Readonly<{
    readonly Bid: 'bid';
    readonly Ask: 'ask';
    readonly Last: 'last';
}>;
export type TradingQuoteKind = typeof TradingQuoteKind[keyof typeof TradingQuoteKind];
export interface TradingLayerPrimitiveOptions {
    readonly id?: string;
    readonly showOrders?: boolean;
    readonly showInactiveOrders?: boolean;
    readonly showPositions?: boolean;
    readonly showExecutions?: boolean;
    readonly showExecutionLabels?: boolean;
    readonly showQuote?: boolean;
    readonly showPnl?: boolean;
    readonly showBrackets?: boolean;
    readonly autoscale?: boolean;
    readonly orderBuyColor?: string;
    readonly orderSellColor?: string;
    readonly inactiveOrderColor?: string;
    readonly longPositionColor?: string;
    readonly shortPositionColor?: string;
    readonly executionBuyColor?: string;
    readonly executionSellColor?: string;
    readonly bidColor?: string;
    readonly askColor?: string;
    readonly lastColor?: string;
    readonly bracketColor?: string;
    readonly lineWidth?: number;
    readonly fontSize?: number;
    /** Vertical media-coordinate distance between adjacent order labels. */
    readonly orderLabelSpacing?: number;
    readonly zOrder?: PrimitiveZOrderValue;
    readonly priceFormatter?: (price: number) => string;
    readonly quantityFormatter?: (quantity: number) => string;
    readonly pnlFormatter?: (pnl: number, currency?: string) => string;
}
export type TradingLayerPrimitiveOptionsPatch = Partial<Omit<TradingLayerPrimitiveOptions, 'id'>>;
export interface ResolvedTradingLayerPrimitiveOptions {
    readonly id: string;
    readonly showOrders: boolean;
    readonly showInactiveOrders: boolean;
    readonly showPositions: boolean;
    readonly showExecutions: boolean;
    readonly showExecutionLabels: boolean;
    readonly showQuote: boolean;
    readonly showPnl: boolean;
    readonly showBrackets: boolean;
    readonly autoscale: boolean;
    readonly orderBuyColor: string;
    readonly orderSellColor: string;
    readonly inactiveOrderColor: string;
    readonly longPositionColor: string;
    readonly shortPositionColor: string;
    readonly executionBuyColor: string;
    readonly executionSellColor: string;
    readonly bidColor: string;
    readonly askColor: string;
    readonly lastColor: string;
    readonly bracketColor: string;
    readonly lineWidth: number;
    readonly fontSize: number;
    readonly orderLabelSpacing: number;
    readonly zOrder: PrimitiveZOrderValue;
    readonly priceFormatter: (price: number) => string;
    readonly quantityFormatter: (quantity: number) => string;
    readonly pnlFormatter: (pnl: number, currency?: string) => string;
}
export interface TradingOrderHitData {
    readonly kind: 'trading';
    readonly entityKind: typeof TradingPrimitiveEntityKind.Order;
    readonly part: 'line' | 'label';
    readonly id: string;
    readonly order: ChartOrder;
}
export interface TradingPositionHitData {
    readonly kind: 'trading';
    readonly entityKind: typeof TradingPrimitiveEntityKind.Position;
    readonly part: 'line' | 'label';
    readonly id: string;
    readonly position: ChartPosition;
}
export interface TradingExecutionHitData {
    readonly kind: 'trading';
    readonly entityKind: typeof TradingPrimitiveEntityKind.Execution;
    readonly part: 'marker' | 'label';
    readonly id: string;
    readonly execution: ChartExecution;
}
export interface TradingQuoteHitData {
    readonly kind: 'trading';
    readonly entityKind: typeof TradingPrimitiveEntityKind.Quote;
    readonly part: 'line';
    readonly id: TradingQuoteKind;
    readonly quoteKind: TradingQuoteKind;
    readonly quote: ChartQuote;
    readonly price: number;
}
export type TradingPrimitiveHitData = TradingOrderHitData | TradingPositionHitData | TradingExecutionHitData | TradingQuoteHitData;
/** Read-only renderer for canonical TradingLayer state. Interaction emits intents in a separate layer. */
export declare class TradingLayerPrimitive implements IChartPrimitive {
    private readonly layer;
    private readonly stableId;
    private readonly model;
    private context;
    private snapshot;
    private plot;
    private rendered;
    private axisViews;
    private readonly orderLabelOffsets;
    private readonly orderPreviews;
    private drag;
    private readonly renderer;
    private readonly paneView;
    private readonly stateListener;
    private readonly outcomeListener;
    constructor(layer: ITradingLayer, options?: TradingLayerPrimitiveOptions);
    id(): string;
    options(): ResolvedTradingLayerPrimitiveOptions;
    applyOptions(patch: TradingLayerPrimitiveOptionsPatch): void;
    attached(context: PrimitiveAttachedContext): void;
    detached(): void;
    updateAllViews(): void;
    paneViews(): readonly PrimitivePaneView[];
    priceAxisViews(): readonly PrimitiveAxisView[];
    autoscaleInfo(_range: LogicalRange): AutoscaleInfo | null;
    hitTest(point: Readonly<{
        x: number;
        y: number;
    }>, context: HitTestContext): PrimitiveHit | null;
    onPointerDown(event: PrimitiveInteractionEvent): void;
    onPointerMove(event: PrimitiveInteractionEvent): void;
    onPointerUp(): void;
    onPointerCancel(): void;
    private hitRendered;
    private draw;
    private drawMedia;
    private drawQuote;
    private drawPositions;
    private drawOrders;
    private drawBracketGroups;
    private drawExecutions;
    private orderLabel;
    private positionLabel;
    private visibleOrders;
    private orderDraggable;
    private canonicalOrderDraggable;
    private coordinate;
    private rebuildAxisViews;
    private pruneOrderLayout;
}
export declare function isTradingPrimitiveHitData(value: unknown): value is TradingPrimitiveHitData;

// Public API module: trading/trading-layer.d.ts
import type { Time } from '../core/chart-api.js';
import type { Unsubscribe } from '../data/data-source.js';
import { type CancelOrderIntent, type ChartExecution, type ChartOrder, type ChartOrderModification, type ChartOrderRequest, type ChartPosition, type ChartQuote, type ClosePositionIntent, type CreateStopLossIntent, type CreateTakeProfitIntent, type EditStopLossIntent, type EditTakeProfitIntent, type ModifyOrderIntent, type PlaceOrderIntent, type RemoveStopLossIntent, type RemoveTakeProfitIntent, type ReversePositionIntent, type TradingIntent, type TradingModelNormalizationOptions } from './model.js';
export declare const TradingLayerChangeKind: Readonly<{
    readonly Orders: 'orders';
    readonly Positions: 'positions';
    readonly Executions: 'executions';
    readonly Quote: 'quote';
}>;
export type TradingLayerChangeKind = typeof TradingLayerChangeKind[keyof typeof TradingLayerChangeKind];
export declare const TradingIntentOutcomeStatus: Readonly<{
    readonly Accepted: 'accepted';
    readonly Rejected: 'rejected';
}>;
export type TradingIntentOutcomeStatus = typeof TradingIntentOutcomeStatus[keyof typeof TradingIntentOutcomeStatus];
export interface TradingLayerOptions extends TradingModelNormalizationOptions {
    /** Injectable Unix-seconds clock for deterministic hosts/tests. */
    readonly clock?: () => Time;
    /** Injectable stable request id factory. Sequence starts at one per layer. */
    readonly intentIdFactory?: (sequence: number) => string;
}
export interface TradingEntityUpdate<TEntity> {
    readonly previous: TEntity;
    readonly current: TEntity;
}
export interface TradingCollectionChange<TEntity, TKind extends TradingLayerChangeKind> {
    readonly kind: TKind;
    readonly version: number;
    readonly added: readonly TEntity[];
    readonly updated: readonly TradingEntityUpdate<TEntity>[];
    readonly removed: readonly TEntity[];
    /** True when stable ids are identical but their host-defined display order changed. */
    readonly orderChanged: boolean;
}
export type TradingOrdersChange = TradingCollectionChange<ChartOrder, typeof TradingLayerChangeKind.Orders>;
export type TradingPositionsChange = TradingCollectionChange<ChartPosition, typeof TradingLayerChangeKind.Positions>;
export type TradingExecutionsChange = TradingCollectionChange<ChartExecution, typeof TradingLayerChangeKind.Executions>;
export interface TradingQuoteChange {
    readonly kind: typeof TradingLayerChangeKind.Quote;
    readonly version: number;
    readonly previous: ChartQuote | null;
    readonly current: ChartQuote | null;
}
export type TradingLayerChange = TradingOrdersChange | TradingPositionsChange | TradingExecutionsChange | TradingQuoteChange;
export interface TradingLayerSnapshot {
    readonly version: number;
    readonly orders: readonly ChartOrder[];
    readonly positions: readonly ChartPosition[];
    readonly executions: readonly ChartExecution[];
    readonly quote: ChartQuote | null;
}
export interface TradingIntentResolution {
    readonly intentId: string;
    readonly status: TradingIntentOutcomeStatus;
    readonly reason?: string;
}
export interface TradingIntentOutcome extends TradingIntentResolution {
    readonly intent: TradingIntent;
}
export interface ITradingLayer {
    setOrders(orders: readonly ChartOrder[]): void;
    setPositions(positions: readonly ChartPosition[]): void;
    setExecutions(executions: readonly ChartExecution[]): void;
    setQuote(quote: ChartQuote | null): void;
    state(): TradingLayerSnapshot;
    normalizationOptions(): TradingModelNormalizationOptions;
    subscribeChanges(handler: (change: TradingLayerChange) => void): Unsubscribe;
    subscribeIntents(handler: (intent: TradingIntent) => void): Unsubscribe;
    subscribeIntentOutcomes(handler: (outcome: TradingIntentOutcome) => void): Unsubscribe;
    pendingIntents(): readonly TradingIntent[];
    resolveIntent(resolution: TradingIntentResolution): void;
    requestPlaceOrder(order: ChartOrderRequest): PlaceOrderIntent;
    requestModifyOrder(orderId: string, changes: ChartOrderModification): ModifyOrderIntent;
    requestCancelOrder(orderId: string): CancelOrderIntent;
    requestClosePosition(positionId: string, quantity?: number): ClosePositionIntent;
    requestReversePosition(positionId: string, quantity?: number): ReversePositionIntent;
    requestCreateStopLoss(positionId: string, price: number, quantity?: number): CreateStopLossIntent;
    requestEditStopLoss(orderId: string, price: number, quantity?: number): EditStopLossIntent;
    requestRemoveStopLoss(orderId: string): RemoveStopLossIntent;
    requestCreateTakeProfit(positionId: string, price: number, quantity?: number): CreateTakeProfitIntent;
    requestEditTakeProfit(orderId: string, price: number, quantity?: number): EditTakeProfitIntent;
    requestRemoveTakeProfit(orderId: string): RemoveTakeProfitIntent;
    dispose(): void;
}
/**
 * Owns only normalized presentation state and user intents. It has no transport, account,
 * connector or retry dependency; the host remains the sole owner of broker communication.
 */
export declare class TradingLayer implements ITradingLayer {
    private readonly modelOptions;
    private readonly clock;
    private readonly intentIdFactory;
    private readonly changeHandlers;
    private readonly intentHandlers;
    private readonly outcomeHandlers;
    private readonly pendingIntentMap;
    private ordersValue;
    private positionsValue;
    private executionsValue;
    private quoteValue;
    private snapshotValue;
    private versionValue;
    private intentSequence;
    private disposed;
    constructor(options: TradingLayerOptions);
    setOrders(values: readonly ChartOrder[]): void;
    setPositions(values: readonly ChartPosition[]): void;
    setExecutions(values: readonly ChartExecution[]): void;
    setQuote(value: ChartQuote | null): void;
    state(): TradingLayerSnapshot;
    normalizationOptions(): TradingModelNormalizationOptions;
    subscribeChanges(handler: (change: TradingLayerChange) => void): Unsubscribe;
    subscribeIntents(handler: (intent: TradingIntent) => void): Unsubscribe;
    subscribeIntentOutcomes(handler: (outcome: TradingIntentOutcome) => void): Unsubscribe;
    pendingIntents(): readonly TradingIntent[];
    resolveIntent(resolution: TradingIntentResolution): void;
    requestPlaceOrder(order: ChartOrderRequest): PlaceOrderIntent;
    requestModifyOrder(orderId: string, changes: ChartOrderModification): ModifyOrderIntent;
    requestCancelOrder(orderId: string): CancelOrderIntent;
    requestClosePosition(positionId: string, quantity?: number): ClosePositionIntent;
    requestReversePosition(positionId: string, quantity?: number): ReversePositionIntent;
    requestCreateStopLoss(positionId: string, price: number, quantity?: number): CreateStopLossIntent;
    requestEditStopLoss(orderId: string, price: number, quantity?: number): EditStopLossIntent;
    requestRemoveStopLoss(orderId: string): RemoveStopLossIntent;
    requestCreateTakeProfit(positionId: string, price: number, quantity?: number): CreateTakeProfitIntent;
    requestEditTakeProfit(orderId: string, price: number, quantity?: number): EditTakeProfitIntent;
    requestRemoveTakeProfit(orderId: string): RemoveTakeProfitIntent;
    dispose(): void;
    private requestCreateProtection;
    private requestEditProtection;
    private requestRemoveProtection;
    private assertProtectionRole;
    private editableOrder;
    private cancelableOrder;
    private requireOrder;
    private positionWithPermission;
    private intentBase;
    private publish;
    private advanceVersion;
    private makeSnapshot;
    private emitChange;
    private assertActive;
}

// Public API module: trading/trading-order-placement-adapter.d.ts
import type { IChartApi, OrderPlace, OrderPlacementOptions } from '../core/chart-api.js';
import { ChartOrderTimeInForce, ChartOrderType, type TradingSide as TradingSideValue } from './model.js';
import type { ITradingLayer } from './trading-layer.js';
export type TradingPlacementOrderType = typeof ChartOrderType.Limit | typeof ChartOrderType.Stop;
export type TradingPlacementSideResolver = (event: Readonly<OrderPlace>) => TradingSideValue | null;
export interface TradingOrderPlacementAdapterOptions {
    readonly quantity: number;
    readonly orderType?: TradingPlacementOrderType;
    readonly timeInForce?: ChartOrderTimeInForce;
    readonly modifier?: OrderPlacementOptions['modifier'];
    readonly color?: string;
    readonly title?: string;
    readonly sideResolver?: TradingPlacementSideResolver;
    readonly enabled?: boolean;
}
export type TradingOrderPlacementAdapterOptionsPatch = Partial<TradingOrderPlacementAdapterOptions>;
export interface ResolvedTradingOrderPlacementAdapterOptions {
    readonly quantity: number;
    readonly orderType: TradingPlacementOrderType;
    readonly timeInForce: ChartOrderTimeInForce;
    readonly modifier: NonNullable<OrderPlacementOptions['modifier']>;
    readonly color: string;
    readonly title: string;
    readonly sideResolver: TradingPlacementSideResolver;
    readonly enabled: boolean;
}
/**
 * Compatibility bridge: consumes the existing chart placement signal and emits a TradingLayer
 * intent. It never creates a price line or communicates with a broker by itself.
 */
export declare class TradingOrderPlacementAdapter {
    private readonly chart;
    private readonly layer;
    private readonly model;
    private disposed;
    private readonly listener;
    constructor(chart: IChartApi, layer: ITradingLayer, options: TradingOrderPlacementAdapterOptions);
    options(): ResolvedTradingOrderPlacementAdapterOptions;
    applyOptions(patch: TradingOrderPlacementAdapterOptionsPatch): void;
    setEnabled(enabled: boolean): void;
    dispose(): void;
    private handlePlacement;
    private applyPlacementMode;
    private assertActive;
}

// Public API module: workspace/chart-navigator.d.ts
import type { IChartApi, Time, TimeRange, TimedSeriesData } from '../core/chart-api.js';
import { type ChartDataControllerListener, type ChartDataControllerSnapshot } from '../data/chart-data-controller.js';
export declare const NavigatorStatus: Readonly<{
    readonly Idle: 'idle';
    readonly Loading: 'loading';
    readonly Ready: 'ready';
    readonly Error: 'error';
}>;
export type NavigatorStatus = typeof NavigatorStatus[keyof typeof NavigatorStatus];
export declare const NavigatorRangePreset: Readonly<{
    readonly OneDay: '1d';
    readonly FiveDays: '5d';
    readonly OneMonth: '1m';
    readonly ThreeMonths: '3m';
    readonly SixMonths: '6m';
    readonly YearToDate: 'ytd';
    readonly OneYear: '1y';
    readonly FiveYears: '5y';
    readonly All: 'all';
}>;
export type NavigatorRangePreset = typeof NavigatorRangePreset[keyof typeof NavigatorRangePreset];
export declare const NavigatorDateAlignment: Readonly<{
    readonly Start: 'start';
    readonly Center: 'center';
    readonly End: 'end';
}>;
export type NavigatorDateAlignment = typeof NavigatorDateAlignment[keyof typeof NavigatorDateAlignment];
export declare const NavigatorNavigationOutcome: Readonly<{
    readonly Applied: 'applied';
    readonly Clamped: 'clamped';
    readonly PageLimit: 'page-limit';
    readonly Empty: 'empty';
    readonly Cancelled: 'cancelled';
}>;
export type NavigatorNavigationOutcome = typeof NavigatorNavigationOutcome[keyof typeof NavigatorNavigationOutcome];
export interface NavigatorBounds {
    readonly from: Time;
    readonly to: Time;
    readonly count: number;
}
export interface NavigatorSample {
    readonly from: Time;
    readonly to: Time;
    readonly open: number | null;
    readonly high: number | null;
    readonly low: number | null;
    readonly close: number | null;
    readonly count: number;
}
export interface NavigatorValue {
    readonly value: number;
    readonly high?: number;
    readonly low?: number;
}
export type NavigatorValueAccessor<TBar extends TimedSeriesData> = (bar: TBar) => number | NavigatorValue | null;
export interface NavigatorPresetContext {
    readonly anchor: Time;
    readonly bounds: NavigatorBounds;
    readonly data: ChartDataControllerSnapshot;
}
export interface NavigatorPresetDefinition {
    readonly id: string;
    readonly label: string;
    /** Null means the complete available history. */
    readonly range: (context: NavigatorPresetContext) => TimeRange | null;
}
export interface NavigatorDataController<TBar extends TimedSeriesData> {
    snapshot(): ChartDataControllerSnapshot;
    /** Half-open raw-data window [fromIndex, toIndex). */
    rawDataSlice(fromIndex?: number, toIndex?: number): readonly TBar[];
    loadMoreBefore(): Promise<number>;
    subscribe(listener: ChartDataControllerListener): void;
    unsubscribe(listener: ChartDataControllerListener): void;
}
export interface ChartNavigatorOptions<TBar extends TimedSeriesData> {
    readonly chart: IChartApi;
    readonly data: NavigatorDataController<TBar>;
    readonly valueAccessor?: NavigatorValueAccessor<TBar>;
    /** Maximum number of immutable overview buckets. Defaults to 600. */
    readonly maxPoints?: number;
    /** Safety limit for one range/date operation. Defaults to 100 history pages. */
    readonly maxHistoryPages?: number;
    /** Replaces the built-in preset list when supplied. */
    readonly presets?: readonly NavigatorPresetDefinition[];
}
export interface NavigatorHistoryOptions {
    readonly maxHistoryPages?: number;
}
export interface NavigatorGoToDateOptions extends NavigatorHistoryOptions {
    /** Visible time span in seconds. The current chart span is used by default. */
    readonly spanSeconds?: number;
    readonly alignment?: NavigatorDateAlignment;
}
export interface NavigatorNavigationResult {
    readonly outcome: NavigatorNavigationOutcome;
    readonly requestedRange: TimeRange | null;
    readonly requestedTime: Time | null;
    readonly visibleRange: TimeRange | null;
    readonly presetId: string | null;
    readonly pagesLoaded: number;
    readonly barsLoaded: number;
    readonly historyExhausted: boolean;
}
export interface ChartNavigatorSnapshot {
    readonly status: NavigatorStatus;
    readonly dataStatus: ChartDataControllerSnapshot['status'];
    readonly generation: number;
    readonly loading: boolean;
    readonly bounds: NavigatorBounds | null;
    readonly visibleRange: TimeRange | null;
    readonly activePresetId: string | null;
    readonly pendingPresetId: string | null;
    readonly samples: readonly NavigatorSample[];
    readonly lastNavigation: NavigatorNavigationResult | null;
    readonly error: unknown | null;
}
export type ChartNavigatorListener = (snapshot: ChartNavigatorSnapshot) => void;
/** Built-in UTC-calendar presets. Supply custom definitions for exchange-specific boundaries. */
export declare function defaultNavigatorPresets(): readonly NavigatorPresetDefinition[];
/**
 * DOM-neutral chart navigator. It owns range/preset/date navigation and exposes a bounded
 * min/max overview model; the host remains free to render it with canvas, SVG or native UI.
 */
export declare class ChartNavigator<TBar extends TimedSeriesData> {
    private readonly chart;
    private readonly data;
    private readonly valueAccessor;
    private readonly maxPoints;
    private readonly maxHistoryPages;
    private readonly presetValues;
    private readonly presetsById;
    private readonly listeners;
    private dataState;
    private boundsValue;
    private visibleRangeValue;
    private samplesValue;
    private activePresetIdValue;
    private pendingPresetIdValue;
    private lastNavigationValue;
    private operationError;
    private samplingError;
    private operationId;
    private loading;
    private applyingRange;
    private overviewDirty;
    private sampledGeneration;
    private sampledLength;
    private sampledFirstTime;
    private sampledBucketSize;
    private disposed;
    private readonly dataListener;
    private readonly rangeListener;
    constructor(options: ChartNavigatorOptions<TBar>);
    snapshot(): ChartNavigatorSnapshot;
    presets(): readonly NavigatorPresetDefinition[];
    setRange(range: TimeRange, options?: NavigatorHistoryOptions): Promise<NavigatorNavigationResult>;
    selectPreset(presetId: string, options?: NavigatorHistoryOptions): Promise<NavigatorNavigationResult>;
    goToDate(time: Time, options?: NavigatorGoToDateOptions): Promise<NavigatorNavigationResult>;
    cancel(): boolean;
    clearError(): void;
    subscribe(listener: ChartNavigatorListener): void;
    unsubscribe(listener: ChartNavigatorListener): void;
    dispose(): void;
    private navigate;
    private applyNavigationRange;
    private needsOlderHistory;
    private operationCurrent;
    private cancelledResult;
    private handleData;
    private acceptDataSnapshot;
    private handleRange;
    private cancelActiveOperation;
    private refreshData;
    private readBounds;
    private refreshOverviewIfDirty;
    private refreshOverview;
    private defaultDateSpan;
    private navigationPageLimit;
    private snapshotValue;
    private emit;
    private assertAlive;
}

// Public API module: workspace/compare-controller.d.ts
import { type IChartApi, type ISeriesApi, type LineData, type SeriesOptions, type Time, type TimedSeriesData } from '../core/chart-api.js';
import { type ChartDataControllerSnapshot } from '../data/chart-data-controller.js';
import type { IChartDataSource, SymbolInfo } from '../data/data-source.js';
import type { RealtimeReconnectPolicy, RealtimeScheduler } from '../data/reconnect-policy.js';
export declare const CompareMode: Readonly<{
    readonly Percentage: 2;
    readonly IndexedTo100: 3;
}>;
export type CompareMode = typeof CompareMode[keyof typeof CompareMode];
export declare const CompareAlignment: Readonly<{
    /** Keep the chart's existing continuous/ordinal/session-aware time domain. */
    readonly Chart: 'chart';
    /** Project every absolute timestamp through the primary symbol's exchange calendar. */
    readonly PrimarySession: 'primary-session';
}>;
export type CompareAlignment = typeof CompareAlignment[keyof typeof CompareAlignment];
export interface CompareDataOptions {
    readonly initialCount?: number;
    readonly historyCount?: number;
    readonly historyPrefetchThreshold?: number;
    readonly autoPrefetch?: boolean;
    readonly lodCacheSize?: number;
    readonly autoScrollRealtime?: boolean;
    readonly reconnectPolicy?: RealtimeReconnectPolicy;
    readonly realtimeScheduler?: RealtimeScheduler;
}
export type CompareValueAccessor<TBar extends TimedSeriesData> = (bar: TBar) => number | null;
export interface CompareControllerOptions<TBar extends TimedSeriesData> {
    readonly chart: IChartApi;
    readonly dataSource: IChartDataSource<TBar>;
    readonly valueAccessor?: CompareValueAccessor<TBar>;
    readonly scaleId?: string;
    readonly mode?: CompareMode;
    readonly alignment?: CompareAlignment;
    readonly colors?: readonly string[];
    readonly seriesOptions?: Partial<SeriesOptions>;
    readonly data?: CompareDataOptions;
}
export interface CompareAddRequest {
    readonly id?: string;
    readonly symbol: string;
    readonly resolution: string;
    readonly label?: string;
    readonly color?: string;
    readonly visible?: boolean;
    readonly primary?: boolean;
}
export interface CompareInstrumentSnapshot {
    readonly id: string;
    readonly symbol: string;
    readonly resolution: string;
    readonly label: string;
    readonly color: string;
    readonly visible: boolean;
    readonly primary: boolean;
    readonly status: ChartDataControllerSnapshot['status'];
    readonly realtimeStatus: ChartDataControllerSnapshot['realtimeStatus'];
    readonly symbolInfo: SymbolInfo | null;
    readonly loadedBars: number;
    readonly renderedBars: number;
    readonly lastValue: number | null;
    /** Current load, realtime or history failure, in that priority order. */
    readonly error: unknown | null;
}
export interface CompareLegendItem {
    readonly id: string;
    readonly symbol: string;
    readonly label: string;
    readonly color: string;
    readonly time: Time | null;
    readonly rawValue: number | null;
    readonly changePercent: number | null;
    readonly indexedTo100: number | null;
    /** Matches the controller's current Percentage/IndexedTo100 mode. */
    readonly displayValue: number | null;
}
export interface CompareControllerSnapshot {
    readonly mode: CompareMode;
    readonly alignment: CompareAlignment;
    readonly scaleId: string;
    readonly primaryId: string | null;
    readonly crosshairTime: Time | null;
    readonly instruments: readonly CompareInstrumentSnapshot[];
    readonly legend: readonly CompareLegendItem[];
}
export type CompareControllerListener = (snapshot: CompareControllerSnapshot) => void;
/**
 * Owns compare line series and one independent ChartDataController/subscription per symbol.
 * Relative normalization remains in the chart price scale, so zoom-dependent bases cannot drift
 * from rendering; this controller exposes the same bases for its legend.
 */
export declare class CompareController<TBar extends TimedSeriesData> {
    private readonly chart;
    private readonly dataSource;
    private readonly valueAccessor;
    private readonly scaleIdValue;
    private readonly colors;
    private readonly seriesOptions;
    private readonly dataOptions;
    private readonly entries;
    private readonly listeners;
    private readonly originalTimeScale;
    private readonly originalScaleMode;
    private modeValue;
    private alignmentValue;
    private primaryIdValue;
    private crosshairTimeValue;
    private alignedCalendar;
    private nextColor;
    private disposed;
    private readonly handleCrosshair;
    constructor(options: CompareControllerOptions<TBar>);
    snapshot(): CompareControllerSnapshot;
    instruments(): readonly CompareInstrumentSnapshot[];
    get(id: string): CompareInstrumentSnapshot | undefined;
    series(id: string): ISeriesApi<LineData, SeriesOptions> | undefined;
    /** A failed initial load remains in Error state so a workspace can expose retry/remove. */
    add(request: CompareAddRequest): Promise<CompareInstrumentSnapshot>;
    remove(id: string): boolean;
    setPrimary(id: string): void;
    setMode(mode: CompareMode): void;
    setAlignment(alignment: CompareAlignment): void;
    setColor(id: string, color: string): void;
    setVisible(id: string, visible: boolean): void;
    reload(id: string): Promise<SymbolInfo | null>;
    loadMoreBefore(id: string): Promise<number>;
    legend(time?: Time | null): readonly CompareLegendItem[];
    subscribe(listener: CompareControllerListener): void;
    unsubscribe(listener: CompareControllerListener): void;
    dispose(): void;
    private snapshotValue;
    private buildLegend;
    private instrumentSnapshot;
    private label;
    private applyScaleMode;
    private applyAlignment;
    private restoreAlignment;
    private requireEntry;
    private availableId;
    private emit;
    private assertAlive;
}

// Public API module: workspace/index.d.ts
export * from './pane-controller.js';
export * from './indicator-controller.js';
export * from './indicator-catalog-controller.js';
export * from './templates.js';
export * from './compare-controller.js';
export * from './multi-chart-workspace.js';
export * from './chart-navigator.js';

// Public API module: workspace/indicator-catalog-controller.d.ts
export type IndicatorCatalogMaybePromise<T> = T | Promise<T>;
export interface IndicatorCatalogEntry {
    readonly id: string;
    readonly name: string;
    readonly fullName: string;
    /** Stable category id, for example `support-resistance`. */
    readonly category: string;
    /** User-facing category label, for example `Support & Resistance`. */
    readonly categoryLabel: string;
    readonly aliases?: readonly string[];
}
export interface IndicatorCatalogQuery {
    readonly text?: string;
    /** Matches either the stable category id or its label. */
    readonly category?: string;
    readonly favoritesOnly?: boolean;
}
/** Host-owned preference storage. The host decides scope and storage technology. */
export interface IndicatorFavoritesStorage {
    load(): IndicatorCatalogMaybePromise<readonly string[] | null>;
    save(indicatorIds: readonly string[]): IndicatorCatalogMaybePromise<void>;
}
export interface IndicatorCatalogControllerOptions {
    readonly entries: readonly IndicatorCatalogEntry[];
    readonly favorites?: readonly string[];
    readonly storage?: IndicatorFavoritesStorage;
}
export interface IndicatorCatalogSnapshot {
    readonly favorites: readonly string[];
    readonly loaded: boolean;
}
export type IndicatorCatalogListener = (snapshot: IndicatorCatalogSnapshot) => void;
/** Searchable indicator catalog with host-persisted, catalog-scoped favorites. */
export declare class IndicatorCatalogController {
    private readonly indexed;
    private readonly byId;
    private readonly favoriteIds;
    private readonly listeners;
    private readonly storage?;
    private loadPromise;
    private saveTail;
    private loadingOverrides;
    private loaded;
    constructor(options: IndicatorCatalogControllerOptions);
    entries(): readonly IndicatorCatalogEntry[];
    search(query?: IndicatorCatalogQuery): readonly IndicatorCatalogEntry[];
    isFavorite(indicatorId: string): boolean;
    favorites(): readonly string[];
    snapshot(): IndicatorCatalogSnapshot;
    subscribe(listener: IndicatorCatalogListener): void;
    unsubscribe(listener: IndicatorCatalogListener): void;
    loadFavorites(): Promise<readonly string[]>;
    setFavorite(indicatorId: string, favorite: boolean): Promise<void>;
    toggleFavorite(indicatorId: string): Promise<boolean>;
    private requireId;
    private replaceFavorites;
    private normalizeFavoriteIds;
    private persist;
    private emit;
}

// Public API module: workspace/indicator-controller.d.ts
import type { ICommandStack } from '../core/interaction/command-stack.js';
import { type IndicatorDefinition, type IndicatorInputSchema, type IndicatorOutputAppearance, type IndicatorOutputStylePatch, type IndicatorParameterDefinition, type IndicatorParameters, type IndicatorParameterValue, type IndicatorSource, type IndicatorSourceStatus } from '@stocksharp/indicators';
export interface IndicatorControllerEngineEntry {
    readonly id: string | number;
    readonly persistenceId: string;
    readonly type: string;
    readonly params: Readonly<Record<string, unknown>>;
    readonly paneId: string | null;
    readonly paneScaleId?: string;
    readonly priceScaleId?: string;
    readonly outputNames?: readonly string[];
    readonly source?: IndicatorSource;
    readonly visible?: boolean;
    readonly definition?: IndicatorDefinition;
}
/** Minimal synchronous engine contract consumed by the public workspace facade. */
export interface IndicatorControllerEngine {
    getIndicators(): readonly IndicatorControllerEngineEntry[];
    replaceParams(id: string | number, parameters: Readonly<Record<string, unknown>>): IndicatorControllerEngineEntry | null | undefined;
    setSource(id: string | number, source: IndicatorSource): boolean;
    getSourceStatus(id: string | number): IndicatorSourceStatus | null;
    move(id: string | number, paneId: string): boolean;
    setScale(id: string | number, priceScaleId: string | null): boolean;
    setOutputStyle(id: string | number, outputId: string, patch: IndicatorOutputStylePatch): boolean;
    setVisible(id: string | number, visible: boolean): boolean;
    getStyles(id: string | number): Readonly<Record<string, Readonly<Record<string, unknown>>>> | null;
    getOutputStyles(id: string | number): Readonly<Record<string, IndicatorOutputAppearance>> | null;
    replaceStyles(id: string | number, styles: Readonly<Record<string, unknown>>): boolean;
    subscribeChange(listener: () => void): void;
    unsubscribeChange(listener: () => void): void;
}
export interface IndicatorControllerOptions {
    readonly engine: IndicatorControllerEngine;
    readonly commandStack: ICommandStack;
}
export interface IndicatorOutputSnapshot {
    readonly id: string;
    readonly name: string;
    readonly style: IndicatorOutputAppearance;
}
export interface IndicatorControllerSnapshot {
    /** Stable layout id. Runtime ids are intentionally not exposed. */
    readonly id: string;
    readonly type: string;
    readonly name: string;
    readonly description: string;
    readonly input: IndicatorInputSchema | null;
    readonly parameterDefinitions: readonly IndicatorParameterDefinition[];
    readonly parameters: IndicatorParameters;
    readonly source: IndicatorSource;
    readonly sourceStatus: IndicatorSourceStatus;
    readonly paneId: string | null;
    /** Explicit selection; null means automatic routing. */
    readonly priceScaleId: string | null;
    readonly effectivePriceScaleId: string;
    readonly visible: boolean;
    readonly outputs: readonly IndicatorOutputSnapshot[];
}
export interface IndicatorUpdatePatch {
    /** Partial parameter patch; omitted values retain their current value. */
    readonly parameters?: Readonly<Record<string, IndicatorParameterValue>>;
    readonly source?: IndicatorSource;
    /** Null moves to the main pane. The target pane must already exist. */
    readonly paneId?: string | null;
    /** Null returns to automatic scale routing. */
    readonly priceScaleId?: string | null;
    readonly visible?: boolean;
    readonly outputs?: Readonly<Record<string, IndicatorOutputStylePatch>>;
}
export type IndicatorControllerListener = (indicators: readonly IndicatorControllerSnapshot[]) => void;
/** Undoable, validated editing facade over transient indicator-engine records. */
export declare class IndicatorController {
    private readonly engine;
    private readonly commands;
    private readonly listeners;
    private applying;
    private disposed;
    private readonly handleEngineChange;
    constructor(options: IndicatorControllerOptions);
    indicators(): readonly IndicatorControllerSnapshot[];
    get(id: string): IndicatorControllerSnapshot | undefined;
    update(id: string, patch: IndicatorUpdatePatch): IndicatorControllerSnapshot;
    setParameters(id: string, parameters: Readonly<Record<string, IndicatorParameterValue>>): IndicatorControllerSnapshot;
    setSource(id: string, source: IndicatorSource): IndicatorControllerSnapshot;
    moveToPane(id: string, paneId: string | null): IndicatorControllerSnapshot;
    setPriceScale(id: string, priceScaleId: string | null): IndicatorControllerSnapshot;
    setVisible(id: string, visible: boolean): IndicatorControllerSnapshot;
    setOutputStyle(id: string, outputId: string, patch: IndicatorOutputStylePatch): IndicatorControllerSnapshot;
    subscribe(listener: IndicatorControllerListener): void;
    unsubscribe(listener: IndicatorControllerListener): void;
    dispose(): void;
    private snapshot;
    private captureState;
    private applyPatch;
    private applyStateAtomically;
    private applyState;
    private mutateAtomically;
    private replaceParameters;
    private move;
    private setScale;
    private setVisibility;
    private findEntry;
    private requireEntry;
    private emit;
    private assertAlive;
}

// Public API module: workspace/multi-chart-workspace.d.ts
import type { IChartApi, Time, TimeRange } from '../core/chart-api.js';
import type { ChartDataSelection } from '../data/chart-data-controller.js';
export type WorkspaceMaybePromise<T> = T | Promise<T>;
export interface WorkspaceSelectionSnapshot {
    readonly selection: ChartDataSelection | null;
}
/** Structural subset implemented directly by ChartDataController. */
export interface WorkspaceSelectionController {
    snapshot(): WorkspaceSelectionSnapshot;
    setSelection(selection: ChartDataSelection): WorkspaceMaybePromise<unknown>;
    subscribe(listener: (snapshot: WorkspaceSelectionSnapshot) => void): void;
    unsubscribe(listener: (snapshot: WorkspaceSelectionSnapshot) => void): void;
}
export interface WorkspaceChartCell {
    readonly chart: IChartApi;
    readonly data?: WorkspaceSelectionController;
    /** Defaults to chart.remove(). */
    readonly dispose?: () => void;
}
export interface WorkspaceChartFactoryContext {
    readonly id: string;
    readonly index: number;
    readonly host: HTMLElement;
}
export type WorkspaceChartFactory = (context: WorkspaceChartFactoryContext) => WorkspaceChartCell;
export interface WorkspaceLinkOptions {
    readonly symbol?: boolean;
    readonly resolution?: boolean;
}
export interface WorkspaceSyncOptions {
    readonly range?: boolean;
    readonly crosshair?: boolean;
}
export interface MultiChartWorkspaceOptions {
    readonly container: HTMLElement;
    readonly createChart: WorkspaceChartFactory;
    readonly count?: number;
    /** Null/undefined selects an automatic near-square grid. */
    readonly columns?: number | null;
    readonly links?: WorkspaceLinkOptions;
    readonly sync?: WorkspaceSyncOptions;
}
export interface WorkspaceLayoutRequest {
    readonly count: number;
    readonly columns?: number | null;
}
export interface WorkspaceCellSnapshot {
    readonly id: string;
    readonly index: number;
    readonly active: boolean;
    readonly selection: ChartDataSelection | null;
    readonly visibleRange: TimeRange | null;
    readonly crosshairTime: Time | null;
}
export declare const WorkspaceSyncErrorKind: Readonly<{
    readonly Selection: 'selection';
    readonly Range: 'range';
    readonly Crosshair: 'crosshair';
    readonly Lifecycle: 'lifecycle';
}>;
export type WorkspaceSyncErrorKind = typeof WorkspaceSyncErrorKind[keyof typeof WorkspaceSyncErrorKind];
export interface WorkspaceSyncError {
    readonly cellId: string;
    readonly kind: WorkspaceSyncErrorKind;
    readonly error: unknown;
}
export interface MultiChartWorkspaceSnapshot {
    readonly count: number;
    readonly columns: number;
    readonly rows: number;
    readonly activeId: string;
    readonly links: Readonly<{
        symbol: boolean;
        resolution: boolean;
    }>;
    readonly sync: Readonly<{
        range: boolean;
        crosshair: boolean;
    }>;
    readonly cells: readonly WorkspaceCellSnapshot[];
    readonly errors: readonly WorkspaceSyncError[];
}
export type MultiChartWorkspaceListener = (snapshot: MultiChartWorkspaceSnapshot) => void;
/**
 * Owns top-level chart cells only. A chart's indicator panes remain internal to that chart and
 * are never counted, laid out or synchronized as workspace cells.
 */
export declare class MultiChartWorkspace {
    private readonly container;
    private readonly factory;
    private readonly entries;
    private readonly listeners;
    private readonly errors;
    private readonly originalStyle;
    private columnsValue;
    private linksValue;
    private syncValue;
    private activeIdValue;
    private nextId;
    private syncingSelection;
    private syncingRange;
    private syncingCrosshair;
    private disposed;
    constructor(options: MultiChartWorkspaceOptions);
    snapshot(): MultiChartWorkspaceSnapshot;
    cells(): readonly WorkspaceCellSnapshot[];
    chart(id: string): IChartApi | undefined;
    host(id: string): HTMLElement | undefined;
    add(id?: string): WorkspaceCellSnapshot;
    remove(id: string): boolean;
    setCount(count: number): void;
    setColumns(columns: number | null): void;
    setLayout(layout: WorkspaceLayoutRequest): void;
    activate(id: string): void;
    setLinks(options: WorkspaceLinkOptions): void;
    setSync(options: WorkspaceSyncOptions): void;
    setSelection(id: string, selection: ChartDataSelection): Promise<unknown>;
    clearErrors(): void;
    subscribe(listener: MultiChartWorkspaceListener): void;
    unsubscribe(listener: MultiChartWorkspaceListener): void;
    dispose(): void;
    private resize;
    private createEntry;
    private disposeEntry;
    private disposeEntries;
    private handleSelection;
    private propagateSelection;
    private handleRange;
    private propagateRange;
    private handleCrosshair;
    private propagateCrosshair;
    private applyLayout;
    private restoreContainerStyle;
    private actualColumns;
    private reindex;
    private cellSnapshots;
    private cellSnapshot;
    private snapshotValue;
    private createId;
    private find;
    private indexOf;
    private requireEntry;
    private readSelection;
    private recordError;
    private emit;
    private assertAlive;
}

// Public API module: workspace/pane-controller.d.ts
import type { IChartApi, ISeriesApi } from '../core/chart-api.js';
import type { ICommandStack } from '../core/interaction/command-stack.js';
import type { PaneState } from '../core/model/pane-model.js';
export interface PaneControllerOptions {
    readonly chart: IChartApi;
    /** Defaults to the chart's shared command stack. */
    readonly commands?: ICommandStack;
}
export interface PaneControllerSnapshot {
    readonly id: string;
    readonly height: number;
    readonly minHeight: number;
    readonly order: number;
    readonly state: PaneState;
}
export type PaneControllerListener = (panes: readonly PaneControllerSnapshot[]) => void;
/** Undoable pane sizing, ordering and visibility state without recreating pane contents. */
export declare class PaneController {
    private readonly chart;
    private readonly commands;
    private readonly listeners;
    private disposed;
    constructor(options: PaneControllerOptions);
    panes(): readonly PaneControllerSnapshot[];
    resizePair(beforePaneId: string, afterPaneId: string, delta: number): boolean;
    reorder(paneIdValue: string, targetIndex: number): boolean;
    moveSeries(series: ISeriesApi, targetPaneId: string): boolean;
    setState(paneIdValue: string, state: PaneState): boolean;
    toggleMinimized(paneIdValue: string): boolean;
    toggleMaximized(paneIdValue: string): boolean;
    subscribe(listener: PaneControllerListener): void;
    unsubscribe(listener: PaneControllerListener): void;
    dispose(): void;
    private execute;
    private apply;
    private applySeriesMove;
    private notify;
    private requirePane;
    private assertAlive;
}

// Public API module: workspace/templates.d.ts
import type { LineStyleValue } from '../core/chart-api.js';
import { type IndicatorCandleFieldSource, type IndicatorCandlesSource, type IndicatorParameterValue } from '@stocksharp/indicators';
import type { IndicatorControllerSnapshot, IndicatorUpdatePatch } from './indicator-controller.js';
export declare const INDICATOR_TEMPLATE_SCHEMA_VERSION: 1;
export type IndicatorTemplateSource = IndicatorCandlesSource | IndicatorCandleFieldSource;
export interface IndicatorTemplateOutputStyle {
    readonly color?: string;
    readonly lineWidth: number | null;
    readonly lineStyle: LineStyleValue | null;
    readonly visible: boolean;
    readonly precision: number | null;
}
export interface IndicatorTemplateV1 {
    readonly schemaVersion: typeof INDICATOR_TEMPLATE_SCHEMA_VERSION;
    readonly id: string;
    readonly name: string;
    readonly indicatorType: string;
    readonly parameters: Readonly<Record<string, IndicatorParameterValue>>;
    /** Null means a runtime indicator-output source was intentionally not captured. */
    readonly source: IndicatorTemplateSource | null;
    readonly visible: boolean;
    readonly outputs: Readonly<Record<string, IndicatorTemplateOutputStyle>>;
}
export interface IndicatorTemplateDocumentV1 {
    readonly schemaVersion: typeof INDICATOR_TEMPLATE_SCHEMA_VERSION;
    readonly templates: readonly IndicatorTemplateV1[];
}
export interface IndicatorTemplateStorage {
    load(): string | null | Promise<string | null>;
    save(serialized: string): void | Promise<void>;
}
export interface IndicatorTemplateIndicatorController {
    get(indicatorId: string): IndicatorControllerSnapshot | undefined;
    update(indicatorId: string, patch: IndicatorUpdatePatch): IndicatorControllerSnapshot;
}
export interface IndicatorTemplateControllerOptions {
    readonly indicators: IndicatorTemplateIndicatorController;
    readonly storage?: IndicatorTemplateStorage;
    readonly createId?: () => string;
    readonly pretty?: boolean;
}
export interface IndicatorTemplateControllerSnapshot {
    readonly document: IndicatorTemplateDocumentV1;
    readonly loaded: boolean;
}
export type IndicatorTemplateListener = (snapshot: IndicatorTemplateControllerSnapshot) => void;
export interface SerializeIndicatorTemplatesOptions {
    readonly pretty?: boolean;
}
/** Validates and serializes the versioned, portable indicator-template document. */
export declare function serializeIndicatorTemplates(value: IndicatorTemplateDocumentV1, options?: SerializeIndicatorTemplatesOptions): string;
/** Parses and validates a versioned indicator-template document. */
export declare function deserializeIndicatorTemplates(value: string | unknown): IndicatorTemplateDocumentV1;
export declare function normalizeIndicatorTemplateDocument(value: unknown): IndicatorTemplateDocumentV1;
/** CRUD, persistence and undoable application of portable indicator templates. */
export declare class IndicatorTemplateController {
    private readonly indicators;
    private readonly storage?;
    private readonly createIdValue;
    private readonly pretty;
    private readonly values;
    private readonly listeners;
    private loadPromise;
    private saveTail;
    private loadingMutations;
    private loaded;
    constructor(options: IndicatorTemplateControllerOptions);
    templates(indicatorType?: string): readonly IndicatorTemplateV1[];
    get(templateId: string): IndicatorTemplateV1 | undefined;
    document(): IndicatorTemplateDocumentV1;
    snapshot(): IndicatorTemplateControllerSnapshot;
    subscribe(listener: IndicatorTemplateListener): void;
    unsubscribe(listener: IndicatorTemplateListener): void;
    load(): Promise<IndicatorTemplateDocumentV1>;
    create(name: string, indicatorId: string): Promise<IndicatorTemplateV1>;
    replace(templateId: string, indicatorId: string, name?: string): Promise<IndicatorTemplateV1>;
    rename(templateId: string, name: string): Promise<IndicatorTemplateV1>;
    remove(templateId: string): Promise<boolean>;
    /** Applies calculation/source/appearance while deliberately preserving pane and scale. */
    apply(templateId: string, indicatorId: string): IndicatorControllerSnapshot;
    private requireIndicator;
    private requireTemplate;
    private nextId;
    private write;
    private persist;
    private emit;
}
