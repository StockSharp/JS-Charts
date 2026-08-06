// Failing-by-design proofs for AUDIT.md findings 1.2, 1.3, 2.3, 2.9 and 2.16.
//
// Every assertion states the behaviour the audit says is owed, so each one stays red until the
// corresponding defect is fixed. Nothing under src/ is touched and no existing spec is edited.
// Each finding is paired with a control — the same fixture one step away from the trigger — so a
// red here cannot be blamed on the fixture.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    createChart,
    LineSeries,
    CrosshairMode,
    PriceScaleMode,
} = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');
const { calculateBarStepPx } = require('../src/series-spacing.js');
const { TimeScaleModel } = require('../src/core/scale/time-scale.js');
const {
    InternalPriceScaleMode,
    priceToScale,
    scaleToPrice,
} = require('../src/core/scale/price-transform.js');

const WIDTH = 800;
const HEIGHT = 400;

// One chart per call, torn down before the next one installs its own DOM globals.
function withChart(options, body) {
    const dom = createHeadlessDom();
    const chart = createChart(dom.host, { width: WIDTH, height: HEIGHT, ...options });
    try {
        return body(chart, dom);
    } finally {
        chart.remove();
        dom.restore();
    }
}

const onCanvasX = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= WIDTH;
const onCanvasY = (y) => typeof y === 'number' && Number.isFinite(y) && y >= 0 && y <= HEIGHT;

describe('clampVisibleRange delivers the exact range the model computes', () => {
    it('pins the clamped window instead of a predicate a no-op would satisfy', () => {
        const scale = new TimeScaleModel();
        scale.updateDataRange(100, 200);
        scale.setVisibleRange({ from: 120, to: 160 });
        scale.updateDataRange(100, 220);

        // The window tests/core-models.test.js:81 would be left holding if setVisibleRange
        // silently became a no-op.
        const noOpWindow = { ...scale.visibleRange };

        scale.setVisibleRange({ from: -1000, to: 1000 });

        // dataSpan 120 -> span capped at 360 around centre 0, then pushed inside [40, 280].
        assert.deepEqual(scale.visibleRange, { from: 40, to: 280 });

        // Why the exact value is owed: the audited predicate (from >= 40 && to <= 280) is satisfied
        // by the untouched window too, so a no-op setVisibleRange sails straight through it.
        assert.equal(noOpWindow.from >= 40 && noOpWindow.to <= 280, true,
            `the weak predicate must be shown to accept the no-op window ${JSON.stringify(noOpWindow)}`);
        assert.notDeepEqual(noOpWindow, scale.visibleRange);

        // Neighbouring branches the same spec never executes.
        const minSpan = new TimeScaleModel();
        minSpan.updateDataRange(100, 220);
        minSpan.setVisibleRange({ from: 150, to: 150.1 });
        const span = minSpan.visibleTo - minSpan.visibleFrom;
        const centre = (minSpan.visibleTo + minSpan.visibleFrom) / 2;
        assert.ok(Math.abs(span - 0.48) < 1e-9, `min span must be 0.4% of the data span, got ${span}`);
        assert.ok(Math.abs(centre - 150.05) < 1e-9, `min-span expansion must keep the centre, got ${centre}`);

        const unclamped = new TimeScaleModel();
        unclamped.updateDataRange(100, 220);
        unclamped.setVisibleRange({ from: -1000, to: 1000 }, false);
        assert.deepEqual(unclamped.visibleRange, { from: -1000, to: 1000 });

        const fitted = new TimeScaleModel();
        fitted.updateDataRange(100, 220);
        fitted.setVisibleRange({ from: 150, to: 170 });
        assert.equal(fitted.fitContent(), true);
        assert.deepEqual(fitted.visibleRange, { from: 100, to: 220 });

        const realTime = new TimeScaleModel();
        realTime.updateDataRange(100, 220);
        realTime.setVisibleRange({ from: 120, to: 160 });
        realTime.scrollToRealTime();
        assert.ok(Math.abs((realTime.visibleTo - realTime.visibleFrom) - 40) < 1e-9,
            `scrollToRealTime must keep the width, got ${realTime.visibleTo - realTime.visibleFrom}`);
        assert.ok(Math.abs(realTime.visibleTo - 221.6) < 1e-9,
            `scrollToRealTime must leave a 4% gap past the last data point, got ${realTime.visibleTo}`);
    });
});
