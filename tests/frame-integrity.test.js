// A primitive or renderer that throws must not strand a save()+clip() on the shared context, which
// would leave every later frame drawing inside a clip nobody asked for.

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

describe('a throwing primitive must not strand the shared canvas state', () => {
    it('keeps both layers balanced and unclipped, so later frames draw outside every pane clip', () => {
        const { chart, layer } = mountRecording();
        const main = chart.addSeries(LineSeries);
        main.setData(LINE);

        const lower = chart.addPane({ height: 120 });
        const sub = chart.addSeries(LineSeries, {}, lower);
        sub.setData(LINE);
        chart.timeScale().fitContent();
        assert.ok(dom.flushFrames() > 0, 'the chart must draw at least one clean frame first');

        assert.deepStrictEqual(danglingSaves(layer('base')), [],
            'sanity: a frame that does not throw balances every save() on the base layer');
        assert.deepStrictEqual(danglingSaves(layer('overlay')), [],
            'sanity: a frame that does not throw balances every save() on the overlay layer');

        // drawBase (chart-api.ts:2615). A primitive on the lower pane blows up inside the per-pane
        // save()+clip() block; paneViews() is called there with no guard at all.
        const baseBoom = explodingPrimitive('base primitive exploded');
        chart.attachPrimitive(baseBoom, { pane: lower });
        assert.throws(() => dom.flushFrames(), /base primitive exploded/,
            'the frame must fail through the scheduler — this is the crash the audit describes');
        const baseCrash = danglingSaves(layer('base'));

        // Next frame: the primitive is gone, so this one has nothing of its own to go wrong.
        chart.detachPrimitive(baseBoom);
        assert.ok(dom.flushFrames() > 0, 'detaching the primitive must schedule a repaint');
        const baseClipsLater = stackDepthAtLastClear(layer('base'), CLEAR);

        // drawOverlay (chart-api.ts:2809) carries the same unguarded block. This primitive lets the
        // base passes through and throws only once drawOverlay is inside its own save()+clip().
        const overlayBoom = explodingPrimitive('overlay primitive exploded', layer('overlay'));
        chart.attachPrimitive(overlayBoom, { pane: lower });
        assert.throws(() => dom.flushFrames(), /overlay primitive exploded/,
            'the overlay pass must be the one that fails here');
        const overlayCrash = danglingSaves(layer('overlay'));

        chart.detachPrimitive(overlayBoom);
        assert.ok(dom.flushFrames() > 0, 'detaching the primitive must schedule a repaint');
        const overlayClipsLater = stackDepthAtLastClear(layer('overlay'), CLEAR);

        const clean = { unbalancedSaves: 0, strandedClips: [], paneClipsAroundTheNextFrame: 0 };
        assert.deepStrictEqual(
            {
                base: {
                    unbalancedSaves: baseCrash.length,
                    strandedClips: baseCrash.map((entry) => entry.clip),
                    paneClipsAroundTheNextFrame: baseClipsLater,
                },
                overlay: {
                    unbalancedSaves: overlayCrash.length,
                    strandedClips: overlayCrash.map((entry) => entry.clip),
                    paneClipsAroundTheNextFrame: overlayClipsLater,
                },
            },
            { base: clean, overlay: clean },
            'the per-pane save()+clip() must be released on the way out of a throwing frame '
            + '(try/finally) in drawBase AND drawOverlay; otherwise the shared context keeps the '
            + `pane clip and every later frame — including its full-canvas ${CLEAR} — draws inside it`,
        );

        chart.remove();
    });
});

// ---------------------------------------------------------------------------
// 3.4 — the public surface after remove()
// ---------------------------------------------------------------------------
