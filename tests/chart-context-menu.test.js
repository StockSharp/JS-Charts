// ChartContextMenu: the right-click menu that replaces the browser's own on the chart canvas.
//
// The module owns no rows at all -- every row it draws is contributed through `provideItems`,
// because a right-click menu offers what the page can do and only the page knows what that is.
// What the menu keeps for itself is the framing: where it opens, what price it reports, which
// groups get a rule between them, and Ctrl+click, which belongs to the engine's order-placement
// gesture. So what the menu refuses to do by itself is as much of the contract as what it draws,
// and both are asserted here.
//
// The DOM double lives in tests/mini-dom.js and has to be installed before the module is required.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');

const dom = installMiniDom({});

const {
    ChartContextMenu,
    ChartContextMenuMode,
    ChartContextMenuTone,
} = require('../src/chart/chart-context-menu.js');
const { standaloneHost, createTranslate, defaultChartFormatters, consoleNotify } =
    require('../src/chart/chart-host.js');

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
function createContainer() {
    const element = dom.document.createElement('div');
    element.getBoundingClientRect = () => ({ top: 50, left: 0, width: 600, height: 400 });
    dom.document.body.appendChild(element);
    return element;
}

/** Straight-line coordinate → price: 60000 at the top of the plot, one unit per pixel down. */
function priceSource(convert = (y) => 60_000 - y) {
    return { coordinateToPrice: convert };
}

/** A page host that answers everything itself, with whatever the test needs overridden. */
function hostWith(overrides = {}) {
    return {
        translate: standaloneHost.translate,
        formatters: defaultChartFormatters,
        notify: consoleNotify,
        ...overrides,
    };
}

/**
 * The rows a trading page contributes, as one group. Kept in one place because several tests need
 * the same shape: priced from the context, tone-coded, and disabled when the click landed where
 * the action has nothing to do.
 */
function tradingRows(calls, restingAt = () => []) {
    return ({ price, priceText }) => {
        const resting = price === null ? [] : restingAt(price);
        return [[
            {
                key: 'buy',
                label: `Buy @ ${priceText}`,
                tone: ChartContextMenuTone.Positive,
                disabled: price === null,
                invoke: () => calls.push(['buy', price]),
            },
            {
                key: 'sell',
                label: `Sell @ ${priceText}`,
                tone: ChartContextMenuTone.Negative,
                disabled: price === null,
                invoke: () => calls.push(['sell', price]),
            },
            {
                key: 'cancel',
                label: resting.length === 0
                    ? 'Cancel orders at this price'
                    : `Cancel ${resting.length} orders at ${priceText}`,
                tone: ChartContextMenuTone.Negative,
                disabled: resting.length === 0,
                invoke: () => calls.push(['cancel', price, resting.length]),
            },
        ]];
    };
}

/**
 * The chart rows a page contributes: add an indicator, add a pane. The module used to build these
 * two in and no longer builds in any, so a page with an indicator engine offers them exactly the
 * way a trading page offers Buy -- through `provideItems`, worded by the host it was given.
 */
function chartRows(hooks, host) {
    return [
        {
            key: 'indicator',
            label: host.translate('Add indicator…'),
            invoke: () => hooks.push(['addIndicator']),
        },
        {
            key: 'addPane',
            label: host.translate('Add pane…'),
            invoke: () => hooks.push(['addPane']),
        },
    ];
}

/** The same for a sub-pane header, where the pane and not the chart is what the rows act on. */
function paneRows(hooks, host) {
    return [
        {
            key: 'addToPane',
            label: host.translate('Add indicator…'),
            invoke: () => hooks.push(['addIndicatorToPane']),
        },
        {
            key: 'removePane',
            label: host.translate('Remove pane'),
            tone: ChartContextMenuTone.Negative,
            invoke: () => hooks.push(['removePane']),
        },
    ];
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

function itemKeyed(menu, key) {
    return menu._menuEl.children.find(child => child.dataset.ctxKey === key);
}

/** Every child in order: a row by the key the page gave it, a rule by its class. */
function menuLayout(menu) {
    return menu._menuEl.children.map(child => child.dataset.ctxKey ?? child.className);
}

/** Whatever `console.warn` was handed while `body` ran; the module swallows provider faults. */
function captureWarnings(body) {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args);
    try {
        body();
    } finally {
        console.warn = original;
    }
    return warnings;
}

describe('ChartContextMenu', () => {
    let containerEl;
    let menu;
    let hooks;

    /** Chart-mode options whose page contributes its chart rows, unless a test supplies its own. */
    function chartOptions(overrides = {}) {
        return {
            mode: ChartContextMenuMode.Chart,
            host: standaloneHost,
            priceSource: priceSource(),
            provideItems: (context) => [chartRows(hooks, context.host)],
            ...overrides,
        };
    }

    /** Pane-mode options, same idea. */
    function paneOptions(overrides = {}) {
        return {
            mode: ChartContextMenuMode.Pane,
            host: standaloneHost,
            provideItems: (context) => [paneRows(hooks, context.host)],
            ...overrides,
        };
    }

    beforeEach(() => {
        dom.document.body.childNodes.length = 0;
        dom.document.clearListeners();
        containerEl = createContainer();
        menu = new ChartContextMenu();
        hooks = [];
    });

    it('opens at the cursor on right-click, priced from the clicked coordinate', () => {
        const seen = [];
        menu.init(containerEl, chartOptions({
            provideItems: (context) => {
                seen.push(context);
                return [...tradingRows([])(context), chartRows(hooks, context.host)];
            },
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu', { clientX: 120, clientY: 200 }));

        assert.equal(menu._menuEl.style.display, 'block');
        assert.equal(menu._menuEl.style.left, '120px');
        assert.equal(menu._menuEl.style.top, '200px');
        assert.equal(seen.length, 1);
        assert.equal(seen[0].price, 59_850,
            'the price is read at 150px into the plot, not at the raw client coordinate');
        assert.equal(seen[0].priceText, '59850', 'already worded, so every row spells it the same way');
        assert.equal(seen[0].host, standaloneHost, 'the page gets its own services back');

        assert.deepEqual(
            menuItems(menu).map(item => item.label),
            [
                // Every row here is the page's, and so is their order: it hands over its groups in
                // the order it wants them read.
                'Buy @ 59850', 'Sell @ 59850', 'Cancel orders at this price',
                'Add indicator…', 'Add pane…',
            ],
        );
    });

    it('never acts by itself -- a row is invoked as given, and the menu closes', () => {
        const calls = [];
        menu.init(containerEl, chartOptions({ provideItems: tradingRows(calls) }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        itemNamed(menu, 'Buy').dispatchEvent({ type: 'click' });

        assert.deepEqual(calls, [['buy', 59_850]]);
        assert.equal(menu._menuEl.style.display, 'none', 'choosing an item closes the menu');
    });

    it('routes each row to the callback that row carries, open after open', () => {
        menu.init(containerEl, chartOptions());

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        itemKeyed(menu, 'indicator').dispatchEvent({ type: 'click' });
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        itemKeyed(menu, 'addPane').dispatchEvent({ type: 'click' });

        assert.deepEqual(hooks, [['addIndicator'], ['addPane']],
            'each row ran its own callback, and the second open wired the rows afresh');
    });

    it('renders a contributed row disabled, and a disabled row does nothing when clicked', () => {
        const calls = [];
        // No price at this coordinate, so the trading rows arrive disabled and priced '--'.
        menu.init(containerEl, chartOptions({
            priceSource: priceSource(() => null),
            provideItems: (context) => [...tradingRows(calls)(context), chartRows(hooks, context.host)],
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));

        assert.deepEqual(menuItems(menu), [
            { label: 'Buy @ --', disabled: true },
            { label: 'Sell @ --', disabled: true },
            { label: 'Cancel orders at this price', disabled: true },
            // The page's chart rows say nothing about a price, so a missing one does not stop them.
            { label: 'Add indicator…', disabled: false },
            { label: 'Add pane…', disabled: false },
        ]);

        itemNamed(menu, 'Buy').dispatchEvent({ type: 'click' });
        assert.deepEqual(calls, [], 'a disabled row carries no handler at all');
        assert.equal(menu._menuEl.style.display, 'block', 'and it does not close the menu either');
    });

    it('re-asks the page on every open, so a row can count what rests at the clicked level', () => {
        const calls = [];
        const levels = new Map([[59_850, ['a', 'b', 'c']]]);
        menu.init(containerEl, chartOptions({
            provideItems: tradingRows(calls, price => levels.get(price) ?? []),
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu', { clientY: 200 }));
        assert.equal(itemNamed(menu, 'Cancel').textContent, 'Cancel 3 orders at 59850');
        assert.equal(itemNamed(menu, 'Cancel').disabled, undefined);

        itemNamed(menu, 'Cancel').dispatchEvent({ type: 'click' });
        assert.deepEqual(calls, [['cancel', 59_850, 3]]);

        containerEl.dispatchEvent(mouseEvent('contextmenu', { clientY: 300 }));
        assert.equal(itemNamed(menu, 'Cancel').textContent, 'Cancel orders at this price');
        assert.equal(itemNamed(menu, 'Cancel').disabled, true,
            'nothing rests at that level, so the action has nothing to do');
    });

    it('tone-codes a contributed row and tags it with the key the page gave it', () => {
        menu.init(containerEl, chartOptions({
            provideItems: (context) => [...tradingRows([])(context), chartRows(hooks, context.host)],
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));

        assert.equal(itemKeyed(menu, 'buy').className, 'chart-ctx-item chart-ctx-buy');
        assert.equal(itemKeyed(menu, 'sell').className, 'chart-ctx-item chart-ctx-sell');
        assert.equal(itemKeyed(menu, 'indicator').className, 'chart-ctx-item',
            'a row with no stated tone gets no colour class');
    });

    it('rules between groups, and never above the first or below the last', () => {
        const twoGroups = (context) => [...tradingRows([])(context), chartRows(hooks, context.host)];

        menu.init(containerEl, chartOptions({ provideItems: twoGroups }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(
            menuLayout(menu),
            ['buy', 'sell', 'cancel', 'chart-ctx-sep', 'indicator', 'addPane'],
            'one rule, between the two groups',
        );

        menu.init(containerEl, chartOptions());
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(
            menuLayout(menu),
            ['indicator', 'addPane'],
            'a single group is ruled off from nothing',
        );

        // Empty groups at both edges and in the middle: the page asked for a rule in a place it
        // then had nothing to put, and gets the same menu as if it had never asked.
        menu.init(containerEl, chartOptions({
            provideItems: (context) => [[], ...tradingRows([])(context), [], chartRows(hooks, context.host), []],
        }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(
            menuLayout(menu),
            ['buy', 'sell', 'cancel', 'chart-ctx-sep', 'indicator', 'addPane'],
            'an empty group costs nothing and leaves no rule hanging above or below nothing',
        );
    });

    it('shows nothing at all when the page offers nothing', () => {
        menu.init(containerEl, chartOptions({ provideItems: () => [] }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.equal(menu._menuEl.style.display, 'block', 'the right-click was answered');
        assert.deepEqual(menuLayout(menu), [],
            'no groups, so not one row -- the module contributes none of its own to fall back on');

        menu.init(containerEl, chartOptions({ provideItems: () => [[], [], []] }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.equal(menu._menuEl.style.display, 'block');
        assert.deepEqual(menuLayout(menu), [],
            'groups with nothing in them are not rows either, and draw no rules between themselves');
    });

    it('words a row through the dictionary the page handed over', () => {
        const translate = createTranslate({
            'Add indicator…': 'Ajouter un indicateur…',
            'Remove pane': 'Retirer le panneau',
        });

        // The rows build their labels from `context.host`, so these read back translated only if
        // the menu handed the provider the host the page configured rather than one of its own.
        menu.init(containerEl, chartOptions({ host: hostWith({ translate }) }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(
            menuItems(menu).map(item => item.label),
            ['Ajouter un indicateur…', 'Add pane…'],
            'an unanswered key falls back to readable English',
        );

        menu.init(containerEl, paneOptions({ host: hostWith({ translate }) }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(
            menuItems(menu).map(item => item.label),
            ['Ajouter un indicateur…', 'Retirer le panneau'],
        );
    });

    it('prices the context with the page\'s formatter, not one of its own', () => {
        const seen = [];
        menu.init(containerEl, chartOptions({
            host: hostWith({ formatters: { ...defaultChartFormatters, price: v => `${v.toFixed(1)} RUB` } }),
            provideItems: (context) => { seen.push(context.priceText); return []; },
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(seen, ['59850.0 RUB']);
    });

    it('a ctrl-click is the engine\'s gesture: no row is asked for and no menu opens', () => {
        const calls = [];
        let asked = 0;
        menu.init(containerEl, chartOptions({
            provideItems: (context) => {
                asked++;
                return [...tradingRows(calls)(context), chartRows(hooks, context.host)];
            },
        }));

        // The engine listens for these itself and turns them into an order-placement preview. This
        // module has no mousedown handler at all, so nothing here may reach a row or a hook.
        containerEl.dispatchEvent(mouseEvent('mousedown', { ctrlKey: true, button: 0, clientY: 200 }));
        containerEl.dispatchEvent(mouseEvent('mousedown', { ctrlKey: true, button: 2, clientY: 250 }));

        // The browser fires contextmenu after a right mousedown; with ctrl held the menu suppresses
        // the native one and stands aside, or one gesture would both seed an order and pop a menu.
        const ctrlMenu = mouseEvent('contextmenu', { ctrlKey: true });
        containerEl.dispatchEvent(ctrlMenu);

        assert.deepEqual(calls, [], 'nothing was bought or sold');
        assert.deepEqual(hooks, [], 'and no chart row ran either');
        assert.equal(asked, 0, 'the page is not even asked for rows');
        assert.equal(menu._menuEl.style.display, 'none');
        assert.ok(ctrlMenu.defaultPrevented, 'the browser menu still stays away');
    });

    it('differs in pane mode by the price it reports, not by the rows it draws', () => {
        const seen = [];
        // One provider, mounted on the chart and then on a pane header. Whatever comes out
        // different between the two menus is the context, because nothing else changed.
        const provideItems = (context) => {
            seen.push(context.price);
            return [[
                {
                    key: 'indicator',
                    label: context.host.translate('Add indicator…'),
                    invoke: () => hooks.push(['addIndicator']),
                },
                {
                    key: 'removePane',
                    label: `Remove pane @ ${context.priceText}`,
                    tone: ChartContextMenuTone.Negative,
                    disabled: context.price === null,
                    invoke: () => hooks.push(['removePane']),
                },
            ]];
        };

        menu.init(containerEl, chartOptions({ provideItems }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(menuItems(menu), [
            { label: 'Add indicator…', disabled: false },
            { label: 'Remove pane @ 59850', disabled: false },
        ]);

        menu.init(containerEl, paneOptions({ provideItems }));
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(menuItems(menu), [
            { label: 'Add indicator…', disabled: false },
            { label: 'Remove pane @ --', disabled: true },
        ], 'a pane header has no price axis, so the row that speaks of one cannot act');
        assert.deepEqual(seen, [59_850, null], 'same rows, same page: only the price differs');

        assert.equal(itemKeyed(menu, 'removePane').className, 'chart-ctx-item chart-ctx-sell',
            'a pane row is tone-coded like any other');
        itemKeyed(menu, 'indicator').dispatchEvent({ type: 'click' });
        assert.deepEqual(hooks, [['addIndicator']], 'and calls back like any other');
    });

    it('has no price to offer in pane mode, and says so rather than guessing', () => {
        const seen = [];
        menu.init(containerEl, paneOptions({
            provideItems: (context) => { seen.push([context.price, context.priceText]); return []; },
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(seen, [[null, '--']], 'a sub-pane header has no price axis under the cursor');
    });

    it('closes on Escape and on a click outside itself, but not on a click inside', () => {
        menu.init(containerEl, chartOptions());

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        dom.document._fire({ type: 'click', target: menu._menuEl });
        assert.equal(menu._menuEl.style.display, 'block', 'a click inside the menu leaves it open');

        dom.document._fire({ type: 'click', target: containerEl });
        assert.equal(menu._menuEl.style.display, 'none');

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        dom.document._fire({ type: 'keydown', key: 'Escape' });
        assert.equal(menu._menuEl.style.display, 'none');
    });

    it('survives a re-init and leaves nothing behind on dispose', () => {
        menu.init(containerEl, chartOptions());
        const first = menu._menuEl;
        menu.init(containerEl, chartOptions());
        assert.notEqual(menu._menuEl, first, 're-init rebuilds the menu');
        assert.equal(first.parentElement, null, 'the previous menu element is detached');

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
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
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.equal(menu._menuEl, null);
    });

    it('reads the price through the source it was last given', () => {
        const calls = [];
        menu.init(containerEl, chartOptions({ provideItems: tradingRows(calls) }));
        // chart-type-switcher builds a new series on every candle/line/area toggle.
        menu.setPriceSource(priceSource(y => 100 + y / 10));

        containerEl.dispatchEvent(mouseEvent('contextmenu', { clientY: 200 }));
        itemNamed(menu, 'Buy').dispatchEvent({ type: 'click' });

        assert.deepEqual(calls, [['buy', 115]]);
    });

    it('reports no price while a type switch is in flight', () => {
        const seen = [];
        menu.init(containerEl, chartOptions({
            provideItems: (context) => { seen.push(context.price); return []; },
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        menu.setPriceSource(null);
        containerEl.dispatchEvent(mouseEvent('contextmenu'));

        assert.deepEqual(seen, [59_850, null], 'no series can answer, so the page is told so');
    });

    it('reports no price rather than guessing when the series throws', () => {
        const seen = [];
        menu.init(containerEl, chartOptions({
            priceSource: { coordinateToPrice() { throw new Error('detached series'); } },
            provideItems: (context) => {
                seen.push([context.price, context.priceText]);
                return tradingRows([])(context);
            },
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(seen, [[null, '--']]);
        assert.equal(itemKeyed(menu, 'buy').textContent, 'Buy @ --');
        assert.equal(itemKeyed(menu, 'buy').disabled, true);
    });

    it('a provider that throws costs that open\'s rows, not the whole menu', () => {
        let asked = 0;
        menu.init(containerEl, chartOptions({
            provideItems: (context) => {
                asked++;
                if (asked === 1) throw new Error('blotter not ready');
                return [chartRows(hooks, context.host)];
            },
        }));

        const warnings = captureWarnings(() => {
            containerEl.dispatchEvent(mouseEvent('contextmenu'));
        });

        assert.equal(menu._menuEl.style.display, 'block', 'the chart still answers the right-click');
        assert.deepEqual(menuLayout(menu), [],
            'and shows nothing: with no rows of its own, the provider\'s fault costs every row');
        assert.equal(warnings.length, 1, 'the fault is reported rather than swallowed');

        // The same menu element serves the next right-click, so one bad open is one bad open.
        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        assert.deepEqual(menuItems(menu).map(item => item.label), ['Add indicator…', 'Add pane…']);
    });

    it('a row that throws still leaves the menu closed', () => {
        menu.init(containerEl, chartOptions({
            provideItems: () => [[{ key: 'boom', label: 'Boom', invoke() { throw new Error('no route'); } }]],
        }));

        containerEl.dispatchEvent(mouseEvent('contextmenu'));
        const warnings = captureWarnings(() => {
            itemKeyed(menu, 'boom').dispatchEvent({ type: 'click' });
        });

        assert.equal(menu._menuEl.style.display, 'none');
        assert.equal(warnings.length, 1);
    });
});
