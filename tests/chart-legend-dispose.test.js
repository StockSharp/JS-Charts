// ChartLegend teardown: every listener and node it installed has to come back.
//
// Construction moved into the constructor when the UI layer became its own entry point: the legend
// is handed the element it paints into, the host that words its strings and numbers, the pane host
// that owns sub-pane headers, the chart types the page's switcher implements and the layer its
// floating menu opens in. Nothing is looked up by id and nothing is read off window. What dispose()
// owes did not change, and the per-instance menu adds one guarantee worth pinning: the menu a
// legend takes down is its own, so a second legend on the page survives the first one disposing.
//
// The DOM double lives in tests/mini-dom.js — the legend is written in innerHTML, querySelector and
// event bubbling, none of which tests/headless-dom.js offers.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');
const dom = installMiniDom();

// The module under test is required after the DOM double is in place.
const { ChartLegend } = require('../src/chart/chart-legend.js');
const { standaloneHost } = require('../src/chart/chart-host.js');

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

/** The renderings the page says its switcher implements — the legend no longer decides this. */
const CHART_TYPES = [
    { value: 'candles', label: 'Candles', icon: 'bi bi-bar-chart-fill' },
    { value: 'line', label: 'Line', icon: 'bi bi-graph-up' },
];

function clickEvent(target) {
    return { type: 'click', target, bubbles: true };
}

function bar(time, close) {
    return { time, open: close - 1, high: close + 2, low: close - 2, close, volume: 1000 };
}

/**
 * A pane host in the shape of LegendPaneHost: it hands back an element per pane and keeps them, so
 * a test can count the handlers the legend bound on one.
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

/** The slice of the indicator engine the legend talks to (LegendIndicatorEngine). */
function indicatorEngineStub(values) {
    return {
        onChange: null,
        values,
        removed: [],
        getIndicators() { return this.values.map((value) => ({ id: value.id })); },
        getValuesAt() { return this.values; },
        remove(id) { this.removed.push(id); },
    };
}

function legendFixture() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const crosshairHandlers = [];
    const chart = {
        subscribeCrosshairMove(handler) { crosshairHandlers.push(handler); },
        unsubscribeCrosshairMove(handler) {
            const at = crosshairHandlers.indexOf(handler);
            if (at >= 0) crosshairHandlers.splice(at, 1);
        },
        clearCrosshairPosition() { },
    };

    const paneHost = paneHostStub();
    const legend = new ChartLegend({
        container,
        host: standaloneHost,
        paneHost,
        chartTypes: CHART_TYPES,
        menuLayer: () => document.body,
    });
    return { container, chart, crosshairHandlers, paneHost, legend };
}

beforeEach(() => {
    document.body.childNodes = [];
    dom.document.clearListeners();
});

// ---------------------------------------------------------------------------------------------

describe('ChartLegend is detachable', () => {
    it('releases its DOM listeners, its crosshair subscription and the engine hook it wrapped', () => {
        const { container, chart, crosshairHandlers, legend } = legendFixture();
        const originalOnChange = () => { };
        const engine = indicatorEngineStub([]);
        engine.onChange = originalOnChange;

        legend.init(chart);
        legend.setIndicatorEngine(engine);

        assert.equal(crosshairHandlers.length, 1, 'sanity: init() subscribed to crosshair moves');
        assert.notEqual(engine.onChange, originalOnChange, 'sanity: setIndicatorEngine wrapped onChange');

        const teardown = typeof legend.dispose === 'function' ? 'dispose()'
            : typeof legend.destroy === 'function' ? 'destroy()'
            : 'none';
        if (teardown === 'dispose()') legend.dispose();
        else if (teardown === 'destroy()') legend.destroy();

        const domListeners = ['mouseenter', 'mouseleave', 'click']
            .reduce((total, type) => total + container.listenerCount(type), 0);

        assert.deepStrictEqual(
            {
                teardown,
                domListeners,
                crosshairSubscriptions: crosshairHandlers.length,
                engineHookRestored: engine.onChange === originalOnChange,
            },
            {
                teardown: 'dispose()',
                domListeners: 0,
                crosshairSubscriptions: 0,
                engineHookRestored: true,
            },
            'a host that rebuilds its chart on every symbol/timeframe change must be able to detach '
            + 'the legend cleanly: without a teardown the DOM listeners, the crosshair subscription '
            + 'and the irreversible engine.onChange wrapper all outlive the legend',
        );
    });

    it('releases the click handler it bound on a sub-pane values element', () => {
        const { chart, paneHost, legend } = legendFixture();
        const engine = indicatorEngineStub([{
            id: 7,
            type: 'rsi',
            name: 'RSI',
            values: { value: 55 },
            colors: ['#4caf50'],
            paneId: 'pane-1',
        }]);

        legend.init(chart);
        legend.setIndicatorEngine(engine);
        legend.setRawCandles([bar(3600, 100)]);

        const values = paneHost.elements.get('pane-1');
        assert.ok(values !== undefined, 'sanity: the legend asked the pane host for its values element');
        assert.equal(values.listenerCount('click'), 1,
            'sanity: the legend answers clicks on the rows it painted into the pane header');

        const remove = values.querySelector('.legend-remove-btn');
        assert.ok(remove, 'sanity: the pane row carries the × button');
        remove.dispatchEvent(clickEvent(remove));
        assert.deepStrictEqual(engine.removed, [7], 'sanity: that button reaches the indicator engine');

        legend.dispose();

        remove.dispatchEvent(clickEvent(remove));
        assert.deepStrictEqual(
            { listeners: values.listenerCount('click'), removedAfterDispose: engine.removed },
            { listeners: 0, removedAfterDispose: [7] },
            'the values element belongs to the pane host and outlives the legend: a legend that '
            + 'leaves its handler on it keeps answering clicks against an engine it no longer owns, '
            + 'and the next legend mounted on the same pane collects a second handler',
        );
    });

    it('leaves no closer behind when disposed between opening the menu and the deferred registration', async () => {
        const { container, chart, legend } = legendFixture();
        legend.init(chart);
        legend.setRawCandles([bar(3600, 100)]);
        legend.refresh();

        const toggle = container.querySelector('.legend-ct-toggle');
        assert.ok(toggle, 'the OHLCV strip must carry the chart-type toggle');
        toggle.dispatchEvent(clickEvent(toggle));
        assert.ok(document.querySelector('.chart-legend-floating-ct-menu'), 'sanity: the menu opened');

        // Disposed inside the same tick — the closer's setTimeout has not run yet.
        legend.dispose();
        await new Promise((resolve) => setTimeout(resolve, 5));

        assert.deepStrictEqual(
            {
                menu: document.querySelector('.chart-legend-floating-ct-menu'),
                closers: dom.document.listenerCount('click'),
            },
            { menu: null, closers: 0 },
            'the deferred registration must notice the menu it was opened for is gone: registering '
            + 'anyway leaves a document listener holding a disposed legend for the life of the page',
        );
    });

    it('takes down its own floating menu only, so a second legend keeps working', async () => {
        const first = legendFixture();
        const second = legendFixture();
        for (const fixture of [first, second]) {
            fixture.legend.init(fixture.chart);
            fixture.legend.setRawCandles([bar(3600, 100)]);
            fixture.legend.refresh();
        }

        const openMenu = (fixture) => {
            const toggle = fixture.container.querySelector('.legend-ct-toggle');
            assert.ok(toggle, 'the OHLCV strip must carry the chart-type toggle');
            toggle.dispatchEvent(clickEvent(toggle));
        };
        // Both menus are opened before the tick elapses: the outside-click closers register from a
        // setTimeout(0), and one already standing would close the other menu as it opens.
        openMenu(first);
        openMenu(second);
        await new Promise((resolve) => setTimeout(resolve, 5));

        assert.equal(document.querySelectorAll('.chart-legend-floating-ct-menu').length, 2,
            'sanity: each legend opened a menu of its own in the layer they share');
        assert.equal(dom.document.listenerCount('click'), 2,
            'sanity: each menu registered its own outside-click closer');

        let chosen = null;
        second.legend.onChartTypeChange = (type) => { chosen = type; };

        first.legend.dispose();

        const menus = document.querySelectorAll('.chart-legend-floating-ct-menu');
        assert.deepStrictEqual(
            {
                menus: menus.length,
                survivorIsTheOtherLegends: menus[0] === second.legend._chartTypeMenu,
                closers: dom.document.listenerCount('click'),
            },
            { menus: 1, survivorIsTheOtherLegends: true, closers: 1 },
            'dispose() dismisses this instance\'s menu and this instance\'s closer: a teardown that '
            + 'swept the document for .chart-legend-floating-ct-menu would tear the other tile\'s '
            + 'open menu out from under the user',
        );

        const item = menus[0].querySelector('.legend-ct-item[data-type="line"]');
        assert.ok(item, 'the surviving menu still offers the line item');
        item.dispatchEvent(clickEvent(item));

        assert.deepStrictEqual(
            {
                chosen,
                menuAfterChoice: document.querySelector('.chart-legend-floating-ct-menu'),
                closers: dom.document.listenerCount('click'),
            },
            { chosen: 'line', menuAfterChoice: null, closers: 0 },
            'the second legend still answers its own menu after the first one was disposed',
        );
    });
});
