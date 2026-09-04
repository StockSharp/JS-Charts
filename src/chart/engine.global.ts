// The engine, off the global its own bundle publishes.
//
// Only the `sschartui.js` build uses this file: `build.mjs` points `./engine.js` here, so that
// bundle carries no copy of the engine. See `engine.ts` for why a second copy is not merely
// wasteful but wrong - a chart matches a series definition by identity, so a `CandlestickSeries`
// from another copy of the module is not the one the chart knows.
//
// Everything an npm consumer sees goes through `engine.ts` and imports the engine properly; this
// exists because a script tag has no module resolution to do that with.
//
// Read once, at load, rather than lazily behind a proxy: identity is the whole point here, and a
// proxy is by definition not the object it stands for. The cost is an ordering requirement -
// `sschart.js` before `sschartui.js` - which is the same rule `sschart.js` itself already places
// on `ssindicators.js`, and which the error below states outright.
import type * as Engine from '../index.js';

export type {
    IChartApi,
    ISeriesApi,
    SeriesDefinition,
} from '../core/chart-api.js';

export type {
    IndicatorCatalogListener,
    IndicatorFavoritesStorage,
} from '../workspace/indicator-catalog-controller.js';

export type { IndicatorTemplateListener } from '../workspace/templates.js';

export type {
    IndicatorControllerSnapshot,
    IndicatorUpdatePatch,
} from '../workspace/indicator-controller.js';

const engine = (globalThis as { SSChart?: typeof Engine }).SSChart;

if (engine === undefined || engine === null) {
    // Named plainly, because the fix is one script tag, and a message that only says
    // "CandlestickSeries is undefined" sends a reader into this package instead of into their
    // own page.
    throw new Error(
        'SSChartUI: the chart engine is missing. Load dist/sschart.js before this script '
        + '(it publishes the SSChart global), or import @stocksharp/chart/ui from npm.');
}

export const {
    AreaSeries,
    BarSeries,
    CandlestickSeries,
    LineSeries,
    PointFigureSeries,
    RenkoSeries,
    IndicatorCatalogController,
    IndicatorTemplateController,
    IndicatorController,
} = engine;
