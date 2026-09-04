// The floating chart-type menu behind the legend's toggle, and the document closer it opens with.
//
// Three things about this menu are the page's business now, and each one is a constructor option:
// which renderings it offers (`chartTypes` — the legend used to carry a list of its own, so a page
// whose switcher drew something else could not offer it, and a page whose switcher drew less had
// menu entries that did nothing), where it is appended (`menuLayer` — always document.body before,
// which is invisible while a chart tile is fullscreen), and which container it belongs to. Nothing
// is looked up on `window` or by element id, so two legends can live on one page — which is what
// the second describe below is about: the old code closed menus with a document-wide sweep, and the
// second tile opening its menu tore down the first tile's.
//
// The DOM double lives in tests/mini-dom.js. What this file leans on hardest is that its dispatch
// really bubbles: the outside-click closer is a listener on the document and only ever sees a click
// that got there, and `contains()` has to answer over a detached subtree or a closed menu would
// look like an open one.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');
const dom = installMiniDom();

// `fullscreenMenuLayer` asks whether the fullscreen element `instanceof HTMLElement`, and the DOM
// double's elements are plain objects with no constructor to be an instance of. Answering by node
// type is the whole of what that question means here.
globalThis.HTMLElement = class HTMLElementDouble {
    static [Symbol.hasInstance](value) { return value !== null && typeof value === 'object' && value.nodeType === 1; }
};

// The module under test is required *after* the DOM exists.
const { ChartLegend, fullscreenMenuLayer } = require('../src/chart/chart-legend.js');
const { createTranslate } = require('../src/chart/chart-host.js');

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

// Renderable answers for every string the menu puts in front of the user: a label that reached the
// menu without going through the host's translator would not read like this.
const DICTIONARY = {
    Chart: 'RENDERED-CHART',
    Candles: 'RENDERED-CANDLES',
    Line: 'RENDERED-LINE',
    Renko: 'RENDERED-RENKO',
};

// The renderings this page's switcher implements. Deliberately not the set the legend used to
// hardcode: 'renko' is here and 'area' is not, so an entry can only be in the menu because this
// list put it there.
const CHART_TYPES = [
    { value: 'candle', label: 'Candles', icon: 'bi bi-bar-chart-fill' },
    { value: 'line', label: 'Line', icon: 'bi bi-graph-up' },
    { value: 'renko', label: 'Renko', icon: 'bi bi-bricks' },
];

const MENU_SELECTOR = '.chart-legend-floating-ct-menu';

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

/** A layer element the page nominates for floating menus, e.g. its fullscreen element. */
function makeLayer(id) {
    const layer = document.createElement('div');
    layer.setAttribute('id', id);
    document.body.appendChild(layer);
    return layer;
}

// Legends mounted by a test, disposed before the next one: an instance left holding an open menu
// would otherwise register its closer during the following test and be counted there.
const mounted = [];

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const floatingMenus = (root) => root.querySelectorAll(MENU_SELECTOR);

/**
 * The menus standing in `root`, compared by identity. Which menu survived is the whole question in
 * the two-legend cases, and a structural comparison would call two menus built from the same list
 * the same menu.
 */
function assertMenus(root, expected, message) {
    const actual = floatingMenus(root);
    assert.equal(actual.length, expected.length, message);
    for (let i = 0; i < expected.length; i++) assert.equal(actual[i], expected[i], message);
}

/**
 * A legend painted into its own element, with a strip to click the toggle in. `layer` is where its
 * menus are appended; `menuLayer` overrides that with a function for the tests that watch which
 * layer is asked, and when.
 */
function mountLegend(options = {}) {
    const container = document.createElement('div');
    container.className = 'chart-legend';
    document.body.appendChild(container);

    const layer = options.layer ?? document.body;
    const legend = new ChartLegend({
        container,
        host: hostStub(),
        // No indicator engine is ever set in this file, so no sub-pane is ever asked for.
        paneHost: { getValuesElement: () => null },
        chartTypes: options.chartTypes ?? CHART_TYPES,
        menuLayer: options.menuLayer ?? (() => layer),
    });
    legend.init(chartStub());
    legend.setRawCandles([bar(1700000000, 100)]);
    legend.refresh();
    mounted.push(legend);
    return { legend, container, layer };
}

/** Clicks the toggle in the strip and hands back the menu that appeared in `layer`. */
function openMenu(mount, layer = mount.layer) {
    const toggle = mount.container.querySelector('.legend-ct-toggle');
    assert.ok(toggle, 'the OHLCV strip must carry the chart-type toggle');
    toggle.dispatchEvent(clickEvent(toggle));

    const menus = floatingMenus(layer);
    const menu = menus[menus.length - 1] ?? null;
    assert.ok(menu, 'clicking the toggle opens the floating menu in the layer the page nominated');
    return menu;
}

function itemFor(menu, type) {
    const item = menu.querySelector(`.legend-ct-item[data-type="${type}"]`);
    assert.ok(item, `the menu offers a "${type}" item`);
    return item;
}

beforeEach(async () => {
    // Drain the timer an open menu schedules its closer from, so a menu left open by the previous
    // test cannot register one after the sweep below.
    await tick();
    for (const legend of mounted.splice(0)) legend.dispose();
    document.body.childNodes = [];
    dom.document.clearListeners();
    delete dom.document.fullscreenElement;
    delete dom.document.webkitFullscreenElement;
});

// ---------------------------------------------------------------------------------------------

describe('floating chart-type menu', () => {
    it('opens in the layer the page nominates, hanging below its toggle', () => {
        const layer = makeLayer('fullscreen-layer');
        const mount = mountLegend({ layer });

        const menu = openMenu(mount);
        assert.equal(menu.parentElement, layer, 'the menu belongs to the nominated layer');
        assert.ok(menu.classList.contains('chart-legend-floating-ct-menu'),
            'the menu keeps the class the page styles it by');
        // Only the layer is a direct child of the body here: a menu appended to the body itself
        // would be painted nowhere at all while the layer is a fullscreen element.
        assert.deepEqual(
            document.body.children.filter((child) => child.matches(MENU_SELECTOR)), [],
            'nothing is appended straight to the document body any more',
        );

        const toggle = mount.container.querySelector('.legend-ct-toggle');
        const top = Number(/top:(-?[\d.]+)px/.exec(menu.style.cssText)?.[1]);
        assert.equal(menu.style.cssText.includes('position:fixed'), true,
            'the menu is positioned against the viewport, not against whatever the layer scrolls');
        assert.ok(top >= toggle.getBoundingClientRect().bottom,
            'the menu hangs below the toggle it was opened from');
    });

    it('asks for the layer again on every open', async () => {
        const layers = [makeLayer('layer-before'), makeLayer('layer-after')];
        let opens = 0;
        // A page that entered fullscreen between the two opens answers with a different element the
        // second time; a layer read once at construction would strand the menu in the old one.
        const mount = mountLegend({ menuLayer: () => layers[Math.min(opens++, layers.length - 1)] });

        openMenu(mount, layers[0]);
        assert.equal(floatingMenus(layers[0]).length, 1, 'the first menu opens in the first layer');
        await tick();

        openMenu(mount, layers[1]);
        assert.equal(opens, 2, 'the layer is asked once per open');
        assert.equal(floatingMenus(layers[0]).length, 0,
            'reopening takes the previous menu out of the layer it was in');
        assert.equal(floatingMenus(layers[1]).length, 1, 'the second menu opens in the second layer');
    });

    it('offers exactly the chart types the page passed, worded by the host', () => {
        const mount = mountLegend();
        const menu = openMenu(mount);

        const items = menu.querySelectorAll('.legend-ct-item');
        assert.deepEqual(items.map((item) => item.dataset.type), ['candle', 'line', 'renko'],
            'every entry comes from the chartTypes option, in the order the page listed them');
        assert.deepEqual(items.map((item) => item.textContent.trim()),
            ['RENDERED-CANDLES', 'RENDERED-LINE', 'RENDERED-RENKO'],
            'each label is worded through the host translator');
        assert.deepEqual(items.map((item) => item.querySelector('i').className),
            CHART_TYPES.map((type) => type.icon), 'each entry wears the icon the page gave it');
        assert.equal(menu.querySelector('.legend-ct-item[data-type="area"]'), null,
            'a rendering this page never listed is not offered: the list is no longer the legend\'s');
    });

    it('offers only what a shorter list holds', () => {
        // A page whose switcher implements one rendering gets a one-entry menu rather than entries
        // that do nothing when picked.
        const mount = mountLegend({ chartTypes: [CHART_TYPES[1]] });
        const menu = openMenu(mount);

        assert.deepEqual(menu.querySelectorAll('.legend-ct-item').map((item) => item.dataset.type),
            ['line'], 'the menu is as short as the page\'s list');
    });

    it('removes the outside-click closer when an item is chosen', async () => {
        const mount = mountLegend();
        const menu = openMenu(mount);

        // The closer is registered from a setTimeout(0) so the opening click cannot trip it.
        await tick();
        assert.equal(dom.document.listenerCount('click'), 1, 'the outside-click closer is registered');

        const item = itemFor(menu, 'line');
        item.dispatchEvent(clickEvent(item));

        assert.equal(floatingMenus(mount.layer).length, 0,
            'choosing an item removes the menu from the document');
        assert.equal(
            dom.document.listenerCount('click'), 0,
            'choosing an item must also unregister the document closer: a path that calls '
            + 'menu.remove() only leaves a closer that does bubble but sees menu.contains(target) '
            + '=== true over the detached subtree, so it never removes itself or releases the menu',
        );
    });

    it('reports the chosen type once and repaints the toggle', () => {
        const mount = mountLegend();
        const chosen = [];
        mount.legend.onChartTypeChange = (type) => chosen.push(type);

        const item = itemFor(openMenu(mount), 'renko');
        item.dispatchEvent(clickEvent(item));

        assert.deepEqual(chosen, ['renko'], 'the page hears the chosen value exactly once');
        const toggle = mount.container.querySelector('.legend-ct-toggle');
        assert.equal(toggle.dataset.current, 'renko', 'the toggle reports the rendering now on screen');
        assert.equal(toggle.querySelector('[data-ct-icon]').className, 'bi bi-bricks',
            'and wears that entry\'s icon, which only the chartTypes option knows');
    });

    it('closes on a click outside and releases its closer', async () => {
        const mount = mountLegend();
        openMenu(mount);
        await tick();

        const elsewhere = document.createElement('div');
        document.body.appendChild(elsewhere);
        elsewhere.dispatchEvent(clickEvent(elsewhere));

        assert.equal(floatingMenus(mount.layer).length, 0, 'a click outside takes the menu down');
        assert.equal(dom.document.listenerCount('click'), 0,
            'and the closer goes with it rather than waiting for the next click');
    });

    it('keeps one menu and one closer when the toggle is clicked twice', async () => {
        const mount = mountLegend();
        openMenu(mount);
        await tick();
        openMenu(mount);

        assert.equal(floatingMenus(mount.layer).length, 1,
            'reopening replaces this instance\'s menu instead of stacking a second one');
        assert.equal(dom.document.listenerCount('click'), 0,
            'the first closer is released as the first menu goes');
        await tick();
        assert.equal(dom.document.listenerCount('click'), 1, 'and the reopened menu registers one closer');
    });

    it('registers no closer for a menu that is already gone', async () => {
        const mount = mountLegend();
        openMenu(mount);
        // Disposed within the same tick the menu was opened in, i.e. before the closer's timer runs.
        mount.legend.dispose();

        assert.equal(floatingMenus(mount.layer).length, 0, 'dispose takes an open menu down with it');
        await tick();
        assert.equal(dom.document.listenerCount('click'), 0,
            'and the pending timer must not hand the document a closer for a menu nobody can see');
    });
});

describe('two legends on one page', () => {
    it('leaves the other legend\'s menu standing when one opens its own', async () => {
        const first = mountLegend();
        const second = mountLegend();

        const firstMenu = openMenu(first);
        await tick();
        const secondMenu = openMenu(second);
        await tick();

        assert.notEqual(firstMenu, secondMenu, 'each legend built its own menu');
        assertMenus(document.body, [firstMenu, secondMenu],
            'opening the second menu must not sweep the first one out of the document: the two '
            + 'legends share a layer, and only one of them owns each menu in it');
        assert.equal(dom.document.listenerCount('click'), 2, 'one closer per open menu, not one per page');
    });

    it('closes only the menu whose item was chosen', async () => {
        const first = mountLegend();
        const second = mountLegend();

        // Both opened inside one tick, so neither closer is registered yet: what disappears below
        // is what the item path itself takes down, not what an outside click legitimately closes.
        const firstMenu = openMenu(first);
        const secondMenu = openMenu(second);
        const item = itemFor(secondMenu, 'line');
        item.dispatchEvent(clickEvent(item));

        assertMenus(document.body, [firstMenu],
            'the first legend\'s menu survives a choice made in the second\'s');
        assert.equal(second.container.querySelector('.legend-ct-toggle').dataset.current, 'line',
            'the choice reaches the legend it was made in');
        assert.equal(first.container.querySelector('.legend-ct-toggle').dataset.current, 'candle',
            'and leaves the other legend on the rendering it was already showing');

        await tick();
        assert.equal(dom.document.listenerCount('click'), 1,
            'only the still-open menu ends up with a closer');
    });

    it('gives each closer only its own menu to answer for', async () => {
        const first = mountLegend();
        const second = mountLegend();

        const firstMenu = openMenu(first);
        await tick();
        const secondMenu = openMenu(second);
        await tick();
        assert.equal(dom.document.listenerCount('click'), 2, 'both closers are registered');

        // A click inside the first menu, on the menu itself rather than an entry: outside the
        // second menu, so the second closes, while the first stays open under the cursor.
        firstMenu.dispatchEvent(clickEvent(firstMenu));

        assertMenus(document.body, [firstMenu],
            'a closer answers for its own menu only — a document-wide sweep would take both down');
        assert.equal(secondMenu.parentElement, null, 'the second menu is out of the document');
        assert.equal(dom.document.listenerCount('click'), 1,
            'and only the closed menu\'s closer was released');
    });
});

// `fullscreenMenuLayer` is what src/chart/app.ts and the published ui entry point hand every
// legend, so it is the layer nearly every consumer actually gets.
describe('fullscreenMenuLayer', () => {
    it('answers with the document body while nothing is fullscreen', () => {
        assert.equal(fullscreenMenuLayer(), document.body);
    });

    it('answers with the fullscreen element while one is up', () => {
        const tile = makeLayer('chart-tile');
        dom.document.fullscreenElement = tile;
        assert.equal(fullscreenMenuLayer(), tile);
    });

    it('reads the webkit-prefixed property too', () => {
        const tile = makeLayer('chart-tile');
        dom.document.webkitFullscreenElement = tile;
        assert.equal(fullscreenMenuLayer(), tile,
            'Safari names it webkitFullscreenElement, and a chart tile there is fullscreen all the same');
    });

    it('puts the menu inside the fullscreen tile, and back in the body on leaving it', async () => {
        const tile = makeLayer('chart-tile');
        const mount = mountLegend({ menuLayer: fullscreenMenuLayer });

        dom.document.fullscreenElement = tile;
        const inTile = openMenu(mount, tile);
        assert.equal(inTile.parentElement, tile,
            'nothing outside the fullscreen element is painted, so a menu in the body is a menu '
            + 'the user cannot see');
        await tick();

        delete dom.document.fullscreenElement;
        const inBody = openMenu(mount, document.body);
        assert.equal(inBody.parentElement, document.body, 'and it follows the page back out again');
        assert.equal(floatingMenus(tile).length, 0, 'the menu that was in the tile went with the reopen');
    });
});
