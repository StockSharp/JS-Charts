// Legend refresh behaviour under a live feed.
//
// The DOM double lives in tests/mini-dom.js and has to be installed before the legend paints: the
// strip is written as innerHTML and every indicator row is built with document.createElement.
// Nothing is read off `window` any more — the legend takes its element, its host, its pane host,
// its chart-type list and its menu layer through the constructor, so the stubs below are the whole
// of the page as far as this file is concerned.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');
const dom = installMiniDom();

// The module under test is required *after* the DOM exists.
const { ChartLegend } = require('../src/chart/chart-legend.js');
const { createTranslate } = require('../src/chart/chart-host.js');

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

// The three keys the legend words itself, given renderable answers: a caption that reached the
// user without going through the host would not read like this.
const DICTIONARY = {
    Chart: 'RENDERED-CHART',
    Edit: 'RENDERED-EDIT',
    Remove: 'RENDERED-REMOVE',
};

// The renderings the page's switcher implements. The legend no longer carries a list of its own,
// so a menu entry exists here only because this page asked for it.
const CHART_TYPES = [
    { value: 'candle', label: 'Candles', icon: 'bi bi-bar-chart-fill' },
    { value: 'line', label: 'Line', icon: 'bi bi-graph-up' },
];

/**
 * The page, as the legend sees it. Every formatter marks its output, because the point of the
 * host is that the legend prints what the page words and nothing it worded itself — a number that
 * came out unmarked was formatted somewhere it should not have been.
 */
function hostStub() {
    return {
        translate: createTranslate(DICTIONARY),
        formatters: {
            price: (value) => `P<${value.toFixed(2)}>`,
            volume: (value) => `V<${value}>`,
            time: (timeSec) => `T<${timeSec}>`,
        },
        notify: () => { },
    };
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
    const container = document.createElement('div');
    container.setAttribute('id', 'chart-legend');
    document.body.appendChild(container);
    const legend = new ChartLegend({
        container,
        host: hostStub(),
        // Every indicator in this file is an overlay, so no sub-pane is ever asked for.
        paneHost: { getValuesElement: () => null },
        chartTypes: CHART_TYPES,
        menuLayer: () => document.body,
    });
    legend.init(chartStub());
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

        const painted = legend._container.querySelector('.legend-value');
        assert.ok(painted, 'the legend must paint a value span for an overlay indicator');
        assert.equal(painted.style.color, '#ff0000', 'first paint takes the colour the engine reports');

        // Control: a change the signature *does* see (different value keys) rebuilds the row and
        // paints the new colour — so what fails below is the signature, not this harness.
        engine.values = [{ ...indicator, values: { fast: 42, slow: 41 }, colors: ['#0000ff', '#0000ff'] }];
        engine.emitChange();
        assert.equal(legend._container.querySelector('.legend-value').style.color, '#0000ff',
            'control: the rebuild branch applies colours');
        engine.values = [indicator];
        engine.emitChange();
        assert.equal(legend._container.querySelector('.legend-value').style.color, '#ff0000',
            'control: back to the single-output shape, back to the original colour');

        // A colour-only edit through the editor: IndicatorController.update() short-circuits on
        // sameRecord, so the indicator keeps its id and its output keys; the engine applies the new
        // style and emits change, which is wired to legend.refresh() by setIndicatorEngine().
        engine.values = [{ ...indicator, colors: ['#00ff00'] }];
        engine.emitChange();

        const repainted = legend._container.querySelector('.legend-value');
        assert.equal(
            repainted.style.color, '#00ff00',
            'a colour-only style edit must reach the legend: the rebuild signature covers id and '
            + 'value keys only, so the in-place refresh has to re-apply the colour as well as the '
            + 'number, or a recoloured overlay wears its old colour until the indicator set changes',
        );
    });
});

describe('legend refresh under the cursor', () => {
    it('keeps the chart-type toggle node alive across a live refresh under the cursor', () => {
        const legend = mountLegend([bar(1700000000, 100)]);
        legend.refresh();

        const ohlcv = legend._container.querySelector('.legend-ohlcv');
        const toggle = legend._container.querySelector('.legend-ct-toggle');
        assert.ok(toggle, 'the OHLCV strip must carry the chart-type toggle');

        legend._container.dispatchEvent({ type: 'mouseenter', target: legend._container });
        assert.equal(legend._isHovered, true, 'the cursor is over the legend — hover freeze is on');

        // The terminal refreshes the legend every 350 ms off the live feed. The user is aiming at
        // the toggle: mousedown lands on the node below, mouseup on whatever exists 350 ms later.
        legend.setRawCandles([bar(1700000060, 101)]);
        legend.refresh();

        // Control: node identity is preserved by this harness wherever the code preserves it —
        // the .legend-ohlcv container survives the same refresh untouched.
        assert.ok(legend._container.querySelector('.legend-ohlcv') === ohlcv,
            'control: the container node is the same object after the refresh');

        const after = legend._container.querySelector('.legend-ct-toggle');
        assert.ok(
            after === toggle,
            'the chart-type toggle must survive a live refresh: rewriting the whole .legend-ohlcv '
            + 'innerHTML on every tick takes the toggle with it, so a click straddling the refresh '
            + 'is silently dropped — the exact failure the file guards against for indicator rows',
        );
    });
});

describe('legend paints through its host', () => {
    it('words every number through host.formatters, on the first paint and on a live refresh', () => {
        const indicator = {
            id: 3, type: 'sma', name: 'SMA',
            values: { value: 42.5 }, colors: ['#ff0000'], paneId: null,
        };
        const engine = indicatorEngineStub([indicator]);
        const legend = mountLegend(null);
        legend.setIndicatorEngine(engine);
        legend.setRawCandles([bar(1700000000, 100)]);

        const strip = (key) => legend._container.querySelector(`[data-ohlc="${key}"]`).textContent;
        assert.equal(strip('time'), 'T<1700000000>', 'the time cell asks host.formatters.time');
        assert.equal(strip('o'), 'P<99.00>', 'O asks host.formatters.price');
        assert.equal(strip('h'), 'P<102.00>');
        assert.equal(strip('l'), 'P<98.00>');
        assert.equal(strip('c'), 'P<100.00>');
        assert.equal(strip('v'), 'V<1000>', 'V asks host.formatters.volume, not the price formatter');
        assert.equal(
            legend._container.querySelector('.legend-value').textContent, 'SMA: P<42.50>',
            'an indicator value is a price as far as the page is concerned',
        );

        // The in-place branch: same id and same output keys, so no row is rebuilt and only the
        // number is rewritten — which has to reach the same formatter the first paint used.
        engine.values = [{ ...indicator, values: { value: 43.25 } }];
        engine.emitChange();
        assert.equal(legend._container.querySelector('.legend-value').textContent, 'SMA: P<43.25>',
            'the in-place refresh formats through the host too');
    });

    it('words every caption through host.translate', () => {
        const indicator = {
            id: 5, type: 'ema', name: 'EMA',
            values: { value: 1 }, colors: ['#fff'], paneId: null,
        };
        const engine = indicatorEngineStub([indicator]);
        const legend = mountLegend(null);
        legend.setIndicatorEngine(engine);
        legend.setRawCandles([bar(1700000000, 100)]);

        assert.equal(legend._container.querySelector('.legend-ct-toggle').title, 'RENDERED-CHART',
            "the toggle's tooltip comes from the host's dictionary");
        assert.equal(legend._container.querySelector('.legend-edit-btn').title, 'RENDERED-EDIT');
        assert.equal(legend._container.querySelector('.legend-remove-btn').title, 'RENDERED-REMOVE');
    });
});

// ---------------------------------------------------------------------------------------------
// Sub-pane rows
// ---------------------------------------------------------------------------------------------

/**
 * A pane host in the shape of LegendPaneHost: it hands back one element per pane and keeps it, so
 * the rows the legend paints into a pane header can be read back afterwards.
 *
 * mini-dom has no replaceChildren and the legend swaps a pane's rows with it, so the element gets
 * the one member the double is missing.
 */
function paneHostStub() {
    const elements = new Map();
    return {
        elements,
        getValuesElement(paneId) {
            let element = elements.get(paneId);
            if (element === undefined) {
                element = document.createElement('div');
                element.replaceChildren = (...nodes) => {
                    for (const child of element.childNodes) child.parentElement = null;
                    element.childNodes = [];
                    for (const node of nodes) element.appendChild(node);
                };
                elements.set(paneId, element);
            }
            return element;
        },
    };
}

/** mountLegend's sibling for indicators that live in a sub-pane instead of over the price. */
function mountPaneLegend(paneHost, values) {
    const container = document.createElement('div');
    container.setAttribute('id', 'chart-legend');
    document.body.appendChild(container);
    const legend = new ChartLegend({
        container,
        host: hostStub(),
        paneHost,
        chartTypes: CHART_TYPES,
        menuLayer: () => document.body,
    });
    legend.init(chartStub());
    legend.setIndicatorEngine(indicatorEngineStub(values));
    legend.setRawCandles([bar(1700000000, 100)]);
    return legend;
}

describe('sub-pane rows are named only when the pane label cannot name them', () => {
    it('leaves the single study in a pane unnamed and prints its value bare', () => {
        // ChartPaneManager already wrote "ACCELERATION (5, 34, 5)" into the header's own label, so
        // a row naming itself again reads "ACCELERATION (5, 34, 5)  Acceleration(5,34,5) 0.1418".
        const paneHost = paneHostStub();
        mountPaneLegend(paneHost, [{
            id: 11, type: 'acceleration', name: 'Acceleration(5,34,5)',
            values: { value: 0.1418 }, colors: ['#ff0000'], paneId: 'pane_1',
        }]);

        const el = paneHost.elements.get('pane_1');
        assert.ok(el, 'the legend has to ask the pane host for the pane its values belong to');
        // Counted rather than compared against null: a failing comparison would print a whole
        // mini-dom element, and the number says the same thing in one line.
        assert.equal(el.querySelectorAll('.pane-ind-name').length, 0,
            'the header label already names the one study in the pane — the row must not repeat it');
        assert.equal(el.querySelector('.pane-value').textContent, 'P<0.14>',
            'a single-output value is the bare number, with no "NAME: " in front of it');
    });

    it('names every row when a pane holds more than one study', () => {
        // One label cannot stand for two studies, so each row says which number is whose.
        const paneHost = paneHostStub();
        mountPaneLegend(paneHost, [
            {
                id: 21, type: 'rsi', name: 'RSI(14)',
                values: { value: 55.5 }, colors: ['#00ff00'], paneId: 'pane_2',
            },
            {
                id: 22, type: 'stochastic', name: 'Stochastic(14)',
                values: { value: 80.25 }, colors: ['#0000ff'], paneId: 'pane_2',
            },
        ]);

        const rows = paneHost.elements.get('pane_2').querySelectorAll('.legend-indicator');
        assert.equal(rows.length, 2, 'two studies sharing a pane paint two rows in the one header');
        assert.deepEqual(
            rows.map((row) => row.querySelector('.pane-ind-name')?.textContent),
            ['RSI(14)', 'Stochastic(14)'],
            'both rows carry their own name once the header label can no longer name them',
        );
        assert.deepEqual(
            rows.map((row) => row.querySelector('.pane-value').textContent),
            ['P<55.50>', 'P<80.25>'],
            'the name is its own node, so the value itself stays a bare number in either shape',
        );
    });

    it('leaves a multi-output study alone in a pane unnamed and keeps its inner keys as tooltips', () => {
        // ADX is one study printing two series: the pane label names the study, and the only thing
        // telling its two numbers apart is the tooltip each of them carries.
        const paneHost = paneHostStub();
        mountPaneLegend(paneHost, [{
            id: 31, type: 'adx', name: 'ADX (14)',
            values: { dmi: 24.5, wilderMa: 18.75 }, colors: ['#ff0000', '#00ff00'], paneId: 'pane_3',
        }]);

        const el = paneHost.elements.get('pane_3');
        assert.equal(el.querySelectorAll('.pane-ind-name').length, 0,
            'several outputs are still one study, and the header label names it');
        const values = el.querySelectorAll('.pane-value');
        assert.deepEqual(values.map((value) => value.textContent), ['P<24.50>', 'P<18.75>'],
            'multi-output values were already bare numbers and stay that way');
        assert.deepEqual(values.map((value) => value.title), ['dmi', 'wilderMa'],
            'each value keeps its inner key as a tooltip — it is how a reader tells the outputs apart');
    });

    it('keeps the edit and remove buttons on every row, named or not', () => {
        // The buttons are what a row is operated by, and a change to how rows are built is exactly
        // what drops them: a study whose row lost them can no longer be edited or taken off.
        const paneHost = paneHostStub();
        mountPaneLegend(paneHost, [
            {
                id: 41, type: 'atr', name: 'ATR(14)',
                values: { value: 3.5 }, colors: ['#ff0000'], paneId: 'alone',
            },
            {
                id: 42, type: 'rsi', name: 'RSI(14)',
                values: { value: 55.5 }, colors: ['#00ff00'], paneId: 'shared',
            },
            {
                id: 43, type: 'cci', name: 'CCI(20)',
                values: { value: -75 }, colors: ['#0000ff'], paneId: 'shared',
            },
        ]);

        const buttons = (paneId) => paneHost.elements.get(paneId)
            .querySelectorAll('.legend-indicator')
            .map((row) => ({
                edit: row.querySelector('.legend-edit-btn'),
                remove: row.querySelector('.legend-remove-btn'),
            }));

        const alone = buttons('alone');
        assert.equal(alone.length, 1, 'sanity: the study alone in its pane painted one row');
        assert.deepEqual(
            [alone[0].edit?.dataset.indId, alone[0].remove?.dataset.indId], ['41', '41'],
            'the unnamed row still carries both buttons, addressed to its own indicator',
        );
        assert.deepEqual([alone[0].edit.dataset.indType, alone[0].edit.title], ['atr', 'RENDERED-EDIT'],
            'the edit button keeps the type its dialog opens on and the caption the host words');
        assert.equal(alone[0].remove.title, 'RENDERED-REMOVE');

        const shared = buttons('shared');
        assert.equal(shared.length, 2, 'sanity: the two studies sharing a pane painted two rows');
        assert.deepEqual(
            shared.map((row) => [row.edit?.dataset.indId, row.remove?.dataset.indId]),
            [['42', '42'], ['43', '43']],
            'studies sharing a pane are managed independently — each named row keeps its own pair',
        );
    });
});
