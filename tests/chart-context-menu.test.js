// ChartContextMenu: the right-click menu that replaces the browser's own on the chart canvas.
//
// The module had no coverage anywhere -- no test imported it, none dispatched a contextmenu or a
// right-click. It is also the one piece of UI that can reach an order-entry form, so what it does
// and, more to the point, what it refuses to do without a price belongs in a test.
//
// The DOM double lives in tests/mini-dom.js and has to be installed before the module is required.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');

const dom = installMiniDom({});

const { ChartContextMenu } = require('../src/chart/chart-context-menu.js');

function mouseEvent(type, overrides = {}) {
    return {
        type,
        button: 0,
        ctrlKey: false,
        clientX: 100,
        clientY: 200,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { this.propagationStopped = true; },
        defaultPrevented: false,
        propagationStopped: false,
        ...overrides,
    };
}

/** A container whose top edge is at y=50, so a click at clientY=200 sits 150px into the plot. */
function container() {
    const element = dom.document.createElement('div');
    element.getBoundingClientRect = () => ({ top: 50, left: 0, width: 600, height: 400 });
    dom.document.body.appendChild(element);
    return element;
}

/** Straight-line coordinate → price: 60000 at the top of the plot, one unit per pixel down. */
function priceSource(convert = (y) => 60_000 - y) {
    return { coordinateToPrice: convert };
}

function menuItems(menu) {
    return menu._menuEl.children
        .filter(child => child.tagName === 'BUTTON')
        .map(child => ({ label: child.textContent, disabled: child.disabled === true }));
}

function itemNamed(menu, fragment) {
    return menu._menuEl.children.find(
        child => child.tagName === 'BUTTON' && child.textContent.includes(fragment),
    );
}

describe('ChartContextMenu', () => {
    let host;
    let menu;

    beforeEach(() => {
        dom.document.body.childNodes.length = 0;
        dom.document.clearListeners();
        host = container();
        menu = new ChartContextMenu();
    });

    it('opens at the cursor on right-click, priced from the clicked coordinate', () => {
        menu.init(host, priceSource(), { onBuyAtPrice() { }, onSellAtPrice() { } });

        host.dispatchEvent(mouseEvent('contextmenu', { clientX: 120, clientY: 200 }));

        assert.equal(menu._menuEl.style.display, 'block');
        assert.equal(menu._menuEl.style.left, '120px');
        assert.equal(menu._menuEl.style.top, '200px');
        assert.deepEqual(
            menuItems(menu).map(item => item.label),
            ['Buy @ 59850', 'Sell @ 59850', 'Add indicator…', 'Add pane…', 'Cancel orders at this price'],
            'the price is read at 150px into the plot, not at the raw client coordinate',
        );
    });

    it('never places an order by itself -- an item hands the price to the host and closes', () => {
        const bought = [];
        menu.init(host, priceSource(), { onBuyAtPrice: price => bought.push(price) });

        host.dispatchEvent(mouseEvent('contextmenu'));
        itemNamed(menu, 'Buy').dispatchEvent({ type: 'click' });

        assert.deepEqual(bought, [59_850]);
        assert.equal(menu._menuEl.style.display, 'none', 'choosing an item closes the menu');
    });

    it('disables what the host did not wire, and the order rows when there is no price', () => {
        menu.init(host, priceSource(() => null), { onBuyAtPrice() { } });

        host.dispatchEvent(mouseEvent('contextmenu'));

        assert.deepEqual(menuItems(menu), [
            { label: 'Buy @ --', disabled: true },
            { label: 'Sell @ --', disabled: true },
            { label: 'Add indicator…', disabled: false },
            // No onAddPane / onCancelOrdersAt hook was supplied.
            { label: 'Add pane…', disabled: true },
            { label: 'Cancel orders at this price', disabled: true },
        ]);
    });

    it('counts the resting orders at the clicked level, and stays disabled when there are none', () => {
        const levels = new Map([[59_850, ['a', 'b', 'c']]]);
        menu.init(host, priceSource(), {
            onCancelOrdersAt() { },
            findOrdersAtPrice: price => levels.get(price) ?? [],
        });

        host.dispatchEvent(mouseEvent('contextmenu', { clientY: 200 }));
        assert.equal(itemNamed(menu, 'Cancel').textContent, 'Cancel 3 orders at 59850');
        assert.equal(itemNamed(menu, 'Cancel').disabled, undefined);

        host.dispatchEvent(mouseEvent('contextmenu', { clientY: 300 }));
        assert.equal(itemNamed(menu, 'Cancel').textContent, 'Cancel orders at this price');
        assert.equal(itemNamed(menu, 'Cancel').disabled, true,
            'nothing rests at that level, so the action has nothing to do');
    });

    it('routes a ctrl-click straight to the side hooks without opening the menu', () => {
        const calls = [];
        menu.init(host, priceSource(), {
            onBuyAtPrice: price => calls.push(['buy', price]),
            onSellAtPrice: price => calls.push(['sell', price]),
        });

        const left = mouseEvent('mousedown', { ctrlKey: true, button: 0, clientY: 200 });
        host.dispatchEvent(left);
        const right = mouseEvent('mousedown', { ctrlKey: true, button: 2, clientY: 250 });
        host.dispatchEvent(right);

        assert.deepEqual(calls, [['buy', 59_850], ['sell', 59_800]]);
        assert.equal(menu._menuEl.style.display, 'none', 'the shortcut does not open the menu');
        assert.ok(left.defaultPrevented && right.defaultPrevented);

        // The browser fires contextmenu after a right mousedown; with ctrl held it must stay quiet,
        // or one gesture would both seed a sell and pop the menu.
        host.dispatchEvent(mouseEvent('contextmenu', { ctrlKey: true }));
        assert.equal(menu._menuEl.style.display, 'none');
        assert.deepEqual(calls, [['buy', 59_850], ['sell', 59_800]]);
    });

    it('offers pane actions instead of order actions in pane mode', () => {
        const removed = [];
        menu.init(host, null, { paneMode: true, onRemovePane: () => removed.push(true) });

        host.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(menuItems(menu).map(item => item.label), ['Add indicator…', 'Remove pane']);

        itemNamed(menu, 'Remove pane').dispatchEvent({ type: 'click' });
        assert.deepEqual(removed, [true]);
    });

    it('closes on Escape and on a click outside itself, but not on a click inside', () => {
        menu.init(host, priceSource(), {});

        host.dispatchEvent(mouseEvent('contextmenu'));
        dom.document._fire({ type: 'click', target: menu._menuEl });
        assert.equal(menu._menuEl.style.display, 'block', 'a click inside the menu leaves it open');

        dom.document._fire({ type: 'click', target: host });
        assert.equal(menu._menuEl.style.display, 'none');

        host.dispatchEvent(mouseEvent('contextmenu'));
        dom.document._fire({ type: 'keydown', key: 'Escape' });
        assert.equal(menu._menuEl.style.display, 'none');
    });

    it('survives a re-init and leaves nothing behind on dispose', () => {
        menu.init(host, priceSource(), {});
        const first = menu._menuEl;
        menu.init(host, priceSource(), {});
        assert.notEqual(menu._menuEl, first, 're-init rebuilds the menu');
        assert.equal(first.parentElement, null, 'the previous menu element is detached');

        host.dispatchEvent(mouseEvent('contextmenu'));
        assert.equal(menu._menuEl.style.display, 'block');

        const documentListeners = ['click', 'keydown'].map(type => dom.document.listenerCount(type));
        assert.deepEqual(documentListeners, [1, 1], 're-init does not stack document listeners');

        const live = menu._menuEl;
        menu.dispose();
        assert.equal(live.parentElement, null);
        assert.deepEqual(
            ['click', 'keydown'].map(type => dom.document.listenerCount(type)),
            [0, 0],
            'dispose takes its document listeners with it',
        );

        // The container must be free of the menu too: a chart rebuild re-uses the same element.
        host.dispatchEvent(mouseEvent('contextmenu'));
        assert.equal(menu._menuEl, null);
    });

    it('reads the price through the series it was last given', () => {
        const seen = [];
        menu.init(host, priceSource(), { onBuyAtPrice: price => seen.push(price) });
        // chart-type-switcher swaps the series on every candle/line/area toggle.
        menu.setCandleSeries(priceSource(y => 100 + y / 10));

        host.dispatchEvent(mouseEvent('contextmenu', { clientY: 200 }));
        itemNamed(menu, 'Buy').dispatchEvent({ type: 'click' });

        assert.deepEqual(seen, [115]);
    });

    it('shows the row without a price rather than guessing when the series throws', () => {
        menu.init(host, { coordinateToPrice() { throw new Error('detached series'); } }, {
            onBuyAtPrice() { },
        });

        host.dispatchEvent(mouseEvent('contextmenu'));
        assert.equal(itemNamed(menu, 'Buy').textContent, 'Buy @ --');
        assert.equal(itemNamed(menu, 'Buy').disabled, true);
    });
});
