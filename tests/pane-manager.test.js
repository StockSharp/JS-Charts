// ChartPaneManager: the chrome the terminal hangs off the engine's native panes.
//
// This file replaces tests/pane-manager-global.test.js. That file guarded window._chartPaneManager
// -- the back-reference the manager published on init() and handed back on dispose(), because the
// legend went looking for the manager on window. The global is gone by design: the legend is now
// given the manager as a LegendPaneHost option and asks it for an element. So what the old file
// guarded is covered here by the method that replaced the global -- getValuesElement(paneId) --
// by the pane bookkeeping around it, and by a dispose() that leaves nothing behind on window, on
// the chart element or on the document.
//
// The DOM double lives in tests/mini-dom.js and has to be installed before the module is required:
// the manager is written in innerHTML and querySelector, which the headless-dom element has not.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');

const dom = installMiniDom({});

const { ChartPaneManager } = require('../src/chart/chart-pane-manager.js');
const { standaloneHost } = require('../src/chart/chart-host.js');

let restoreGlobals = [];
let frames = null;
let observers = [];

/** Install a global for the duration of one test (mini-dom carries no frames and no observer). */
function installGlobal(name, value) {
    const had = name in globalThis;
    const previous = globalThis[name];
    globalThis[name] = value;
    restoreGlobals.push(() => {
        if (had) globalThis[name] = previous;
        else delete globalThis[name];
    });
}

beforeEach(() => {
    dom.document.body.childNodes.length = 0;
    dom.document.clearListeners();

    // Frames are queued, never timed: a test that wants a header sync runs one with frames.flush(),
    // so nothing here waits on a timer and the result is the same on every machine.
    const queued = new Map();
    let nextFrame = 1;
    installGlobal('requestAnimationFrame', (callback) => {
        queued.set(nextFrame, callback);
        return nextFrame++;
    });
    installGlobal('cancelAnimationFrame', (id) => { queued.delete(id); });
    frames = {
        pending: () => queued.size,
        flush() {
            const due = [...queued.values()];
            queued.clear();
            for (const callback of due) callback(0);
            return due.length;
        },
    };

    observers = [];
    installGlobal('ResizeObserver', class {
        constructor(callback) {
            this.callback = callback;
            this.observing = [];
            this.disconnects = 0;
            observers.push(this);
        }
        observe(target) { this.observing.push(target); }
        unobserve(target) { this.observing = this.observing.filter((each) => each !== target); }
        disconnect() { this.disconnects++; this.observing = []; }
    });
});

afterEach(() => {
    for (const restore of restoreGlobals.reverse()) restore();
    restoreGlobals = [];
    frames = null;
    observers = [];
});

/**
 * The engine's chart, as much of it as the chrome touches: it makes panes, drops them, and each
 * pane answers for its band on the shared canvas and for the options removePane() snapshots.
 */
function chartDouble() {
    const panes = new Map();
    const addPaneCalls = [];
    const removed = [];

    return {
        addPane(options) {
            addPaneCalls.push({ ...options });
            const paneOptions = { ...options };
            const scales = new Map();
            const pane = {
                band: { top: 0, height: 0 },
                id: () => options.id,
                options: () => ({ ...paneOptions }),
                applyOptions(patch) { Object.assign(paneOptions, patch); },
                getSize() { return pane.band; },
                priceScaleIds: () => [...scales.keys()],
                priceScale(scaleId) {
                    let scale = scales.get(scaleId);
                    if (scale === undefined) {
                        const scaleOptions = {};
                        scale = {
                            applyOptions(patch) { Object.assign(scaleOptions, patch); },
                            options: () => ({ ...scaleOptions }),
                        };
                        scales.set(scaleId, scale);
                    }
                    return scale;
                },
            };
            panes.set(options.id, pane);
            return pane;
        },
        removePane(pane) {
            removed.push(pane.id());
            panes.delete(pane.id());
        },
        panes,
        addPaneCalls,
        removed,
        /** Put a pane's band on the shared canvas, which is what the header sync reads. */
        band(paneId, top, height) { panes.get(paneId).band = { top, height }; },
    };
}

/** Mount the chrome over a chart element the way the terminal does, and hand back its wiring. */
function mount({ containerId = 'chartContainer', chart = chartDouble() } = {}) {
    const container = dom.document.createElement('div');
    // mini-dom's element has no insertBefore, and wrapping the chart element is the one place the
    // manager needs it. Real semantics rather than an appendChild stand-in: the wrapper has to end
    // up where the chart element was, not after it.
    container.insertBefore = (node, reference) => {
        const at = container.childNodes.indexOf(reference);
        node.parentElement = container;
        container.childNodes.splice(at < 0 ? container.childNodes.length : at, 0, node);
        return node;
    };

    const chartEl = dom.document.createElement('div');
    chartEl.setAttribute('id', containerId);
    // A chart element 400px tall whose top edge is 50px down the viewport, so a routed right-click
    // proves the pane band is hit-tested against the element and not against the raw client point.
    chartEl.getBoundingClientRect = () => ({ top: 50, left: 0, width: 600, height: 400 });
    container.appendChild(chartEl);
    dom.document.body.appendChild(container);

    const asked = { addIndicatorToPane: [], removePane: [] };
    const manager = new ChartPaneManager({
        containerId,
        host: standaloneHost,
        onAddIndicatorToPane: (paneId) => asked.addIndicatorToPane.push(paneId),
        onRemovePane: (paneId) => asked.removePane.push(paneId),
    });
    manager.init(chart);

    return { manager, chart, chartEl, container, asked };
}

/** Every window property that names this object -- the check the deleted global would fail. */
function windowKeysNaming(target) {
    return Object.keys(dom.window).filter((key) => dom.window[key] === target);
}

function contextMenuEvent(clientY, overrides = {}) {
    const immediate = { stopped: 0 };
    return {
        event: {
            type: 'contextmenu',
            button: 2,
            ctrlKey: false,
            clientX: 300,
            clientY,
            stopImmediatePropagation() { immediate.stopped++; },
            ...overrides,
        },
        immediate,
    };
}

/** The open menu of a pane, as rows keyed the way ChartContextMenu keys them. */
function openMenuRows() {
    const menus = dom.document.querySelectorAll('.chart-ctx-menu')
        .filter((menu) => menu.style.display === 'block');
    assert.ok(menus.length <= 1, 'at most one pane menu may be open at a time');
    if (menus.length === 0) return null;
    return menus[0].querySelectorAll('button').map((button) => ({
        key: button.getAttribute('data-ctx-key'),
        label: button.textContent,
        element: button,
    }));
}

describe('ChartPaneManager gives out pane elements instead of publishing itself', () => {
    it('hands back the element a pane paints its indicator values into', () => {
        const { manager } = mount();

        const rsi = manager.addPane('RSI (14)', 'rsi');
        const macd = manager.addPane('MACD', 'macd');

        const rsiValues = manager.getValuesElement(rsi);
        const macdValues = manager.getValuesElement(macd);

        assert.ok(rsiValues !== null && macdValues !== null, 'both live panes answer with an element');
        assert.notEqual(rsiValues, macdValues, 'each pane gets its own element');
        assert.deepEqual(
            [rsiValues.className, macdValues.className],
            ['pane-values', 'pane-values'],
            'the element is the values slot of the pane header, not the header itself',
        );
        assert.deepEqual(
            [rsiValues.closest('.chart-sub-pane').id, macdValues.closest('.chart-sub-pane').id],
            [rsi, macd],
            'each element sits inside the pane it was asked for',
        );
        assert.deepEqual(
            [
                rsiValues.closest('.chart-sub-pane').querySelector('.pane-label').textContent,
                macdValues.closest('.chart-sub-pane').querySelector('.pane-label').textContent,
            ],
            ['RSI (14)', 'MACD'],
            'the label is the pane manager\'s to render; only the values are the legend\'s',
        );
        assert.equal(rsiValues.childNodes.length, 0, 'a new pane hands over an empty slot');

        manager.dispose();
    });

    it('keeps the element and the legend\'s own nodes in it across a header sync', () => {
        const { manager, chart } = mount();
        const paneId = manager.addPane('RSI (14)', 'rsi');
        const values = manager.getValuesElement(paneId);

        // What the legend does with the element: build a row and bind a handler to it. The old
        // setPaneValuesHtml(paneId, html) could not keep this -- rewriting innerHTML discarded the
        // nodes and the handlers with them.
        const clicks = [];
        const row = dom.document.createElement('button');
        row.className = 'legend-indicator';
        row.addEventListener('click', () => clicks.push('row'));
        values.appendChild(row);

        chart.band(paneId, 120, 160);
        manager.resize();
        frames.flush();

        assert.equal(manager.getValuesElement(paneId), values, 'the element survives a header sync');
        assert.equal(values.querySelector('.legend-indicator'), row, 'and so do the nodes in it');
        row.dispatchEvent({ type: 'click' });
        assert.deepEqual(clicks, ['row'], 'and so do the handlers bound to them');

        manager.dispose();
    });

    it('answers null for a pane it has not got: before, after removal, after dispose', () => {
        const { manager } = mount();

        assert.equal(manager.getValuesElement('pane_1'), null, 'nothing has been added yet');

        const paneId = manager.addPane('RSI (14)', 'rsi');
        assert.ok(manager.getValuesElement(paneId) !== null, 'sanity: a live pane answers');

        manager.removePane(paneId);
        assert.equal(manager.getValuesElement(paneId), null, 'a removed pane answers null');

        const second = manager.addPane('MACD', 'macd');
        manager.dispose();
        assert.equal(manager.getValuesElement(second), null, 'and so does every pane after dispose');
        assert.equal(manager.getValuesElement('nonsense'), null, 'and an id that was never a pane');
    });
});

describe('ChartPaneManager pane bookkeeping', () => {
    it('numbers panes, lists them, and forgets one the moment it is removed', () => {
        const { manager, chart } = mount();

        const rsi = manager.addPane('RSI (14)', 'rsi');
        const macd = manager.addPane('MACD', 'macd');
        const free = manager.addPane('Notes', null);

        assert.deepEqual([rsi, macd, free], ['pane_1', 'pane_2', 'pane_3'], 'ids are handed out in order');
        assert.deepEqual(manager.getPanes(), [rsi, macd, free], 'and listed in the order they were added');
        assert.equal(manager.getPaneByMeasure('rsi'), rsi);
        assert.equal(manager.getPaneByMeasure('macd'), macd);
        assert.equal(manager.getPaneByMeasure(null), null, 'a free-standing pane is not found by measure');
        assert.equal(manager.getPaneByMeasure('atr'), null, 'nor is a measure nothing is drawn for');
        assert.ok(manager.getChart(rsi) !== null, 'a live pane hands out its chart adapter');

        const rsiElement = manager.getValuesElement(rsi).closest('.chart-sub-pane');
        manager.removePane(rsi);

        assert.deepEqual(manager.getPanes(), [macd, free], 'the removed pane is off the list');
        assert.equal(manager.getChart(rsi), null, 'and hands out no adapter');
        assert.equal(manager.getPaneByMeasure('rsi'), null, 'and answers for its measure no longer');
        assert.deepEqual(chart.removed, [rsi], 'the engine was told to drop exactly that native pane');
        assert.equal(rsiElement.parentElement, null, 'and its chrome left the DOM with it');

        manager.removePane(rsi);
        manager.removePane('never-existed');
        assert.deepEqual(manager.getPanes(), [macd, free], 'removing what is not there changes nothing');
        assert.deepEqual(chart.removed, [rsi], 'and asks the engine nothing');

        manager.dispose();
    });

    it('renames a pane in place, and ignores a rename aimed at no pane', () => {
        const { manager } = mount();
        const paneId = manager.addPane('RSI (14)', 'rsi');
        const label = manager.getValuesElement(paneId).closest('.chart-sub-pane').querySelector('.pane-label');

        manager.setPaneTitle(paneId, 'RSI (21)');
        assert.equal(label.textContent, 'RSI (21)');

        manager.setPaneTitle('never-existed', 'nothing');
        assert.equal(label.textContent, 'RSI (21)', 'a rename for an unknown pane touches nothing');

        manager.dispose();
    });

    it('restores an emptied pane under its own id, with its layout and a fresh values element', () => {
        const { manager, chart } = mount();

        const paneId = manager.addPane('RSI (14)', 'rsi');
        manager.getChart(paneId).applyOptions({ height: 240 });
        const stale = manager.getValuesElement(paneId);

        manager.removePane(paneId);
        const restored = manager.restorePane(paneId);

        assert.equal(restored, paneId, 'the pane comes back under the id the legend already knows');
        assert.deepEqual(manager.getPanes(), [paneId]);
        assert.equal(manager.getPaneByMeasure('rsi'), paneId, 'and for the measure it was shared by');
        assert.equal(
            chart.addPaneCalls.at(-1).height,
            240,
            'rebuilt at the height it had, not at the default',
        );

        const fresh = manager.getValuesElement(paneId);
        assert.ok(fresh !== null, 'a restored pane hands out an element again');
        assert.notEqual(fresh, stale, 'a new element: the pane chrome was rebuilt, not resurrected');
        assert.equal(stale.closest('.chart-panes-wrapper'), null, 'and the old one is off the page');
        assert.equal(fresh.closest('.chart-sub-pane').id, paneId);

        assert.equal(manager.restorePane('never-existed'), null, 'nothing to restore, nothing restored');
        assert.equal(manager.restorePane(paneId), null, 'and a pane already back is not restored twice');

        manager.dispose();
    });

    it('adds no pane at all when it was mounted without a chart', () => {
        const container = dom.document.createElement('div');
        container.insertBefore = (node) => container.appendChild(node);
        const chartEl = dom.document.createElement('div');
        chartEl.setAttribute('id', 'chartContainer');
        container.appendChild(chartEl);
        dom.document.body.appendChild(container);

        const manager = new ChartPaneManager({
            containerId: 'chartContainer',
            host: standaloneHost,
            onAddIndicatorToPane() { throw new Error('no pane exists to add to'); },
            onRemovePane() { throw new Error('no pane exists to remove'); },
        });
        manager.init(null);

        assert.equal(manager.addPane('RSI (14)', 'rsi'), null, 'a pane needs an engine to live in');
        assert.deepEqual(manager.getPanes(), []);
        assert.equal(manager.getValuesElement('pane_1'), null);
        manager.dispose();
    });

    it('positions each header over its pane band, one frame however many asks', () => {
        const { manager, chart } = mount();
        const visible = manager.addPane('RSI (14)', 'rsi');
        const collapsed = manager.addPane('MACD', 'macd');
        chart.band(visible, 120, 160);
        chart.band(collapsed, 0, 0);

        frames.flush();
        manager.resize();
        manager.resize();
        assert.equal(frames.pending(), 1, 'three asks for a sync coalesce into one frame');
        assert.equal(frames.flush(), 1);

        const header = (paneId) => manager.getValuesElement(paneId).closest('.chart-sub-pane').style;
        assert.deepEqual(
            { top: header(visible).top, height: header(visible).height, display: header(visible).display },
            { top: '120px', height: '20px', display: 'block' },
            'the header sits at the top of its band, one header tall',
        );
        assert.equal(header(collapsed).display, 'none', 'a pane with no height shows no header');

        manager.dispose();
    });
});

describe('ChartPaneManager right-click routing', () => {
    it('routes a right-click in a pane band to that pane\'s own menu', () => {
        const { manager, chart, chartEl, asked } = mount();
        const top = manager.addPane('RSI (14)', 'rsi');
        const bottom = manager.addPane('MACD', 'macd');
        chart.band(top, 0, 100);
        chart.band(bottom, 100, 60);

        // 50px is the chart element's own offset: 200 lands 150px in, which is the second band.
        const { event, immediate } = contextMenuEvent(200);
        chartEl.dispatchEvent(event);

        assert.equal(immediate.stopped, 1, 'the main-chart menu must not answer the same click');
        const rows = openMenuRows();
        assert.deepEqual(
            rows.map((row) => ({ key: row.key, label: row.label })),
            [
                { key: 'addToPane', label: 'Add indicator…' },
                { key: 'removePane', label: 'Remove pane' },
            ],
            'a pane header offers the two rows a pane owns, and no price rows',
        );

        rows.find((row) => row.key === 'removePane').element.dispatchEvent({ type: 'click' });
        assert.deepEqual(asked.removePane, [bottom], 'the menu names the pane it was opened for');
        assert.deepEqual(asked.addIndicatorToPane, []);

        manager.dispose();
    });

    it('leaves a right-click outside every band to the chart', () => {
        const { manager, chart, chartEl } = mount();
        const paneId = manager.addPane('RSI (14)', 'rsi');
        chart.band(paneId, 100, 60);

        // 90px into the element: above the band, i.e. on the price chart itself.
        const { event, immediate } = contextMenuEvent(140);
        chartEl.dispatchEvent(event);

        assert.equal(immediate.stopped, 0, 'the click travels on to the main-chart menu');
        assert.equal(openMenuRows(), null, 'and no pane menu opened');

        manager.dispose();
    });
});

describe('ChartPaneManager teardown', () => {
    it('never puts itself on window, and lets go of everything it took', () => {
        const { manager, chart, chartEl } = mount();
        const paneId = manager.addPane('RSI (14)', 'rsi');
        chart.band(paneId, 100, 60);

        assert.deepEqual(
            windowKeysNaming(manager),
            [],
            'nothing on window names the manager: the legend is handed it as a LegendPaneHost',
        );
        assert.equal('_chartPaneManager' in dom.window, false, 'the old global is gone, not renamed');

        assert.deepEqual(
            {
                pointermove: chartEl.listenerCount('pointermove'),
                pointerup: chartEl.listenerCount('pointerup'),
                contextmenu: chartEl.listenerCount('contextmenu'),
                observers: observers.length,
                observing: observers[0].observing.length,
                menus: dom.document.querySelectorAll('.chart-ctx-menu').length,
            },
            {
                pointermove: 1, pointerup: 1, contextmenu: 1,
                observers: 1, observing: 1, menus: 1,
            },
            'sanity: what a mounted manager holds',
        );

        manager.dispose();

        assert.deepEqual(
            {
                pointermove: chartEl.listenerCount('pointermove'),
                pointerup: chartEl.listenerCount('pointerup'),
                contextmenu: chartEl.listenerCount('contextmenu'),
                observerDisconnects: observers[0].disconnects,
                pendingFrames: frames.pending(),
                panes: manager.getPanes(),
                removedFromEngine: chart.removed,
                menusOnBody: dom.document.querySelectorAll('.chart-ctx-menu').length,
                documentClickListeners: dom.document.listenerCount('click'),
                documentKeyListeners: dom.document.listenerCount('keydown'),
                windowNames: windowKeysNaming(manager),
            },
            {
                pointermove: 0, pointerup: 0, contextmenu: 0,
                observerDisconnects: 1,
                pendingFrames: 0,
                panes: [],
                removedFromEngine: [paneId],
                menusOnBody: 0,
                documentClickListeners: 0,
                documentKeyListeners: 0,
                windowNames: [],
            },
            'a host that rebuilds its chart on every symbol or timeframe change disposes the pane '
            + 'chrome and mounts a new one: the observer, the three chart-element listeners and '
            + 'every pane menu have to go with it',
        );

        // Disposing twice is what a defensive host does; it must not resurrect anything.
        manager.dispose();
        assert.equal(observers[0].disconnects, 1, 'the observer is disconnected once and stays gone');
        assert.deepEqual(manager.getPanes(), []);
    });

    it('drops the restore snapshots too, so a disposed manager rebuilds nothing', () => {
        const { manager } = mount();
        const paneId = manager.addPane('RSI (14)', 'rsi');
        manager.removePane(paneId);

        manager.dispose();

        assert.equal(manager.restorePane(paneId), null, 'the snapshot went with the manager');
    });
});
