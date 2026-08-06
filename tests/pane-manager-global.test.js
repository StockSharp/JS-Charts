// Failing-by-design proofs for the lifecycle findings of AUDIT.md:
//   1.1  the per-pane ctx.save()+clip() block in drawBase/drawOverlay has no try/finally
//   3.4  public methods stay silently usable after chart.remove()
//   3.6  ChartLegend has no teardown at all
//   3.7  window._chartPaneManager is a global dispose() never clears
//   3.12 trading-layer publish() drops the pending intent when ANY handler throws
//
// Every assertion states the behaviour the audit says is owed, so each one goes red while the
// defect is alive and green the moment it is fixed. Nothing here pins current behaviour.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { createChart, LineSeries } = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');
const { createRecordingContext } = require('./render/recording-context.js');
const { ChartLegend } = require('../src/chart/chart-legend.js');
const { ChartPaneManager } = require('../src/chart/chart-pane-manager.js');
const {
    ChartOrderStatus,
    ChartOrderTimeInForce,
    ChartOrderType,
    TradingIntentOutcomeStatus,
    TradingLayer,
    TradingSide,
} = require('../src/trading/index.js');

let dom = null;
let restoreExtras = [];

afterEach(() => {
    for (const restore of restoreExtras.reverse()) restore();
    restoreExtras = [];
    dom?.restore();
    dom = null;
});

/** Install a global for the duration of one test (the headless DOM double has no ResizeObserver). */
function installGlobal(name, value) {
    const had = name in globalThis;
    const previous = globalThis[name];
    globalThis[name] = value;
    restoreExtras.push(() => {
        if (had) globalThis[name] = previous;
        else delete globalThis[name];
    });
}

// ---------------------------------------------------------------------------
// 1.1 — one throwing primitive strands a save()+clip() on the shared context
// ---------------------------------------------------------------------------

/**
 * Mount a chart on the headless DOM, but hand every canvas a RECORDING 2d context so the
 * ordered save/clip/restore log of the shared context is observable from the test.
 */
function mountRecording(options = {}) {
    dom = createHeadlessDom();
    const createElement = dom.document.createElement;
    const recorded = new Map();
    dom.document.createElement = (tagName) => {
        const element = createElement(tagName);
        element.getContext = (kind) => {
            if (kind !== '2d') return null;
            if (element._recording === undefined) {
                element._recording = createRecordingContext();
                recorded.set(element, element._recording.ops);
            }
            return element._recording.ctx;
        };
        return element;
    };
    const chart = createChart(dom.host, { width: 800, height: 400, ...options });
    const layer = (name) => {
        const root = dom.host.children[0];
        const canvas = root.children.find((child) => child.dataset.sschartLayer === name);
        assert.ok(canvas !== undefined, `the '${name}' layer must exist`);
        const ops = recorded.get(canvas);
        assert.ok(ops !== undefined, `the '${name}' layer must have taken a 2d context`);
        return ops;
    };
    return { chart, layer };
}

/**
 * Replay a recorded op log as a canvas state stack.
 * Returns the saves that were never restored, each carrying the clip left installed under it.
 */
function danglingSaves(ops) {
    const stack = [];
    let lastRect = null;
    for (const op of ops) {
        if (op.startsWith('rect(')) lastRect = op;
        else if (op === 'save()') stack.push({ clip: null });
        else if (op === 'restore()') stack.pop();
        else if (op === 'clip()' && stack.length > 0) stack[stack.length - 1].clip = lastRect;
    }
    return stack;
}

/** How deep the state stack is at the last full-canvas clear — i.e. what a later frame draws inside. */
function stackDepthAtLastClear(ops, clearOp) {
    let depth = 0;
    let atClear = null;
    for (const op of ops) {
        if (op === 'save()') depth++;
        else if (op === 'restore()') depth = Math.max(0, depth - 1);
        else if (op === clearOp) atClear = depth;
    }
    assert.ok(atClear !== null, `expected a '${clearOp}' op in the log`);
    return atClear;
}

/**
 * A primitive that throws out of paneViews() — user code the per-pane block calls with no guard.
 * `whenOverlay` picks the pass: drawBase runs the background/bottom/normal passes, drawOverlay the
 * top one, and the overlay log only starts growing once drawOverlay has cleared its canvas.
 */
function explodingPrimitive(message, overlayOps = null) {
    let mark = 0;
    return {
        attached() { },
        detached() { },
        updateAllViews() { mark = overlayOps === null ? 0 : overlayOps.length; },
        paneViews() {
            const inOverlayPass = overlayOps !== null && overlayOps.length > mark;
            if (overlayOps === null || inOverlayPass) throw new Error(message);
            return [];
        },
    };
}

const LINE = [
    { time: 3600, value: 10 },
    { time: 7200, value: 12 },
    { time: 10800, value: 11 },
];

const CLEAR = 'clearRect(0, 0, 800, 400)';

function paneManagerFixture(containerId) {
    const container = dom.document.createElement('div');
    container.insertBefore = (node) => container.appendChild(node);
    const chartElement = dom.document.createElement('div');
    container.appendChild(chartElement);

    const previousGetElementById = dom.document.getElementById;
    dom.document.getElementById = (id) => (id === containerId
        ? chartElement
        : (previousGetElementById === undefined ? null : previousGetElementById(id)));

    const manager = new ChartPaneManager(containerId);
    manager.init({ addPane: () => { throw new Error('no pane is added by this test'); } });
    return manager;
}

describe('the pane-manager global does not outlive its owner', () => {
    it('never leaves window._chartPaneManager pointing at a disposed manager', () => {
        dom = createHeadlessDom();
        installGlobal('ResizeObserver', class {
            observe() { }
            unobserve() { }
            disconnect() { }
        });

        const first = paneManagerFixture('chartA');
        assert.equal(dom.window._chartPaneManager, first, 'sanity: init() publishes the global');

        // A second chart in the same host — the case the audit calls last-writer-wins.
        const second = paneManagerFixture('chartB');
        const ownerAfterSecondInit = dom.window._chartPaneManager === second ? 'second'
            : dom.window._chartPaneManager === first ? 'first' : 'neither';

        second.dispose();
        const owner = dom.window._chartPaneManager;
        const state = owner === undefined || owner === null ? 'cleared'
            : owner === second ? 'the disposed manager'
            : owner === first ? 'the surviving manager'
            : 'something else';

        assert.ok(state === 'cleared' || state === 'the surviving manager',
            `window._chartPaneManager still names ${state} after dispose(): the second init() took `
            + `the global from the first (owner after it: '${ownerAfterSecondInit}'), and dispose() `
            + 'never gives it up, so every consumer that reads the global — ChartLegend does — is '
            + 'left talking to a dead manager');

        first.dispose();
    });
});

// ---------------------------------------------------------------------------
// 3.12 — a throwing intent handler must not erase the pending intent
// ---------------------------------------------------------------------------
