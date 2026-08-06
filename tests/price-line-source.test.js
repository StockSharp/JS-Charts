// Which point feeds a series' price-axis tag: priceLineSource.
//
// The default is 'lastVisible' -- the tag follows the right edge of the window, so panning does
// not look frozen -- while lightweight-charts defaults to 'lastBar'. The declaration and the
// comment beside the code both used to claim 'lastBar', and nothing pinned either branch, so the
// source contradicted itself in both directions and the real answer lived only in one `??`.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { createChart, LineSeries } = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');
const { createRecordingContext } = require('./render/recording-context.js');

let dom = null;

afterEach(() => {
    dom?.restore();
    dom = null;
});

/** A chart whose canvases hand out recording contexts, so what it painted is readable. */
function mountRecording() {
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
    const chart = createChart(dom.host, { width: 800, height: 400 });
    return {
        chart,
        /** Every string the base layer wrote, in order. Ops are recorded as source text. */
        texts() {
            const root = dom.host.children[0];
            const canvas = root.children.find(child => child.dataset.sschartLayer === 'base');
            return (recorded.get(canvas) ?? [])
                .map(op => /^fillText\("([^"]*)"/.exec(op)?.[1])
                .filter(text => text !== undefined);
        },
    };
}

const BARS = Array.from({ length: 40 }, (_, index) => ({
    time: 3_600 * (index + 1),
    value: 100 + index,
}));

/** Per-series tags are painted after the grid and the time labels, so they close the log. */
function axisTags(texts) {
    const afterLastTimeLabel = texts.map(text => /^\d{2}:\d{2}/.test(text)).lastIndexOf(true) + 1;
    return texts.slice(afterLastTimeLabel);
}

describe('priceLineSource', () => {
    it('tags the last visible point by default, so panning keeps the tag live', () => {
        const { chart, texts } = mountRecording();
        const series = chart.addSeries(LineSeries);
        series.setData(BARS);
        // Look at the first half of the history: the newest bar is off to the right.
        chart.timeScale().setVisibleRange({ from: BARS[0].time, to: BARS[19].time });
        dom.flushFrames();

        assert.deepEqual(
            axisTags(texts()),
            ['119.00'],
            'the tag follows the right edge of the window (bar 20 = 119), not the newest bar',
        );
    });

    it("tags the last bar of the history when asked for 'lastBar'", () => {
        const { chart, texts } = mountRecording();
        const series = chart.addSeries(LineSeries, { priceLineSource: 'lastBar' });
        series.setData(BARS);
        chart.timeScale().setVisibleRange({ from: BARS[0].time, to: BARS[19].time });
        dom.flushFrames();

        assert.deepEqual(
            axisTags(texts()),
            ['139.00'],
            'lastBar means the newest point in the data, on screen or not',
        );
    });

    it('paints no tag at all when the series hides its last value', () => {
        const { chart, texts } = mountRecording();
        const series = chart.addSeries(LineSeries, { lastValueVisible: false });
        series.setData(BARS);
        chart.timeScale().fitContent();
        dom.flushFrames();

        assert.deepEqual(axisTags(texts()), []);
    });
});
