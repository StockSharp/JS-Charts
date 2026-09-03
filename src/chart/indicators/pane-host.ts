// What the engine needs of whatever manages panes.
//
// Deliberately an interface and not the concrete ChartPaneManager. A terminal that lays out its
// own panes is exactly the caller `setPaneManager` exists for, and demanding a class - one this
// package did not export, carrying its own fields - meant no such caller could satisfy it.
// These five members are everything the engine reads; the shipped ChartPaneManager is one
// implementation of them.
//
// Its own module rather than a declaration beside the engine: exporting a type re-exports the
// module it lives in, and the engine's internals are not public API.

/// A pane's chart, as the engine reads it.
///
/// Not `IChartApi`: a pane is not a chart, and the two members below are all the engine touches
/// on one. The wider type is what made a host's own pane chrome unusable here.
export interface IndicatorPaneChart {
    priceScale(scaleId?: string): { applyOptions(options: Record<string, unknown>): void };
    applyOptions(options?: Record<string, unknown>): void;
}

/// Whatever owns the panes an indicator can be moved between.
export interface IndicatorPaneHost {
    /// The pane already showing this measure, so two studies in the same units share one.
    getPaneByMeasure(measure: string | null): string | null;
    /// A new pane, or null if the host would not make one.
    addPane(label: string, measure: string | null): string | null;
    /// The pane's chart, or null once the pane is gone.
    getChart(paneId: string): IndicatorPaneChart | null;
    removePane(paneId: string): void;
    /// Optional: a host that keeps a removed pane's layout can rebuild it under the same id.
    /// A host that keeps no tombstones omits this, and the engine makes a new pane instead.
    restorePane?(paneId: string): string | null;
}
