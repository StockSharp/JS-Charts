const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { createChart, LineSeries } = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');

let dom = null;

afterEach(() => {
    dom?.restore();
    dom = null;
});

/**
 * headless-dom's window swallows listeners (`addEventListener() { }`), and the chart binds the
 * placement modifier to window keydown/keyup. Give the window a real listener registry before the
 * chart is constructed so the modifier can actually be pressed.
 */
function mountWithKeyboard() {
    dom = createHeadlessDom();
    const listeners = new Map();
    dom.window.addEventListener = (type, listener) => {
        let bucket = listeners.get(type);
        if (bucket === undefined) listeners.set(type, bucket = new Set());
        bucket.add(listener);
    };
    dom.window.removeEventListener = (type, listener) => { listeners.get(type)?.delete(listener); };
    const chart = createChart(dom.host, { width: 800, height: 400 });
    return {
        chart,
        key(type, event) {
            for (const listener of [...(listeners.get(type) ?? [])]) listener({ type, ...event });
        },
    };
}

function pointerMove(chart, x, y, event = {}) {
    const overlay = dom.host.children[0].children[1];
    overlay.dispatchEvent({
        type: 'pointermove', pointerId: 1, clientX: x, clientY: y, button: 0, ...event,
    });
    return chart;
}

const PRICE_BARS = Array.from({ length: 30 }, (_, index) => ({
    time: 3600 * (index + 1),
    value: 60_000 + index * 25,
}));
const RSI_BARS = Array.from({ length: 30 }, (_, index) => ({
    time: 3600 * (index + 1),
    value: 40 + (index % 10) * 2,
}));

describe('order-placement preview', () => {
    it('moves the preview line onto the series of the pane under the cursor', () => {
        const { chart, key } = mountWithKeyboard();
        const price = chart.addSeries(LineSeries);
        price.setData(PRICE_BARS);
        const studyPane = chart.addPane();
        const rsi = chart.addSeries(LineSeries, {}, studyPane);
        rsi.setData(RSI_BARS);
        chart.timeScale().fitContent();
        dom.flushFrames();

        const mainRect = chart.panes()[0].getSize();
        const studyRect = studyPane.getSize();
        const mainY = mainRect.top + mainRect.height / 2;
        const studyY = studyRect.top + studyRect.height / 2;
        assert.ok(studyRect.height > 0, 'the study pane must have been laid out');

        const placed = [];
        chart.setOrderPlacement({ modifier: 'ctrl' });
        chart.subscribeOrderPlace((event) => placed.push(event));
        key('keydown', { ctrlKey: true });

        // Cursor starts on the price pane: the preview belongs to the price series.
        pointerMove(chart, 300, mainY, { ctrlKey: true });
        assert.equal(price.priceLines.length, 1, 'the preview starts on the price series');
        assert.equal(rsi.priceLines.length, 0);

        // Cursor crosses into the study pane. The click would emit against the study pane, so the
        // preview owes the user the same pane — it must not stay drawn on the price scale.
        pointerMove(chart, 300, studyY, { ctrlKey: true });

        // The preview price is recomputed against the pane under the cursor either way; what the
        // audit is about is which series the line is drawn on.
        const preview = price.priceLines[0] ?? rsi.priceLines[0];
        assert.ok(preview !== undefined, 'a preview line must exist while the modifier is held');
        const previewPrice = preview.options().price;
        assert.ok(previewPrice > 30 && previewPrice < 80,
            `the preview price must come from the pane under the cursor, got ${previewPrice}`);
        const drawnOnPrice = price.priceToCoordinate(previewPrice);
        const drawnOnRsi = rsi.priceToCoordinate(previewPrice);

        assert.deepEqual(
            { price: price.priceLines.length, rsi: rsi.priceLines.length },
            { price: 0, rsi: 1 },
            'the preview line must be re-created on the series under the cursor'
            + ` (cursor y=${studyY}; drawn on the price series it lands at y=${drawnOnPrice},`
            + ` on the study series at y=${drawnOnRsi})`,
        );

        chart.setOrderPlacement(null);
        chart.remove();
    });
});
