// Legend refresh behaviour under a live feed.
//
// The DOM double lives in tests/mini-dom.js; it has to be installed before the modules under test
// are required, because src/chart/i18n.ts reads window.__T once, at module-init time.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const DICTIONARY = {
    // Keys the dialog looks up by their exact English text — proof that translation works at all.
    Outputs: 'RENDERED-OUTPUTS',
    Source: 'RENDERED-SOURCE',
    // The stable, positional key the warning is owed (the file already uses this form for
    // 'Add {0}', 'Edit {0}' and 'Effective: {0}').
    'Source unavailable: {0}': 'RENDERED-UNAVAILABLE: {0}',
    // A per-reason key is at least as good as the positional one -- better wording, and the slug
    // never reaches the user. Either shape satisfies the invariant: the key is fixed text, so a
    // dictionary can hold it.
    'Source unavailable: the indicator it reads no longer exists': 'RENDERED-UNAVAILABLE: missing indicator',
    'missing-indicator': 'RENDERED-MISSING-INDICATOR',
    // Interpolated key that the current code actually asks for; deliberately absent, because a
    // dictionary cannot enumerate one entry per enum value.
};

const { installMiniDom } = require('./mini-dom.js');
const dom = installMiniDom(DICTIONARY);

// The modules under test are required *after* the DOM (and the dictionary) exist.
const { ChartLegend } = require('../src/chart/chart-legend.js');
const { IndicatorDialog } = require('../src/chart/indicator-dialog.js');
const {
    IndicatorSourceKind,
    IndicatorSourceStatusReason,
} = require('../src/indicators/index.js');

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

function clickEvent(target) {
    return { type: 'click', target, bubbles: true };
}

function bar(time, close) {
    return { time, open: close - 1, high: close + 2, low: close - 2, close, volume: 1000 };
}

function chartStub() {
    return {
        crosshairHandlers: [],
        subscribeCrosshairMove(handler) { this.crosshairHandlers.push(handler); },
        clearCrosshairPosition() { },
    };
}

/** The slice of the indicator engine the legend talks to (LegendIndicatorEngine). */
function indicatorEngineStub(values) {
    return {
        onChange: null,
        values,
        getIndicators() { return this.values.map((value) => ({ id: value.id })); },
        getValuesAt() { return this.values; },
        remove() { },
        // What IndicatorEngine.setOutputStyle does once the style really changed: _emitChange().
        emitChange() { this.onChange?.(); },
    };
}

function mountLegend(candles) {
    const host = document.createElement('div');
    host.setAttribute('id', 'chart-legend');
    document.body.appendChild(host);
    const legend = new ChartLegend();
    legend.init('chart-legend', chartStub());
    if (candles) legend.setRawCandles(candles);
    return legend;
}

beforeEach(() => {
    document.body.childNodes = [];
    dom.document.clearListeners();
});

// ---------------------------------------------------------------------------------------------

describe('legend refresh and indicator colours', () => {
    it('repaints an overlay indicator value in its new colour after a colour-only style edit', () => {
        const indicator = {
            id: 7, type: 'sma', name: 'SMA',
            values: { value: 42 }, colors: ['#ff0000'], paneId: null,
        };
        const engine = indicatorEngineStub([indicator]);
        const legend = mountLegend(null);
        legend.setIndicatorEngine(engine);
        legend.setRawCandles([bar(1700000000, 100)]);

        const painted = legend._el.querySelector('.legend-value');
        assert.ok(painted, 'the legend must paint a value span for an overlay indicator');
        assert.equal(painted.style.color, '#ff0000', 'first paint takes the colour the engine reports');

        // Control: a change the signature *does* see (different value keys) rebuilds the row and
        // paints the new colour — so what fails below is the signature, not this harness.
        engine.values = [{ ...indicator, values: { fast: 42, slow: 41 }, colors: ['#0000ff', '#0000ff'] }];
        engine.emitChange();
        assert.equal(legend._el.querySelector('.legend-value').style.color, '#0000ff',
            'control: the rebuild branch applies colours');
        engine.values = [indicator];
        engine.emitChange();
        assert.equal(legend._el.querySelector('.legend-value').style.color, '#ff0000',
            'control: back to the single-output shape, back to the original colour');

        // A colour-only edit through the editor: IndicatorController.update() short-circuits on
        // sameRecord, so the indicator keeps its id and its output keys; the engine applies the new
        // style and emits change, which is wired to legend.refresh() by setIndicatorEngine().
        engine.values = [{ ...indicator, colors: ['#00ff00'] }];
        engine.emitChange();

        const repainted = legend._el.querySelector('.legend-value');
        assert.equal(
            repainted.style.color, '#00ff00',
            'a colour-only style edit must reach the legend: the rebuild signature covers id and '
            + 'value keys only, so the in-place refresh rewrites the number and leaves the old colour',
        );
    });
});

describe('legend refresh under the cursor', () => {
    it('keeps the chart-type toggle node alive across a live refresh under the cursor', () => {
        const legend = mountLegend([bar(1700000000, 100)]);
        legend.refresh();

        const ohlcv = legend._el.querySelector('.legend-ohlcv');
        const toggle = legend._el.querySelector('.legend-ct-toggle');
        assert.ok(toggle, 'the OHLCV strip must carry the chart-type toggle');

        legend._el.dispatchEvent({ type: 'mouseenter', target: legend._el });
        assert.equal(legend._isHovered, true, 'the cursor is over the legend — hover freeze is on');

        // The terminal refreshes the legend every 350 ms off the live feed. The user is aiming at
        // the toggle: mousedown lands on the node below, mouseup on whatever exists 350 ms later.
        legend.setRawCandles([bar(1700000060, 101)]);
        legend.refresh();

        // Control: node identity is preserved by this harness wherever the code preserves it —
        // the .legend-ohlcv container survives the same refresh untouched.
        assert.ok(legend._el.querySelector('.legend-ohlcv') === ohlcv,
            'control: the container node is the same object after the refresh');

        const after = legend._el.querySelector('.legend-ct-toggle');
        assert.ok(
            after === toggle,
            'the chart-type toggle must survive a live refresh: _renderOHLCV rewrites the whole '
            + '.legend-ohlcv innerHTML — including the toggle — so a click straddling the refresh is '
            + 'silently dropped, the exact failure the file guards against for indicator rows',
        );
    });
});
