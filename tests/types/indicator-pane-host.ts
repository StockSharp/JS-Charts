// A host may manage indicator panes itself.
//
// `IndicatorEngine.setPaneManager` is public, and a terminal that lays out its own panes is the
// caller it exists for. It used to demand the concrete `ChartPaneManager` — a class this package
// does not export, carrying fields (`_removedPanes`, `_resizeObserver`, `_headerSyncFrame`, …)
// that are its own business — so no host outside this repository could satisfy it, and the one
// that tried failed to compile against a type it could not name.
//
// What the engine actually reads is five members, and this asserts exactly that: the object
// below implements them and nothing else, and passing it must typecheck. Add a sixth member to
// the engine's needs and this file stops compiling, which is the point.
//
// This file emits no runtime code; it fails the typecheck instead.

import { IndicatorEngine } from '../../src/chart/indicators/indicator-engine.js';
import type { IndicatorPaneChart, IndicatorPaneHost } from '../../src/index.js';

declare const paneChart: IndicatorPaneChart;

/// A host's own pane chrome: no inheritance, no imported base class, nothing from this package
/// beyond the shape itself.
const ownPaneManager = {
    getPaneByMeasure(measure: string | null): string | null {
        return measure === null ? null : `pane:${measure}`;
    },
    addPane(label: string, measure: string | null): string | null {
        return `pane:${measure ?? label}`;
    },
    getChart(_paneId: string): IndicatorPaneChart | null {
        return paneChart;
    },
    removePane(_paneId: string): void {
        /* the host's own teardown */
    },
};

const engine = new IndicatorEngine();
engine.setPaneManager(ownPaneManager);

// `restorePane` is optional: the engine guards it with a typeof check, because a manager that
// keeps no tombstones has nothing to restore.
const withRestore: IndicatorPaneHost = {
    ...ownPaneManager,
    restorePane(paneId: string): string | null {
        return paneId;
    },
};
engine.setPaneManager(withRestore);

// And the shipped manager is still one, which is what stops the interface drifting away from
// the implementation this package provides.
declare const shipped: import('../../src/chart/chart-pane-manager.js').ChartPaneManager;
const shippedIsAHost: IndicatorPaneHost = shipped;

export { shippedIsAHost, withRestore, engine };
