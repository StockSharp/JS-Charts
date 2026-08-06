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

describe('relative price scales survive a non-positive base', () => {
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
