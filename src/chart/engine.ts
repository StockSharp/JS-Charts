// The engine, as the UI layer reaches it.
//
// Everything in this folder that needs a runtime value from the engine - a series definition, a
// controller class - imports it from here rather than from `../core` or `../workspace` directly,
// for one reason: the `sschartui.js` browser bundle must NOT carry a second copy of the engine.
//
// A series definition is matched by identity, so a chart created by `sschart.js` does not
// recognise a `CandlestickSeries` that came from another copy of the module - the switch to
// candles would fail on a page that loaded both files, and fail silently, because nothing about
// two identical-looking objects says they are not the same one.
//
// `build.mjs` therefore resolves this specifier to `engine.global.ts` for that one bundle, which
// reads the engine off the global `sschart.js` publishes. Every other consumer - npm, the ESM
// build, the tests - resolves this file and imports the engine normally.
export {
    AreaSeries,
    BarSeries,
    CandlestickSeries,
    LineSeries,
    PointFigureSeries,
    RenkoSeries,
} from '../core/chart-api.js';

export type {
    IChartApi,
    ISeriesApi,
    SeriesDefinition,
} from '../core/chart-api.js';

export { IndicatorCatalogController } from '../workspace/indicator-catalog-controller.js';
export type {
    IndicatorCatalogListener,
    IndicatorFavoritesStorage,
} from '../workspace/indicator-catalog-controller.js';

export { IndicatorTemplateController } from '../workspace/templates.js';
export type { IndicatorTemplateListener } from '../workspace/templates.js';

export { IndicatorController } from '../workspace/indicator-controller.js';
export type {
    IndicatorControllerSnapshot,
    IndicatorUpdatePatch,
} from '../workspace/indicator-controller.js';
