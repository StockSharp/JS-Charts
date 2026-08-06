// Failing-by-design proofs for the render findings of AUDIT.md (2.1, 2.2, 3.1, 3.9, 3.14).
//
// Every assertion below states the behaviour the audit says is owed, so each one goes red while
// the defect lives and green the moment it is fixed. Nothing here pins current behaviour.

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

describe('AUDIT 2.1 — series marker positioned inBar', () => {
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

describe('AUDIT 2.2 — devicePixelRatio change without a CSS size change', () => {
    it('resizes the backing store when the window moves to a 2x display', () => {
        dom = createHeadlessDom();

        // Give the engine the mechanism a fix is expected to use: a matchMedia whose
        // change event fires when the resolution changes. Without it a fixed engine
        // would have nothing to listen to and this test would be unfair.
        const queries = [];
        dom.window.matchMedia = (media) => {
            const listeners = new Set();
            const query = {
                media,
                matches: true,
                onchange: null,
                addEventListener: (type, listener) => { if (type === 'change') listeners.add(listener); },
                removeEventListener: (type, listener) => { if (type === 'change') listeners.delete(listener); },
                addListener: (listener) => listeners.add(listener),
                removeListener: (listener) => listeners.delete(listener),
                fire() {
                    const event = { type: 'change', matches: false, media };
                    if (typeof query.onchange === 'function') query.onchange(event);
                    for (const listener of [...listeners]) listener(event);
                },
            };
            queries.push(query);
            return query;
        };

        const chart = createChart(dom.host, { width: 800, height: 400 });
        const series = chart.addSeries(LineSeries);
        series.setData([{ time: 1, value: 10 }, { time: 2, value: 11 }, { time: 3, value: 12 }]);
        dom.flushFrames();

        const canvases = dom.host.children[0].children;
        assert.equal(canvases.length, 2, 'chart owns a base and an overlay canvas');
        for (const canvas of canvases) {
            assert.equal(canvas.width, 800, 'backing store starts at DPR 1');
            assert.equal(canvas.height, 400, 'backing store starts at DPR 1');
        }

        // The window is dragged to a hi-dpi monitor: DPR changes, CSS size does not.
        dom.window.devicePixelRatio = 2;
        for (const query of queries) query.fire();
        dom.flushFrames();

        for (const canvas of canvases) {
            assert.equal(canvas.width, 1600,
                'a DPR change with no CSS resize must re-apply the backing store (800 CSS px * 2)');
            assert.equal(canvas.height, 800,
                'a DPR change with no CSS resize must re-apply the backing store (400 CSS px * 2)');
            assert.equal(canvas.style.width, '800px', 'the CSS size must not move');
        }

        chart.remove();
    });
});

// ---------------------------------------------------------------------------
// 3.1 — pane separator uses the half-pixel stroke trick on a fill
// ---------------------------------------------------------------------------

describe('AUDIT 3.1 — pane separator fill', () => {
    it('lands the 1px separator on a whole device row at DPR 1', () => {
        const { chart, ops } = mountRecording();
        const main = chart.addSeries(LineSeries);
        main.setData([{ time: 1, value: 10 }, { time: 2, value: 11 }, { time: 3, value: 12 }]);
        const pane = chart.addPane({ id: 'oscillator', height: 120, minHeight: 60 });
        const sub = chart.addSeries(LineSeries, {}, pane);
        sub.setData([{ time: 1, value: 40 }, { time: 2, value: 55 }, { time: 3, value: 50 }]);
        dom.flushFrames();

        const separators = ops()
            .map((op) => /^fillRect\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+), 1\)$/.exec(op))
            .filter((match) => match !== null && Number(match[3]) === 800)
            .map((match) => Number(match[2]));

        assert.ok(separators.length > 0,
            `expected the two-pane layout to draw a separator, ops: ${ops().filter((o) => o.startsWith('fillRect(')).join(' | ')}`);

        for (const y of separators) {
            assert.ok(Number.isInteger(y),
                `a 1px fillRect must sit on a whole device row at DPR 1, got y=${y} `
                + '(the +0.5 half-pixel trick belongs to stroke, not fill: it splits the line '
                + 'across two rows at 50% alpha)');
        }

        chart.remove();
    });
});

// ---------------------------------------------------------------------------
// 3.9 — P&F draws one mark above the column top
// ---------------------------------------------------------------------------

describe('AUDIT 3.9 — Point & Figure column marks', () => {
    it('keeps every mark inside the [low, high] the same definition reports to autoscale', () => {
        const definition = builtInSeriesDefinitions.find((d) => d.type === 'PointFigure');
        assert.ok(definition, 'PointFigure definition must exist');

        const box = 1;
        // One falling column (close < open) so each box is drawn as a circle: easy to read back.
        const column = { time: 0, open: 105, high: 105, low: 100, close: 100 };
        const data = [column];
        const options = { upColor: '#00c853', downColor: '#ff3d57' };

        const range = definition.renderer.priceRange(data, options);
        assert.deepEqual({ min: range.min, max: range.max }, { min: column.low, max: column.high },
            'autoscale is told the column spans exactly [low, high]');

        const { toY, toPrice } = scale(95, 110);
        const { ctx, ops } = createRecordingContext();
        definition.renderer.draw({
            target: ctx,
            data,
            allData: data,
            options,
            priceRange: { min: column.low, max: column.high },
            visibleTimeRange: { from: 0, to: 0 },
            pane: { ...PANE_RECT, left: 0, right: 400, top: 0, bottom: 200 },
            theme: { fontFamily: 'sans-serif', textColor: '#111' },
            barSpacing: 20,
            metadata: { box },
            timeToCoordinate: () => 200,
            priceToCoordinate: toY,
        });

        const centres = ops
            .filter((op) => op.startsWith('arc('))
            .map((op) => toPrice(Number(op.slice(4, -1).split(', ')[1])));
        assert.ok(centres.length > 0, `expected P&F marks, ops: ${ops.join(' | ')}`);

        const highest = Math.max(...centres);
        const lowest = Math.min(...centres);
        assert.ok(highest <= range.max + 1e-9 && lowest >= range.min - 1e-9,
            `every mark must be centred inside [${range.min}, ${range.max}], got centres `
            + `[${centres.map((c) => Math.round(c * 1000) / 1000).join(', ')}] — the top one sits at `
            + `${highest}, i.e. high + box/2, outside the range fed to autoscale`);

        assert.equal(centres.length, (column.high - column.low) / box,
            'a column of N boxes draws N marks, not N+1');
    });
});

// ---------------------------------------------------------------------------
// 3.14 — the draw-call gate bootstraps a missing snapshot and passes
// ---------------------------------------------------------------------------

