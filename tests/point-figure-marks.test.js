// Point & Figure marks stay inside the column they describe.

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

describe('Point & Figure column marks', () => {
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
            + `[${centres.map((c) => Math.round(c * 1000) / 1000).join(', ')}] -- the top one sits at `
            + `${highest}, i.e. high + box/2, outside the range fed to autoscale`);

        assert.equal(centres.length, (column.high - column.low) / box,
            'a column of N boxes draws N marks, not N+1');
    });
});

