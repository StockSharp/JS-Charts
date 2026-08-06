// A series holding a single bar still produces a usable time range: the first candle of a history,
// or the first tick into an empty series, must not leave the chart blank.

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

describe('a one-bar series must still produce a usable time range', () => {
    it('puts the single bar inside the visible range and on the canvas', () => {
        const time = 1_700_000_000;

        // Control: the same fixture with a second bar. Proves the harness, the series type and the
        // timestamps are fine, and that a bar count of one is the only difference.
        const control = withChart(undefined, (chart) => {
            const series = chart.addSeries(LineSeries);
            series.setData([{ time, value: 100 }, { time: time + 60, value: 101 }]);
            return {
                range: chart.timeScale().getVisibleRange(),
                x: chart.timeScale().timeToCoordinate(time),
            };
        });
        assert.ok(control.range !== null && control.range.from <= time && time <= control.range.to
            && onCanvasX(control.x),
            `control: two bars must map normally, got range ${JSON.stringify(control.range)}, x ${control.x}`);

        // The normal start of a live feed: the first history candle, or the first update() into an
        // empty series. lightweight-charts draws a single bar; so must this engine.
        const single = withChart(undefined, (chart) => {
            const series = chart.addSeries(LineSeries);
            series.setData([{ time, value: 100 }]);
            const afterSetData = chart.timeScale().getVisibleRange();
            const xAfterSetData = chart.timeScale().timeToCoordinate(time);

            // Both documented escape hatches must be able to recover the view as well.
            chart.timeScale().fitContent();
            const afterFit = chart.timeScale().getVisibleRange();
            const xAfterFit = chart.timeScale().timeToCoordinate(time);

            chart.timeScale().setVisibleRange({ from: time - 60, to: time + 60 });
            const afterSetRange = chart.timeScale().getVisibleRange();
            const xAfterSetRange = chart.timeScale().timeToCoordinate(time);

            return { afterSetData, xAfterSetData, afterFit, xAfterFit, afterSetRange, xAfterSetRange };
        });

        const contains = (range) => range !== null && range.from <= time && time <= range.to;

        assert.deepEqual({
            rangeContainsBar: contains(single.afterSetData),
            barOnCanvas: onCanvasX(single.xAfterSetData),
            fitContentContainsBar: contains(single.afterFit),
            fitContentPutsBarOnCanvas: onCanvasX(single.xAfterFit),
            setVisibleRangeContainsBar: contains(single.afterSetRange),
            setVisibleRangePutsBarOnCanvas: onCanvasX(single.xAfterSetRange),
        }, {
            rangeContainsBar: true,
            barOnCanvas: true,
            fitContentContainsBar: true,
            fitContentPutsBarOnCanvas: true,
            setVisibleRangeContainsBar: true,
            setVisibleRangePutsBarOnCanvas: true,
        }, [
            'a single-bar series must initialize the time range',
            `setData        -> range ${JSON.stringify(single.afterSetData)}, x ${single.xAfterSetData}`,
            `fitContent     -> range ${JSON.stringify(single.afterFit)}, x ${single.xAfterFit}`,
            `setVisibleRange({${time - 60},${time + 60}}) -> range ${JSON.stringify(single.afterSetRange)}, `
                + `x ${single.xAfterSetRange}`,
            `control (two bars) -> range ${JSON.stringify(control.range)}, x ${control.x}`,
            `(bar time ${time}, canvas width ${WIDTH}px)`,
        ].join('\n  '));
    });
});
