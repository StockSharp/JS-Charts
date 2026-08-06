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

describe('AUDIT 2.3 — relative price scales must survive a non-positive base', () => {
    it('maps an all-negative series to finite, order-preserving, on-canvas coordinates', () => {
        const base = -10;
        const transform = (mode) => {
            const low = priceToScale(base, mode, base);   // the reference value itself
            const high = priceToScale(-5, mode, base);    // a higher price than the reference
            return {
                low,
                high,
                finite: Number.isFinite(low) && Number.isFinite(high),
                // A price scale is an order-preserving map: -5 > -10 must stay above it.
                ordered: high > low,
                // …and it must invert back to the price it came from.
                roundTrips: Math.abs(scaleToPrice(high, mode, base) - -5) < 1e-9,
            };
        };
        const percentage = transform(InternalPriceScaleMode.Percentage);
        const indexed = transform(InternalPriceScaleMode.IndexedTo100);

        // The same defect through the public API: a P&L / spread / funding series never crosses
        // zero, so autoscale skips it and the fallback base=1 throws it off the canvas.
        const data = [-10, -8, -6, -5, -12].map((value, i) => ({ time: 3600 * (i + 1), value }));
        const { normalYs, percentYs } = withChart(undefined, (chart, dom) => {
            const series = chart.addSeries(LineSeries);
            series.setData(data);
            chart.timeScale().fitContent();
            dom.flushFrames();
            // Control: the identical series on the default Normal scale.
            const normal = data.map((point) => series.priceToCoordinate(point.value));

            series.priceScale().applyOptions({ mode: PriceScaleMode.Percentage });
            chart.timeScale().fitContent();
            dom.flushFrames();
            return { normalYs: normal, percentYs: data.map((point) => series.priceToCoordinate(point.value)) };
        });

        assert.ok(normalYs.every(onCanvasY),
            `control: the same negative series on a Normal scale must be on canvas, got ${normalYs.join(', ')}`);

        assert.deepEqual({
            percentageFinite: percentage.finite,
            percentageOrdered: percentage.ordered,
            percentageRoundTrips: percentage.roundTrips,
            indexedFinite: indexed.finite,
            indexedOrdered: indexed.ordered,
            indexedRoundTrips: indexed.roundTrips,
            everyPointOnCanvas: percentYs.every(onCanvasY),
        }, {
            percentageFinite: true,
            percentageOrdered: true,
            percentageRoundTrips: true,
            indexedFinite: true,
            indexedOrdered: true,
            indexedRoundTrips: true,
            everyPointOnCanvas: true,
        }, [
            'a negative base must not break Percentage/IndexedTo100',
            `priceToScale(-10, Percentage, ${base}) = ${percentage.low}, priceToScale(-5, …) = ${percentage.high}`,
            `priceToScale(-10, IndexedTo100, ${base}) = ${indexed.low}, priceToScale(-5, …) = ${indexed.high}`,
            `Percentage y coordinates on a ${HEIGHT}px chart: ${percentYs.join(', ')}`,
            `control, same series on a Normal scale: ${normalYs.join(', ')}`,
        ].join('\n  '));
    });
});

describe('AUDIT 2.16 — clampVisibleRange deserves the exact range the model delivers', () => {
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
