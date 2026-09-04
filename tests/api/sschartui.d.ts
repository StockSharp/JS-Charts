// Public API module: chart/ui.d.ts
export { createChartUi, inMemoryChartUiStorage, localChartUiStorage, } from './chart-ui.js';
export type { ChartUi, ChartUiChart, ChartUiOptions, ChartUiStorage, } from './chart-ui.js';
export { ChartLegend, fullscreenMenuLayer, } from './chart-legend.js';
export type { ChartLegendOptions, LegendBar, LegendChart, LegendChartType, LegendCrosshairParam, LegendIndicatorEngine, LegendIndicatorValue, LegendMenuLayer, LegendPaneHost, LegendSeriesData, } from './chart-legend.js';
export { ChartContextMenu, ChartContextMenuMode, ChartContextMenuTone, } from './chart-context-menu.js';
export type { ChartContextMenuChartOptions, ChartContextMenuContext, ChartContextMenuEntry, ChartContextMenuModeValue, ChartContextMenuOptions, ChartContextMenuPaneOptions, ChartContextMenuProvider, ChartContextMenuToneValue, PriceCoordinateSource, } from './chart-context-menu.js';
export { ChartType, ChartTypeSwitcher, allChartTypes, defaultChartTypePalette, isDerivedChartType, parseChartType, } from './chart-type-switcher.js';
export type { ChartSeriesChangedHandler, ChartTypePalette, ChartTypeSwitcherCandle, ChartTypeSwitcherOptions, ChartTypeValue, } from './chart-type-switcher.js';
export { ChartPaneManager } from './chart-pane-manager.js';
export type { ChartPaneManagerOptions } from './chart-pane-manager.js';
export { IndicatorDialog, createIndicatorCatalogController, } from './indicator-dialog.js';
export type { IndicatorDialogChart, IndicatorDialogEngine, IndicatorDialogEngineEntry, IndicatorDialogOptions, IndicatorDialogPane, } from './indicator-dialog.js';
export { consoleNotify, createPlainModalController, createTranslate, defaultChartFormatters, identityTranslate, standaloneHost, } from './chart-host.js';
export type { ChartFormatters, ChartUiHost, ModalController, NotificationKind, Notify, Translate, } from './chart-host.js';
export { IndicatorEngine, } from './indicators/indicator-engine.js';
export { IndicatorRenderer, } from './indicators/indicator-renderer.js';
export { IndicatorSettings, } from './indicators/indicator-settings.js';
export type { IndicatorPaneChart, IndicatorPaneHost, } from './indicators/pane-host.js';

// Public API module: chart/chart-context-menu.d.ts
import type { ChartUiHost } from './chart-host.js';
export interface PriceCoordinateSource {
    coordinateToPrice(coordinate: number): number | null;
}
export declare const ChartContextMenuTone: {
    readonly Neutral: 'neutral';
    readonly Positive: 'positive';
    readonly Negative: 'negative';
};
export type ChartContextMenuToneValue = typeof ChartContextMenuTone[keyof typeof ChartContextMenuTone];
export interface ChartContextMenuEntry {
    readonly key: string;
    readonly label: string;
    readonly icon?: string;
    readonly tone?: ChartContextMenuToneValue;
    readonly disabled?: boolean;
    invoke(): void;
}
export interface ChartContextMenuContext {
    readonly price: number | null;
    readonly priceText: string;
    readonly host: ChartUiHost;
}
export type ChartContextMenuProvider = (context: ChartContextMenuContext) => readonly (readonly ChartContextMenuEntry[])[];
export declare const ChartContextMenuMode: {
    readonly Chart: 'chart';
    readonly Pane: 'pane';
};
export type ChartContextMenuModeValue = typeof ChartContextMenuMode[keyof typeof ChartContextMenuMode];
interface ChartContextMenuOptionsBase {
    readonly host: ChartUiHost;
    readonly provideItems: ChartContextMenuProvider;
}
export interface ChartContextMenuChartOptions extends ChartContextMenuOptionsBase {
    readonly mode: typeof ChartContextMenuMode.Chart;
    readonly priceSource: PriceCoordinateSource;
}
export interface ChartContextMenuPaneOptions extends ChartContextMenuOptionsBase {
    readonly mode: typeof ChartContextMenuMode.Pane;
}
export type ChartContextMenuOptions = ChartContextMenuChartOptions | ChartContextMenuPaneOptions;
export declare class ChartContextMenu {
    _container: HTMLElement | null;
    _options: ChartContextMenuOptions | null;
    _priceSource: PriceCoordinateSource | null;
    _menuEl: HTMLDivElement | null;
    _onContextMenu: ((event: MouseEvent) => void) | null;
    _onDocumentClick: ((event: MouseEvent) => void) | null;
    _onEscape: ((event: KeyboardEvent) => void) | null;
    constructor();
    init(containerEl: HTMLElement, options: ChartContextMenuOptions): void;
    setPriceSource(source: PriceCoordinateSource | null): void;
    openAt(event: MouseEvent): void;
    close(): void;
    dispose(): void;
    _priceAt(clientY: number): number | null;
    _showMenu(x: number, y: number, price: number | null): void;
    _renderEntry(entry: ChartContextMenuEntry): HTMLButtonElement;
}
export {};

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
    /** Points the legend at the indicator engine whose values it prints. */
    setIndicatorEngine(engine: LegendIndicatorEngine | null): void;
    refresh(): void;
    _onCrosshairMove(param: LegendCrosshairParam): void;
    _renderOHLCV(candle: LegendBar): void;
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

// Public API module: chart/chart-pane-manager.d.ts
import type { ChartOptions, IChartApi, IPaneApi, ISeriesApi, PaneOptions, ResolvedPriceScaleOptions, SeriesDefinition, SeriesOptions, TimedSeriesData } from '../core/chart-api.js';
import { ChartContextMenu } from './chart-context-menu.js';
import type { ChartUiHost } from './chart-host.js';
/** Layout patch an engine pane accepts — every pane option except its id. */
type PaneLayoutPatch = Omit<PaneOptions, 'id'>;
/**
 * What the old sub-chart callers pass to `applyOptions`: usually a whole
 * chart-option bag (the terminal's theme switch hands the same object to the
 * main chart and to every pane), which is why the scale members keep their
 * chart-wide shape. Only the pane's own layout keys and the pane-local scale
 * margins are read; every other key is ignored.
 */
interface LegacyPaneChartOptions extends PaneLayoutPatch, Pick<ChartOptions, 'rightPriceScale' | 'leftPriceScale'> {
}
declare class LegacyPaneChartAdapter {
    private readonly owner;
    readonly nativePane: IPaneApi;
    constructor(owner: IChartApi, nativePane: IPaneApi);
    addSeries<TData extends TimedSeriesData, TOptions extends SeriesOptions = SeriesOptions>(definition: SeriesDefinition<TData, TOptions>, options?: Partial<TOptions>): ISeriesApi<TData, TOptions>;
    adoptSeries(series: ISeriesApi): void;
    removeSeries(series: ISeriesApi): void;
    priceScale(scaleId?: string): import("../index.js").IPriceScaleApi;
    timeScale(): import("../index.js").ITimeScaleApi;
    series(): readonly ISeriesApi<TimedSeriesData, SeriesOptions>[];
    id(): string;
    getSize(): import("../index.js").PaneSize;
    applyOptions(options?: LegacyPaneChartOptions): void;
    takeScreenshot(): HTMLCanvasElement;
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
export interface ChartPaneManagerOptions {
    readonly containerId: string;
    readonly host: ChartUiHost;
    onAddIndicatorToPane(paneId: string): void;
    onRemovePane(paneId: string): void;
}
/**
 * Chrome over the engine's native panes: HTML pane headers, per-pane context menus, pane-id
 * lookup and empty-pane restore. The engine owns pane rendering and scales; this class only adds
 * the DOM headers and menus on top and never re-implements pane logic.
 */
export declare class ChartPaneManager {
    _host: ChartUiHost;
    _onAddIndicatorToPane: (paneId: string) => void;
    _onRemovePane: (paneId: string) => void;
    _containerId: string;
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
    constructor(options: ChartPaneManagerOptions);
    init(mainChart: IChartApi | null): void;
    legendLayer(): HTMLElement | null;
    getPaneByMeasure(measure: string | null): string | null;
    addPane(label: string, measure: string | null, restoration?: PaneSnapshot | null): string | null;
    removePane(paneId: string): void;
    /** Recreates a recently emptied pane with the same native id and layout options. */
    restorePane(paneId: string): string | null;
    getChart(paneId: string): LegacyPaneChartAdapter | null;
    setPaneTitle(paneId: string, label: string): void;
    getValuesElement(paneId: string): HTMLElement | null;
    getPanes(): string[];
    resize(): void;
    _scheduleHeaderSync(): void;
    _syncHeaders(): void;
    dispose(): void;
}
export {};

// Public API module: chart/chart-type-switcher.d.ts
import { PointFigureDataRuntime, RenkoDataRuntime } from '../series/derived-data.js';
import type { CandlestickData, IChartApi, ISeriesApi } from '../core/chart-api.js';
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
export declare const ChartType: {
    readonly Candle: 'candle';
    readonly Bar: 'bar';
    readonly Line: 'line';
    readonly Area: 'area';
    readonly HeikinAshi: 'heikin';
    readonly Renko: 'renko';
    readonly PointFigure: 'pf';
};
/** One of the types `ChartType` names. */
export type ChartTypeValue = typeof ChartType[keyof typeof ChartType];
/** The whole vocabulary, for a page that offers all of it. */
export declare const allChartTypes: readonly ChartTypeValue[];
/**
 * Read a chart type out of a string the page kept for itself - a saved layout, a `data-` attribute
 * on a button - answering null when it names no type this module draws.
 */
export declare function parseChartType(value: string): ChartTypeValue | null;
/**
 * Whether the type redraws the source bars into bars of its own - Renko bricks, P&F columns.
 * Indicators then run over those rather than over the source, and there is no per-bar volume to
 * draw beneath them: both are the page's business, so it has to be able to ask.
 */
export declare function isDerivedChartType(type: ChartTypeValue): boolean;
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
export declare const defaultChartTypePalette: ChartTypePalette;
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
export declare class ChartTypeSwitcher {
    _chart: IChartApi;
    _host: ChartUiHost;
    _palette: ChartTypePalette;
    _availableTypes: readonly ChartTypeValue[];
    _currentSeries: ISeriesApi;
    _currentType: ChartTypeValue;
    _rawCandles: readonly ChartTypeSwitcherCandle[];
    _derivedRuntime: RenkoDataRuntime | PointFigureDataRuntime | null;
    _seriesChanged: ChartSeriesChangedHandler[];
    /** The last CLOSED bar - the only legitimate seed for the forming bar's open. */
    _closedHeikin: HeikinAshiBar | null;
    /** The bar being formed, so a tick replacing it is told apart from one opening the next. */
    _liveHeikin: HeikinAshiBar | null;
    constructor(options: ChartTypeSwitcherOptions);
    /**
     * The bars every type is drawn from. The array is held by reference, so a page that mutates
     * its live window in place gets the current window on the next switch without saying so again.
     */
    setRawCandles(candles: readonly ChartTypeSwitcherCandle[]): void;
    /**
     * Draw the source bars as `type` and hand back the series that draws them now, which is the
     * current one when the type is already drawn or is not among the ones this page offers.
     */
    switchType(type: ChartTypeValue): ISeriesApi;
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
    onSeriesChanged(handler: ChartSeriesChangedHandler): () => void;
    /** The series drawing the bars right now. */
    getCurrentSeries(): ISeriesApi;
    /**
     * The type being drawn right now. A page usually has more than one control over this - a menu
     * in the legend, a row of buttons in its own chrome - and each has to read the type rather
     * than remember what it last asked for.
     */
    getCurrentType(): ChartTypeValue;
    /** The types this page offers, in the order it gave them. */
    getAvailableTypes(): readonly ChartTypeValue[];
    /**
     * The bars indicators should run over: the derived bricks or columns where the type builds its
     * own, and the source bars otherwise.
     */
    getIndicatorCandles(): readonly ChartTypeSwitcherCandle[];
    /** Move the forming bar on by one tick, whichever type is being drawn. */
    updatePrice(candle: ChartTypeSwitcherCandle): void;
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
    _advanceHeikinAshi(candle: ChartTypeSwitcherCandle): CandlestickData;
    _computeHeikinAshi(candles: readonly ChartTypeSwitcherCandle[]): OhlcData[];
}
export {};

// Public API module: chart/chart-ui.d.ts
import { ChartContextMenu, type ChartContextMenuProvider, type PriceCoordinateSource } from './chart-context-menu.js';
import { ChartLegend, type LegendBar, type LegendChartType } from './chart-legend.js';
import { ChartPaneManager } from './chart-pane-manager.js';
import { IndicatorDialog } from './indicator-dialog.js';
import { IndicatorEngine } from './indicators/indicator-engine.js';
import { IndicatorRenderer } from './indicators/indicator-renderer.js';
import { IndicatorController, IndicatorTemplateController } from './engine.js';
import type { ChartUiHost, ModalController } from './chart-host.js';
export interface ChartUiStorage {
    load(key: string): string | null;
    save(key: string, value: string): void;
}
export declare const inMemoryChartUiStorage: ChartUiStorage;
export declare function localChartUiStorage(prefix: string): ChartUiStorage;
export interface ChartUiOptions {
    readonly container: HTMLElement;
    readonly host: ChartUiHost;
    readonly priceSource: PriceCoordinateSource;
    readonly chartTypes: readonly LegendChartType[];
    readonly storage?: ChartUiStorage;
    readonly dialogRoot?: HTMLElement;
    readonly modal?: ModalController;
    readonly provideItems?: ChartContextMenuProvider;
}
export interface ChartUiChart {
    commandStack(): unknown;
    panes(): readonly {
        id(): string;
        priceScaleIds(): readonly string[];
    }[];
}
export interface ChartUi {
    readonly engine: IndicatorEngine;
    readonly renderer: IndicatorRenderer;
    readonly paneManager: ChartPaneManager;
    readonly legend: ChartLegend;
    readonly dialog: IndicatorDialog;
    readonly menu: ChartContextMenu;
    readonly indicators: IndicatorController;
    readonly templates: IndicatorTemplateController;
    setCandles(candles: readonly LegendBar[]): void;
    showIndicators(): void;
    dispose(): void;
}
export declare function createChartUi(chart: ChartUiChart, options: ChartUiOptions): ChartUi;

// Public API module: chart/engine.d.ts
export { AreaSeries, BarSeries, CandlestickSeries, LineSeries, PointFigureSeries, RenkoSeries, } from '../core/chart-api.js';
export type { IChartApi, ISeriesApi, SeriesDefinition, } from '../core/chart-api.js';
export { IndicatorCatalogController } from '../workspace/indicator-catalog-controller.js';
export type { IndicatorCatalogListener, IndicatorFavoritesStorage, } from '../workspace/indicator-catalog-controller.js';
export { IndicatorTemplateController } from '../workspace/templates.js';
export type { IndicatorTemplateListener } from '../workspace/templates.js';
export { IndicatorController } from '../workspace/indicator-controller.js';
export type { IndicatorControllerSnapshot, IndicatorUpdatePatch, } from '../workspace/indicator-controller.js';

// Public API module: chart/indicator-dialog.d.ts
import { type IndicatorParameterValue } from '@stocksharp/indicators';
import type { ChartUiHost, ModalController, Translate } from './chart-host.js';
import type { IndicatorController } from '../workspace/indicator-controller.js';
import { IndicatorCatalogController } from './engine.js';
import type { IndicatorFavoritesStorage } from '../workspace/indicator-catalog-controller.js';
import type { IndicatorTemplateController } from '../workspace/templates.js';
/** One live indicator, as the engine reports it. */
export interface IndicatorDialogEngineEntry {
    /** Runtime id. This is what `remove` takes and what a legend button carries. */
    readonly id: string | number;
    /** Stable layout id. This is what the workspace controller keys on. */
    readonly persistenceId: string;
}
/**
 * The engine operations the dialog drives directly.
 *
 * Everything else it does to an indicator - parameters, source, placement, output styling - goes
 * through IndicatorController so it lands on the command stack and can be undone. Only creation
 * and destruction have no controller equivalent, so only those are named here.
 */
export interface IndicatorDialogEngine {
    /** Creates an indicator of `type` in `targetPaneId`; null when the engine refused. */
    add(type: string, parameters: Readonly<Record<string, IndicatorParameterValue>>, targetPaneId: string): IndicatorDialogEngineEntry | null;
    /** Destroys the indicator with this runtime id. */
    remove(id: string | number): void;
    /** Everything currently on the chart. */
    getIndicators(): readonly IndicatorDialogEngineEntry[];
}
/** One pane of the chart, as the placement selectors read it. */
export interface IndicatorDialogPane {
    id(): string;
    priceScaleIds(): readonly string[];
}
/** The chart, narrowed to what the placement selectors need to list. */
export interface IndicatorDialogChart {
    panes(): readonly IndicatorDialogPane[];
}
/** Everything the dialog needs to run. */
export interface IndicatorDialogOptions {
    /** The dialog's markup. Queried once, and never created by this module. */
    readonly root: HTMLElement;
    /** Shows and hides `root`. The page owns backdrop, scroll lock, focus trap and Escape. */
    readonly modal: ModalController;
    readonly host: ChartUiHost;
    readonly engine: IndicatorDialogEngine;
    readonly controller: IndicatorController;
    readonly catalog: IndicatorCatalogController;
    readonly templates: IndicatorTemplateController;
    readonly chart: IndicatorDialogChart;
}
/** Trading-workspace indicator picker and complete editor over IndicatorController. */
export declare class IndicatorDialog {
    private readonly root;
    private readonly modal;
    private readonly host;
    private readonly engine;
    private readonly controller;
    private readonly catalog;
    private readonly templates;
    private readonly chart;
    private readonly searchInput;
    private readonly listEl;
    private readonly emptyEl;
    private readonly tabsEl;
    private readonly settingsEl;
    private readonly activeListEl;
    private readonly events;
    private rows;
    private targetPaneId;
    private editingId;
    private editingSnapshot;
    /** Where the dialog came from, while it sits inside a fullscreen element instead. */
    private restoreParent;
    private shown;
    private disposed;
    private readonly translate;
    private readonly handleControllerChange;
    private readonly handleCatalogChange;
    private readonly handleTemplateChange;
    private readonly handleClosed;
    constructor(options: IndicatorDialogOptions);
    /** Opens the picker with nothing selected. */
    show(): void;
    /** Opens the picker so that whatever is added next lands in this pane. */
    showForPane(paneId: string): void;
    /**
     * Opens the editor on one indicator.
     *
     * Takes either id the page might be holding: the legend and the pane headers carry the
     * engine's runtime id, the workspace carries the stable persistence id.
     */
    showEdit(indicatorId: string | number): void;
    /** Closes the dialog through the host's modal controller. */
    hide(): void;
    /** Detaches every listener. The dialog cannot be reopened afterwards. */
    dispose(): void;
    /**
     * Native fullscreen puts the chart panel in the browser's top layer, and a dialog left in
     * `document.body` renders underneath it - the user presses the button and sees nothing at
     * all. Moving the dialog inside the fullscreen element puts it in the same layer; the
     * modal controller's close handler moves it back.
     */
    private moveIntoFullscreen;
    private restoreFromFullscreen;
    private renderCategoryTabs;
    /**
     * Renders every catalog entry once.
     *
     * Filtering then only toggles rows, so the scroll position and the caret in the search box
     * survive every keystroke.
     */
    private buildList;
    private listRowHtml;
    private syncFavorites;
    /**
     * Shows the rows the tab and the query select, and hides the rest.
     *
     * Two ways of matching text, because users type two different things. The catalog answers a
     * folded token-AND query over ids, names, categories and aliases, which is what finds an
     * indicator by its category or by a translated alias. A plain case-insensitive substring
     * over name, full name and translated full name is what finds one when the typed run of
     * characters spans a space that the token split would have thrown away. A row matching
     * either way stays on screen.
     */
    private applyFilter;
    private activeGroup;
    private renderAddSettings;
    private renderEditor;
    private addIndicator;
    private saveIndicator;
    private updateIndicatorFromEditor;
    private bindTemplateEditor;
    private renderActiveList;
    private resolveSnapshot;
    private templateOptions;
    private refreshTemplateSelect;
    private paneOptions;
    private scaleOptions;
    private sourceOptions;
    private showError;
}
/**
 * Builds the catalog model over the built-in indicator settings, leaving preference persistence
 * to the host.
 *
 * `storage` is null on a page that keeps favorites for the session only; the alternative is a
 * host-owned store, and which of the two it is has to be said at the call site.
 */
export declare function createIndicatorCatalogController(translate: Translate, storage: IndicatorFavoritesStorage | null): IndicatorCatalogController;

// Public API module: chart/indicators/indicator-engine.d.ts
import { IndicatorRenderer } from './indicator-renderer.js';
import { IndicatorRuntime, IndicatorCandleField, IndicatorSourceStatusReason, type IndicatorDefinition, type CandlestickData as CandlePoint, type IndicatorOutputAppearance, type IndicatorOutputMetadataValue, type IndicatorOutputSource, type IndicatorOutputStylePatch, type IndicatorParameters, type IndicatorRuntimeInput, type IndicatorRuntimePatch, type IndicatorRuntimePatchOperation, type IndicatorRuntimePoint, type IndicatorSource, type IndicatorSourceStatus } from '@stocksharp/indicators';
import type { IndicatorStyleSeries } from './indicator-styles.js';
import type { IndicatorPaneChart, IndicatorPaneHost } from './pane-host.js';
/** Legacy server/calc payloads belong to the chart boundary, not the indicator package API. */
interface IndicatorPoint {
    time: string | number;
    value: number | null;
}
type IndicatorLines = Record<string, IndicatorPoint[]>;
type IndicatorParams = Record<string, any>;
/**
 * The runtime as the engine holds it. One engine drives every registered definition, so the
 * per-definition input/parameter generics are erased at this boundary — the same erasure
 * IndicatorRenderer already uses on its `prepareRuntime` / `updateRuntime` parameters.
 */
type EngineRuntime = IndicatorRuntime<any, IndicatorParameters>;
/** A source scalar lifted to O=H=L=C so candlestick-input definitions can consume it. */
interface ScalarCandle {
    time: number;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume?: number | null;
}
/**
 * What a runtime consumes per bar: a raw candle for candlestick definitions, a lifted scalar
 * candle when a scalar source feeds one, or the bare scalar for scalar-input definitions.
 */
type EngineRuntimeValue = CandlePoint | ScalarCandle | number | null;
type EngineRuntimeInput = IndicatorRuntimeInput<EngineRuntimeValue>;
/**
 * The committed/preview split of whatever feeds one indicator — the candle window or an
 * upstream indicator output. Both producers are described by this one shape so the
 * incremental update path never has to care which of them it is walking.
 */
interface IndicatorTimeline {
    readonly committedCount: number;
    committedAt(index: number): EngineRuntimeInput;
    readonly preview: EngineRuntimeInput | undefined;
    readonly firstTime: number | null;
    readonly lastCommittedTime: number | null;
}
/** One finite upstream output sample, kept with the target index that produced it. */
interface SourceSample {
    readonly targetIndex: number;
    readonly scalar: number;
    input: EngineRuntimeInput;
}
/** Memoised upstream samples, invalidated by the upstream output revision. */
interface SourceTimelineCache {
    readonly key: string;
    revision: number;
    readonly samples: SourceSample[];
}
/** Legend readout for one bar: every output that produced a value there. */
type LegendValues = Record<string, number>;
interface LegendPoint {
    readonly time: number;
    readonly values: LegendValues;
}
/** A chart series handle the painter created and handed back to the engine. */
interface IndicatorSeriesRef extends IndicatorStyleSeries {
    applyOptions(options: object): void;
}
/** Painter-published legend binding: which series and field back one output row. */
interface IndicatorLegendSource {
    series?: IndicatorStyleSeries;
    field?: string;
    colorOption?: string;
    lineWidthOption?: string;
    lineStyleOption?: string;
    visibilityOption?: string;
}
/** One point handed to the painter: the runtime value plus the point's flat metadata. */
interface RenderedIndicatorPoint {
    time: number;
    value: number;
    [key: string]: IndicatorOutputMetadataValue;
}
/** Renderer input, one point array per output id. */
type IndicatorRenderData = Record<string, RenderedIndicatorPoint[]>;
/** The catalog row IndicatorSettings hands back — only the fields the engine reads. */
interface IndicatorCatalogParam {
    key: string;
    default?: unknown;
}
interface IndicatorCatalogEntry {
    name: string;
    pane?: string;
    measure?: string;
    serverKind?: string;
    params: readonly IndicatorCatalogParam[];
}
/** One row of the crosshair legend, as chart-legend consumes it. */
interface IndicatorLegendRow {
    id: number;
    type: string;
    name: string;
    values: Record<string, number | null>;
    colors: string[];
    paneId: string | null;
}
/**
 * The crosshair readout the legend passes through: series handle -> the point under the
 * cursor. The point itself is host-shaped — the painter names the field to read out of it —
 * so it arrives as `unknown` and is narrowed at the one place that indexes it.
 */
interface IndicatorSeriesDataLookup {
    get(series: unknown): unknown;
}
/** A calc point that may ask to be drawn N bars back. */
interface ShiftablePoint extends IndicatorPoint {
    shift?: number;
}
/**
 * One row of the engine's indicator table. It carries the persisted identity (id /
 * persistenceId / type / params / source / placement) plus the underscore-prefixed
 * incremental bookkeeping that keeps the rendered series, the legend table and the source
 * graph on one revision. Only fields the engine itself reads or writes are declared: the
 * painter also parks its own handles here (`_painter`, `styleSources`, …) and owns them.
 * Everything the runtime has not produced yet is optional, because add() creates the row
 * before the first reset fills that state in.
 */
interface IndicatorEntry {
    id: number;
    persistenceId: string;
    type: string;
    params: IndicatorParams;
    seriesRefs: IndicatorSeriesRef[];
    paneId: string | null;
    colors: string[];
    outputNames: string[];
    legendSources: Record<string, IndicatorLegendSource>;
    visible: boolean;
    source: IndicatorSource;
    sourceStatus: IndicatorSourceStatusReason;
    definition: IndicatorDefinition<any, any>;
    runtime: EngineRuntime;
    /** Sub-pane scale chosen automatically; `priceScaleId` overrides it when set. */
    paneScaleId: string;
    priceScaleId: string | undefined;
    _outputRevision: number;
    _outputPreviousRevision: number;
    _outputChangedFromTime: number;
    _lastOutputChanges: IndicatorRuntimePatchOperation[] | null;
    _sourceRevision: number | null;
    _runtimeFirstTime: number | null;
    _runtimePreviewTime: number | null;
    _runtimeLastCommittedTime: number | null;
    _lastRuntimePatchChangedFromTime?: number;
    _sourceTimelineCache?: SourceTimelineCache | null;
    _points?: LegendPoint[];
    _runtimeLegendTailTargets?: number[];
    _lastValues?: LegendValues | null;
    _runtimePreviewOutputTimes?: Record<string, number>;
}
export declare class IndicatorEngine {
    _indicators: IndicatorEntry[];
    _nextId: number;
    _renderer: any;
    _paneManager: IndicatorPaneHost | null;
    _symbol: string | null;
    _timeframe: number | null;
    _candles: readonly CandlePoint[];
    onChange: (() => void) | null;
    _renderPending: boolean | undefined;
    _retainRuntimeHistory: boolean;
    _changeListeners: Set<() => void>;
    constructor();
    setRenderer(renderer: IndicatorRenderer): void;
    setPaneManager(paneManager: IndicatorPaneHost): void;
    setSymbol(symbol: string | null): void;
    setTimeframe(timeframe: number | null): void;
    subscribeChange(listener: () => void): void;
    unsubscribeChange(listener: () => void): void;
    _emitChange(): void;
    setCandles(candles: readonly CandlePoint[] | null | undefined, options?: {
        rewindableTail?: boolean;
    }): void;
    onLiveUpdate(): void;
    appendCandle(candle: CandlePoint): void;
    _scheduleRender(): void;
    add(type: string, params: IndicatorParams | null, targetPaneId?: string, persistence?: {
        persistenceId?: string;
        source?: IndicatorSource;
        priceScaleId?: string;
    }): IndicatorEntry | null;
    _renderData(entry: IndicatorEntry, data: IndicatorRenderData): void;
    _resetIncrementalAndRender(entry: IndicatorEntry): void;
    _updateIncrementalAndRender(entry: IndicatorEntry): void;
    _applyRuntimePatch(entry: IndicatorEntry, patch: IndicatorRuntimePatch): boolean;
    _runtimeInput(entry: IndicatorEntry, candle: CandlePoint): EngineRuntimeInput;
    _runtimeTimeline(entry: IndicatorEntry): IndicatorTimeline;
    _sourceSamples(entry: IndicatorEntry, upstream: IndicatorEntry, source: IndicatorOutputSource): SourceSample[];
    _applySourceSampleChanges(entry: IndicatorEntry, samples: SourceSample[], source: IndicatorOutputSource, changes: readonly IndicatorRuntimePatchOperation[]): void;
    _sourceSample(entry: IndicatorEntry, source: IndicatorOutputSource, targetIndex: number, time: number, scalar: number): SourceSample;
    _runtimeInputFromScalar(entry: IndicatorEntry, candle: CandlePoint | null, time: number, scalar: number | null, source: IndicatorSource): EngineRuntimeInput;
    _candleAtTime(time: number): CandlePoint | null;
    _scalarCandle(candle: CandlePoint | null, time: number, scalar: number | null, source: IndicatorSource): ScalarCandle;
    _candleFieldValue(candle: CandlePoint | null, field: IndicatorCandleField): number | null;
    _indicatorOutputAt(indicatorId: string, outputId: string, time: number): number | null;
    _clearRuntimeAndRender(entry: IndicatorEntry): void;
    _runtimeRendererShape(entry: IndicatorEntry, points?: readonly IndicatorRuntimePoint[]): IndicatorRenderData;
    _syncRuntimeLegend(entry: IndicatorEntry, points?: readonly IndicatorRuntimePoint[]): void;
    _runtimePatchChangedFromTime(entry: IndicatorEntry, patch: IndicatorRuntimePatch): number;
    _refreshRuntimePreviewOutputTimes(entry: IndicatorEntry, points?: readonly IndicatorRuntimePoint[]): void;
    _applyRuntimeLegendPatch(entry: IndicatorEntry, patch: IndicatorRuntimePatch): boolean;
    _applyPaneScale(entry: IndicatorEntry, chart: IndicatorPaneChart | null): void;
    _buildLegendPoints(entry: IndicatorEntry, data: IndicatorPoint[] | IndicatorLines): LegendPoint[];
    _toSec(time: string | number): number;
    _orderedIndicators(): IndicatorEntry[];
    _resetCascade(rootPersistenceId: string): void;
    _resetDependents(removedPersistenceId: string): void;
    _resolveSourceStatus(entry: IndicatorEntry): IndicatorSourceStatus;
    _sourceEntry(entry: IndicatorEntry): IndicatorEntry | null;
    _sourceNeedsHistoricalReset(entry: IndicatorEntry): boolean;
    _rememberSourceRevision(entry: IndicatorEntry): void;
    _markOutputsChanged(entry: IndicatorEntry, time: number, changes: IndicatorRuntimePatchOperation[] | null): void;
    _assertSourceAcyclic(ownerPersistenceId: string, source: IndicatorSource): void;
    _assertSourceOutput(source: IndicatorSource, allowMissingIndicator: boolean): void;
    remove(id: number): void;
    _removeEntry(entry: IndicatorEntry): void;
    move(id: number, targetPaneId: string): boolean;
    /** Selects an explicit price scale; null returns the indicator to automatic routing. */
    setScale(id: number, priceScaleId: string | null): boolean;
    _rebalancePaneScales(paneId: string | null): void;
    removeAll(): void;
    resubscribeAll(): Promise<void>;
    replaceParams(id: number, newParams: IndicatorParams): IndicatorEntry | null | undefined;
    getIndicators(): IndicatorEntry[];
    /** Rebinds one runtime and every transitive dependent in graph order. */
    setSource(id: number, value: IndicatorSource): boolean;
    getSourceStatus(id: number): IndicatorSourceStatus | null;
    /** Applies one output's visual options without rebuilding its runtime or series. */
    setOutputStyle(id: number, outputId: string, patch: IndicatorOutputStylePatch): boolean;
    /** Hides all painter-owned series while retaining computation and object identity. */
    setVisible(id: number, visible: boolean): boolean;
    /** Returns a detached snapshot keyed by the painter's stable style ids. */
    getStyles(id: number): Readonly<Record<string, Readonly<Record<string, unknown>>>> | null;
    /** Returns effective editor fields keyed by semantic output id. */
    getOutputStyles(id: number): Readonly<Record<string, IndicatorOutputAppearance>> | null;
    /** Restores a complete painter-style snapshot, including clearing newer fields. */
    replaceStyles(id: number, styles: Readonly<Record<string, unknown>>): boolean;
    getValuesAt(time: string | number | null | undefined, seriesData?: IndicatorSeriesDataLookup): IndicatorLegendRow[];
    _pickValuesFromSeriesData(entry: IndicatorEntry, seriesData: IndicatorSeriesDataLookup): Record<string, number | null> | null;
    _pickValues(entry: IndicatorEntry, time: string | number | null | undefined): Record<string, number | null> | null;
    _completeLegendValues(entry: IndicatorEntry, values: LegendValues | null | undefined): Record<string, number | null> | null;
    _visibleOutputColors(entry: IndicatorEntry): string[];
    _shiftTime(rawTime: number, shift: number | undefined): number;
    _applyPointShifts(data: ShiftablePoint[] | Record<string, ShiftablePoint[]>): ShiftablePoint[] | Record<string, ShiftablePoint[]>;
    _mergeParams(settings: IndicatorCatalogEntry, params: IndicatorParams | null, definition: IndicatorDefinition): IndicatorParams;
    _formatParams(params: IndicatorParams): string;
    _resolveSubPane(settings: IndicatorCatalogEntry, mergedParams: IndicatorParams): string | null;
}
export {};

// Public API module: chart/indicators/indicator-renderer.d.ts
import type { IndicatorRuntime, IndicatorRuntimePatch, IndicatorRuntimePoint } from '@stocksharp/indicators';
import type { IndicatorParameters } from '@stocksharp/indicators';
export declare class IndicatorRenderer {
    _mainChart: any;
    _lastColors: string[];
    constructor(mainChart: any);
    setMainChart(chart: any): void;
    getLastColors(): string[];
    render(entry: any, data: any, paneChart: any, settings: any): any[];
    update(entry: any, data: any, paneChart: any, settings: any): void;
    moveSeries(entry: any, paneChart?: any): void;
    prepareRuntime(entry: any, runtime: IndicatorRuntime<any, IndicatorParameters>, runtimePoints?: readonly IndicatorRuntimePoint[]): void;
    updateRuntime(entry: any, patch: IndicatorRuntimePatch, runtime: IndicatorRuntime<any, IndicatorParameters>): boolean;
    removeSeries(entry: any): void;
    private _resolveStyleSources;
    private _createPainter;
    private _createContext;
}

// Public API module: chart/indicators/indicator-settings.d.ts
export declare const IndicatorSettings: {
    DARK_PALETTE: string[];
    GROUPS: string[];
    getIndicator: (id: string) => any;
    getAllIndicators: () => any[];
    getByGroup: (group: string) => any[];
    getNextColor: () => string;
    resetColorIndex: () => void;
    loadCatalog: (baseUrl: string) => Promise<void>;
};

// Public API module: chart/indicators/indicator-styles.d.ts
import type { IndicatorOutputAppearance, IndicatorOutputStylePatch } from '@stocksharp/indicators';
export interface IndicatorStyleSeries {
    readonly options?: (() => object) | object;
    applyOptions?(options: object): void;
}
export interface IndicatorStyleOwner {
    readonly type?: string;
    readonly seriesRefs?: readonly IndicatorStyleSeries[];
    readonly styleSources?: Readonly<Record<string, IndicatorStyleSeries>>;
    readonly outputNames?: readonly string[];
    readonly legendSources?: Readonly<Record<string, {
        readonly series?: IndicatorStyleSeries;
        readonly field?: string;
        readonly colorOption?: string;
        readonly lineWidthOption?: string;
        readonly lineStyleOption?: string;
        readonly visibilityOption?: string;
    }>>;
    colors?: string[];
    visible?: boolean;
}
/** Returns painter-owned visual options only; runtime ids and scale routing stay transient. */
export declare function captureIndicatorStyles(entry: IndicatorStyleOwner): Record<string, Record<string, unknown>>;
/** Applies styles by semantic painter key and reports keys unavailable in this painter version. */
export declare function applyIndicatorStyles(entry: IndicatorStyleOwner, styles: Readonly<Record<string, unknown>>): readonly string[];
/** Replaces painter options exactly, clearing fields absent from the supplied snapshot. */
export declare function replaceIndicatorStyles(entry: IndicatorStyleOwner, styles: Readonly<Record<string, unknown>>): readonly string[];
/** Applies editor-facing style fields to the series/field that owns one output. */
export declare function applyIndicatorOutputStyle(entry: IndicatorStyleOwner, outputId: string, patch: IndicatorOutputStylePatch): boolean;
export declare function refreshIndicatorLegendColors(entry: IndicatorStyleOwner): void;
export declare function indicatorOutputVisible(entry: IndicatorStyleOwner, outputId: string): boolean;
/** Captures effective output fields through semantic painter mappings. */
export declare function captureIndicatorOutputStyles(entry: IndicatorStyleOwner): Readonly<Record<string, IndicatorOutputAppearance>>;
export declare function refreshIndicatorVisibility(entry: IndicatorStyleOwner): void;
/** Changes group visibility without losing each painter series' own visibility choice. */
export declare function setIndicatorStyleVisibility(entry: IndicatorStyleOwner, visible: boolean): boolean;
/** Keeps painter series created after a group was hidden out of rendering and autoscale. */
export declare function enforceIndicatorVisibility(entry: IndicatorStyleOwner): void;

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

// Public API module: series/derived-data.d.ts
export interface OhlcData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}
export interface DerivedOhlcData {
    readonly data: readonly OhlcData[];
    readonly boxSize: number;
}
/** A replacement of one contiguous derived tail. */
export interface DerivedOhlcPatch {
    readonly fromIndex: number;
    readonly removed: number;
    readonly data: readonly OhlcData[];
}
/**
 * Stateful close-based Renko transform. setData/reset chooses one box size;
 * append and replace-last then touch only the derived tail. The last source
 * candle is transactional, so replacing it never contaminates committed bricks.
 */
export declare class RenkoDataRuntime {
    private readonly requestedBoxSize?;
    private readonly dataValue;
    private initialTimes;
    private nextStep;
    private base;
    private previewTime;
    private previewCheckpoint;
    private boxSizeValue;
    constructor(requestedBoxSize?: number);
    get data(): readonly OhlcData[];
    get boxSize(): number;
    reset(source: readonly OhlcData[]): DerivedOhlcData;
    update(point: OhlcData): DerivedOhlcPatch | null;
    private process;
    private checkpoint;
    private restore;
    private installInitialTimes;
    private timeAt;
}
/** Stateful close-based Point & Figure transform with a transactional source tail. */
export declare class PointFigureDataRuntime {
    private readonly requestedBoxSize?;
    private readonly reversalValue;
    private readonly dataValue;
    private initialTimes;
    private nextStep;
    private reference;
    private direction;
    private top;
    private bottom;
    private initialized;
    private previewTime;
    private previewCheckpoint;
    private boxSizeValue;
    constructor(requestedBoxSize?: number, requestedReversal?: number);
    get data(): readonly OhlcData[];
    get boxSize(): number;
    get reversal(): number;
    reset(source: readonly OhlcData[]): DerivedOhlcData;
    update(point: OhlcData): DerivedOhlcPatch | null;
    private process;
    private rising;
    private falling;
    private checkpoint;
    private restore;
    private installInitialTimes;
    private retimeCheckpoint;
    private timeAt;
}
export declare function prepareRenkoData(source: readonly OhlcData[], requestedBoxSize?: number): DerivedOhlcData;
export declare function preparePointFigureData(source: readonly OhlcData[], requestedBoxSize?: number, requestedReversal?: number): DerivedOhlcData;

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
