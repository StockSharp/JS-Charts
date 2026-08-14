// Public entry for the chart-side indicator layer, reached as `@stocksharp/chart/indicators`:
// the engine that owns the indicator instances and their values, the renderer that draws them
// onto panes, the settings dialog they share, and the style helpers both sides use.
//
// The calculation side is not here - it lives in `@stocksharp/indicators`, which this package
// depends on, so a consumer gets it transitively.
export * from './indicator-engine.js';
export * from './indicator-renderer.js';
export * from './indicator-settings.js';
export * from './indicator-styles.js';
export * from './painters/index.js';
