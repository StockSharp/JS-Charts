// The chart's UI layer: the legend, the right-click menu, the chart-type switcher and the
// indicator dialog.
//
// The engine draws; this draws the controls around it. They are separate entry points because a
// page can want one without the other - a report with a sparkline needs no menus, and a page that
// builds its own chrome around the engine should not pay for ours.
//
// Every module here takes a `ChartUiHost`: the page words its own strings, formats its own numbers
// and shows its own messages. Nothing in this folder reaches for a global.
//
// In the browser this ships as `dist/sschartui.js`, publishing `SSChartUI`. Load `sschart.js`
// first - the UI layer reads the engine off the global that bundle publishes rather than carrying
// a second copy of it.
// The whole layer in one call. Everything below is what it assembles, exported for a page that
// wants to build its own arrangement instead.
export {
    createChartUi,
    inMemoryChartUiStorage,
    localChartUiStorage,
} from './chart-ui.js';

export type {
    ChartUi,
    ChartUiChart,
    ChartUiOptions,
    ChartUiStorage,
} from './chart-ui.js';

export {
    ChartLegend,
    fullscreenMenuLayer,
} from './chart-legend.js';

export type {
    ChartLegendOptions,
    LegendBar,
    LegendChart,
    LegendChartType,
    LegendCrosshairParam,
    LegendIndicatorEngine,
    LegendIndicatorValue,
    LegendMenuLayer,
    LegendPaneHost,
    LegendSeriesData,
} from './chart-legend.js';

export {
    ChartContextMenu,
    ChartContextMenuMode,
    ChartContextMenuTone,
} from './chart-context-menu.js';

export type {
    ChartContextMenuChartOptions,
    ChartContextMenuContext,
    ChartContextMenuEntry,
    ChartContextMenuModeValue,
    ChartContextMenuOptions,
    ChartContextMenuPaneOptions,
    ChartContextMenuProvider,
    ChartContextMenuToneValue,
    PriceCoordinateSource,
} from './chart-context-menu.js';

export {
    ChartType,
    ChartTypeSwitcher,
    allChartTypes,
    defaultChartTypePalette,
    isDerivedChartType,
    parseChartType,
} from './chart-type-switcher.js';

export type {
    ChartSeriesChangedHandler,
    ChartTypePalette,
    ChartTypeSwitcherCandle,
    ChartTypeSwitcherOptions,
    ChartTypeValue,
} from './chart-type-switcher.js';

// Pane chrome over the engine's native panes. It is what satisfies both `LegendPaneHost` and the
// engine's `IndicatorPaneHost`, so a page that mounts the legend or the indicator engine needs it
// unless it lays out its own panes - which is exactly what those two interfaces exist for.
export { ChartPaneManager } from './chart-pane-manager.js';

export type { ChartPaneManagerOptions } from './chart-pane-manager.js';

export {
    IndicatorDialog,
    createIndicatorCatalogController,
} from './indicator-dialog.js';

export type {
    IndicatorDialogChart,
    IndicatorDialogEngine,
    IndicatorDialogEngineEntry,
    IndicatorDialogOptions,
    IndicatorDialogPane,
} from './indicator-dialog.js';

export {
    consoleNotify,
    createPlainModalController,
    createTranslate,
    defaultChartFormatters,
    identityTranslate,
    standaloneHost,
} from './chart-host.js';

export type {
    ChartFormatters,
    ChartUiHost,
    ModalController,
    NotificationKind,
    Notify,
    Translate,
} from './chart-host.js';

// The indicator machinery the dialog drives. Published from here as well as from
// `@stocksharp/chart/indicators`, because a page that mounts the dialog needs an engine to hand
// it, and sending a reader to a second entry point for the other half of one job is a papercut.
export {
    IndicatorEngine,
} from './indicators/indicator-engine.js';

export {
    IndicatorRenderer,
} from './indicators/indicator-renderer.js';

export {
    IndicatorSettings,
} from './indicators/indicator-settings.js';

export type {
    IndicatorPaneChart,
    IndicatorPaneHost,
} from './indicators/pane-host.js';
