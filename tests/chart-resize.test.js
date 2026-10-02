// A resize that changes nothing leaves the picture alone, and one that changes the size is painted before the
// browser shows the frame.
//
// Writing a canvas's width or height wipes its pixels even when the value stays the same, and a redraw queued
// for the next animation frame runs a frame after the ResizeObserver callback that asked for it. A popup that
// merely nudged the page therefore left the chart blank for a frame -- a visible blink.

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { createChart, LineSeries } = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');
const { createRecordingContext } = require('./render/recording-context.js');

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

/**
 * Mount a chart whose canvases record their draw calls and count every write to their backing-store size,
 * the write that wipes them.
 */
function mount(options) {
    dom = createHeadlessDom();
    const canvases = [];
    const createElement = dom.document.createElement;
    dom.document.createElement = (tagName) => {
        const element = createElement(tagName);
        if (String(tagName).toLowerCase() !== 'canvas') return element;

        const canvas = { element, recording: createRecordingContext(), wipes: 0 };
        let width = 0;
        let height = 0;
        Object.defineProperty(element, 'width', {
            get: () => width,
            set: (value) => { width = value; canvas.wipes++; },
        });
        Object.defineProperty(element, 'height', {
            get: () => height,
            set: (value) => { height = value; canvas.wipes++; },
        });
        element.getContext = (kind) => (kind === '2d' ? canvas.recording.ctx : null);
        canvases.push(canvas);
        return element;
    };

    const chart = createChart(dom.host, options);
    chart.addSeries(LineSeries).setData([{ time: 1, value: 10 }, { time: 2, value: 11 }, { time: 3, value: 12 }]);
    dom.flushFrames();

    const base = canvases.find((canvas) => canvas.element.dataset.sschartLayer === 'base');
    assert.ok(base, 'the chart owns a base canvas');

    return {
        chart,
        wipes: () => canvases.reduce((sum, canvas) => sum + canvas.wipes, 0),
        /** What the base layer has drawn since the last call. */
        takeBaseOps: () => base.recording.ops.splice(0),
    };
}

/** The ResizeObserver the chart put on its host, with a way to deliver a size to it. */
function observeHosts() {
    const observers = [];
    installGlobal('ResizeObserver', class {
        constructor(callback) {
            this.callback = callback;
            this.targets = [];
            observers.push(this);
        }
        observe(target) { this.targets.push(target); }
        unobserve(target) { this.targets = this.targets.filter((each) => each !== target); }
        disconnect() { this.targets = []; }
    });
    return {
        deliver(host, width, height) {
            const observer = observers.find((each) => each.targets.includes(host));
            assert.ok(observer, 'the chart observes its host');
            observer.callback([{ target: host, contentRect: { width, height } }], observer);
        },
    };
}

describe('chart resize', () => {
    it('leaves the canvases alone when the size has not changed', () => {
        const { chart, wipes } = mount({ width: 800, height: 400 });
        const before = wipes();

        chart.resize(800, 400);

        assert.equal(wipes(), before, 'a resize to the size the chart already has must not wipe its canvases');
        chart.remove();
    });

    it('paints a new size at once instead of on the next frame', () => {
        const { chart, takeBaseOps } = mount({ width: 800, height: 400 });
        takeBaseOps();

        chart.resize(700, 350);

        const ops = takeBaseOps();
        assert.ok(ops.includes('fillRect(0, 0, 700, 350)'),
            `the wiped canvas must be repainted before the browser shows it, drawn so far: ${ops.slice(0, 6).join(' | ')}`);
        chart.remove();
    });

    it('paints the size its host was given within the observer callback', () => {
        const hosts = observeHosts();
        const { chart, takeBaseOps } = mount({});
        takeBaseOps();

        hosts.deliver(dom.host, 796, 400);

        const ops = takeBaseOps();
        assert.ok(ops.includes('fillRect(0, 0, 796, 400)'),
            `a host resized by the page must be repainted in the same frame, drawn so far: ${ops.slice(0, 6).join(' | ')}`);
        chart.remove();
    });
});
