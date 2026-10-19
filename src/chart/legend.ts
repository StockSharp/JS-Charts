// The legend and the trade marks on their own: what a chart that shows a finished run needs around the engine.
//
// `./ui` carries the whole UI layer, and with its indicator dialog and engine it carries the whole indicator catalogue
// too. A report has no indicators to pick, so it takes the legend and the marks from here and does not pay for them.
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
    LegendLine,
    LegendMenuLayer,
    LegendPaneHost,
    LegendSeriesData,
    LegendTradeMarks,
} from './chart-legend.js';

export {
    TradeMarks,
    barOf,
    describeTrade,
    groupTradesByBar,
    tradeMarkers,
} from './trade-marks.js';

export type {
    ChartTrade,
    TradeMarkColors,
    TradeMarksBar,
    TradeMarksChart,
    TradeMarksCrosshairParam,
    TradeMarksOptions,
    TradeMarksPlugin,
    TradeMarksSeries,
} from './trade-marks.js';

export {
    consoleNotify,
    createTranslate,
    defaultChartFormatters,
    identityTranslate,
    standaloneHost,
} from './chart-host.js';

export type {
    ChartFormatters,
    ChartUiHost,
    NotificationKind,
    Notify,
    Translate,
} from './chart-host.js';
