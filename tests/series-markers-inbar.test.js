// A marker positioned inBar is centred on its price, not offset like the below-bar ones.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const { createChart, LineSeries } = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');
const { createRecordingContext } = require('./render/recording-context.js');
const { CanvasRenderTarget2D } = require('../src/core/render/canvas-render-target.js');
const { SeriesMarkersPrimitive } = require('../src/core/primitives/series-markers-primitive.js');
const { builtInSeriesDefinitions } = require('../src/series/built-in-renderers.js');

let dom = null;

afterEach(() => {
    dom?.restore();
    dom = null;
});

// ---------------------------------------------------------------------------
// shared doubles
// ---------------------------------------------------------------------------

const PANE_RECT = { x: 0, y: 0, width: 400, height: 200 };
const PANE = { ...PANE_RECT, plot: { ...PANE_RECT }, isLast: true };

const THEME = Object.freeze({
    backgroundColor: '#fff', textColor: '#111', fontFamily: 'sans-serif', fontSize: 12,
    verticalGridColor: '#eee', horizontalGridColor: '#eee',
});

/** Linear price<->y mapping over [min,max] on PANE_RECT, exactly invertible. */
function scale(min, max) {
    const toY = (price) => PANE_RECT.y + ((max - price) / (max - min)) * PANE_RECT.height;
    const toPrice = (y) => max - ((y - PANE_RECT.y) / PANE_RECT.height) * (max - min);
    return { toY, toPrice };
}

/**
 * Draw one marker through the real primitive and return the recorded ops.
 * The bar is flat (o=h=l=c) so every anchor rule resolves to the same price and
 * the only thing the y coordinate can encode is the vertical offset under test.
 */
function markerOps(position, price) {
    const { toY } = scale(88, 122);
    const bar = { time: 5, open: price, high: price, low: price, close: price, value: price };
    const primitive = new SeriesMarkersPrimitive({
        series: { priceToCoordinate: toY, priceScaleId: () => 'right' },
        pointAtTime: (time) => (time === bar.time ? bar : null),
        priceValue: (point) => point.close,
    });
    primitive.setMarkers([{ time: bar.time, position, color: '#f00', shape: 'circle' }]);
    primitive.attached({
        requestUpdate: () => {},
        timeToCoordinate: () => 200,
        theme: () => THEME,
        pixelRatio: () => 1,
        addDisposable: () => {},
    });

    const { ctx, ops } = createRecordingContext();
    const target = new CanvasRenderTarget2D(ctx, PANE_RECT.width, PANE_RECT.height, 1, PANE);
    primitive.paneViews()[0].renderer().draw(target);
    return ops;
}

/** Centre y of the single circle the marker renderer emits. */
function circleCentreY(ops) {
    const arcs = ops.filter((op) => op.startsWith('arc('));
    assert.equal(arcs.length, 1, `expected exactly one marker circle, got: ${ops.join(' | ')}`);
    const parts = arcs[0].slice(4, -1).split(', ').map(Number);
    return parts[1];
}

/** Mount a real chart on the headless DOM with every canvas context recording its ops. */
function mountRecording(options) {
    dom = createHeadlessDom();
    const recordings = [];
    const createElement = dom.document.createElement;
    dom.document.createElement = (tagName) => {
        const element = createElement(tagName);
        if (String(tagName).toLowerCase() === 'canvas') {
            const recording = createRecordingContext();
            recordings.push(recording);
            element.getContext = (kind) => (kind === '2d' ? recording.ctx : null);
        }
        return element;
    };
    const chart = createChart(dom.host, { width: 800, height: 400, ...options });
    return { chart, ops: () => recordings.flatMap((recording) => recording.ops) };
}

// ---------------------------------------------------------------------------
// 2.1 — 'inBar' is drawn through the belowBar branch
// ---------------------------------------------------------------------------

describe('series marker positioned inBar', () => {
    it('centres the marker on its price instead of pushing it below the bar', () => {
        const { toY } = scale(88, 122);
        const price = 105;
        const baseY = toY(price);

        // Controls: the two positions that do have an offset must keep it, so a failure below
        // cannot be blamed on the harness.
        assert.equal(circleCentreY(markerOps('aboveBar', price)), baseY - 14,
            'aboveBar must stay 14px above the anchor');
        assert.equal(circleCentreY(markerOps('belowBar', price)), baseY + 14,
            'belowBar must stay 14px below the anchor');

        assert.equal(circleCentreY(markerOps('inBar', price)), baseY,
            "'inBar' must be centred on the price (lwc parity), not offset like belowBar");
    });
});

// ---------------------------------------------------------------------------
// 2.2 — devicePixelRatio is only ever read inside applySize
// ---------------------------------------------------------------------------
