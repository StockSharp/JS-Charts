// IndicatorDialog, worded through its host.
//
// The dialog no longer reads a page global for its dictionary: every string it renders goes
// through the ChartUiHost it was constructed with. Two things are pinned here. That the injected
// translator is the one actually consulted — a page may hold two dialogs and two languages at
// once — and that the unavailable-source warning is looked up under a key a dictionary can hold,
// rather than one with the reason interpolated into it, which no entry could ever match.
//
// The DOM double lives in tests/mini-dom.js and has to be installed before the module is required.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');

// A decoy dictionary on `window`. Nothing the dialog renders may come from here: the host is the
// only place it is allowed to ask.
const GLOBAL_DICTIONARY = {
    Outputs: 'GLOBAL-OUTPUTS',
    Source: 'GLOBAL-SOURCE',
    'Source unavailable: the indicator it reads no longer exists': 'GLOBAL-UNAVAILABLE',
};

const dom = installMiniDom(GLOBAL_DICTIONARY);

// The modules under test are required *after* the DOM exists.
const { IndicatorDialog } = require('../src/chart/indicator-dialog.js');
const { createTranslate, defaultChartFormatters, identityTranslate } = require('../src/chart/chart-host.js');
const {
    IndicatorSourceKind,
    IndicatorSourceStatusReason,
} = require('@stocksharp/indicators');

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
    // Interpolated keys — 'Source unavailable: missing-indicator' and friends — are deliberately
    // absent, because a dictionary cannot enumerate one entry per enum value.
};

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

// The markup the dialog queries. It creates none of this itself: every element below is one the
// constructor demands by selector, and the picker's own rows are rendered into `.indicator-list`.
const DIALOG_MARKUP = `
    <div class="indicator-dialog-body">
        <input type="text" class="indicator-search-input" value="" />
        <div class="indicator-category-tabs"></div>
        <div class="indicator-list"></div>
        <div class="indicator-settings"></div>
        <div class="active-indicators-list"></div>
    </div>`;

function mountRoot() {
    const root = dom.document.createElement('div');
    root.innerHTML = DIALOG_MARKUP;
    dom.document.body.appendChild(root);
    return root;
}

/** The page's modal, which is now the only thing that shows and hides the dialog. */
function modalStub() {
    const closedHandlers = [];
    return {
        opened: 0,
        closed: 0,
        open() { this.opened++; },
        close() { this.closed++; for (const handler of closedHandlers) handler(); },
        onClosed(handler) { closedHandlers.push(handler); },
    };
}

function hostWith(translate) {
    return { translate, formatters: defaultChartFormatters, notify: () => { } };
}

/** A host that answers from `dictionary` and from nowhere else. */
function dictionaryHost(dictionary) {
    return hostWith(createTranslate(dictionary));
}

/** A host that answers in English and remembers every key it was asked for. */
function recordingHost() {
    const keys = [];
    return {
        keys,
        host: hostWith((key, ...args) => {
            keys.push(key);
            return identityTranslate(key, ...args);
        }),
    };
}

function snapshotWith(reason) {
    const source = {
        kind: IndicatorSourceKind.IndicatorOutput,
        indicatorId: 'ind-0',
        outputId: 'value',
    };
    return {
        id: 'ind-1', type: 'sma', name: 'SMA',
        parameterDefinitions: [], parameters: {},
        outputs: [],
        source,
        sourceStatus: { source, available: false, reason },
        paneId: null, priceScaleId: null, effectivePriceScaleId: 'right', visible: true,
    };
}

/** Everything the dialog is handed besides its root, modal and host. */
function dependencies(snapshot) {
    return {
        engine: {
            add: () => null,
            remove() { },
            getIndicators: () => [],
        },
        controller: {
            indicators: () => [],
            get: (id) => (id === snapshot.id ? snapshot : undefined),
            update: () => snapshot,
            setVisible() { },
            subscribe() { }, unsubscribe() { },
        },
        catalog: {
            entries: () => [],
            search: () => [],
            isFavorite: () => false,
            toggleFavorite: async () => { },
            subscribe() { }, unsubscribe() { },
        },
        templates: {
            templates: () => [],
            create: async () => ({ id: 'template', name: 'Template' }),
            replace: async () => { },
            apply: () => snapshot,
            remove: async () => { },
            subscribe() { }, unsubscribe() { },
        },
        chart: { panes: () => [] },
    };
}

/** Builds the dialog over a freshly mounted root and opens the editor on `snapshot`. */
function openEditor(host, snapshot) {
    const root = mountRoot();
    const modal = modalStub();
    const dialog = new IndicatorDialog({ root, modal, host, ...dependencies(snapshot) });
    dialog.showEdit(snapshot.id);
    return { root, modal, dialog };
}

const sectionTitles = (root) => root
    .querySelectorAll('.indicator-section-title')
    .map((element) => element.textContent.trim());

beforeEach(() => {
    dom.document.body.childNodes = [];
    dom.document.clearListeners();
});

// ---------------------------------------------------------------------------------------------

describe('indicator dialog looks the source warning up under a stable key', () => {
    it('translates the unavailable-source warning through a stable key', () => {
        const snapshot = snapshotWith(IndicatorSourceStatusReason.MissingIndicator);
        const { root } = openEditor(dictionaryHost(DICTIONARY), snapshot);

        const titles = sectionTitles(root);
        assert.ok(
            titles.includes(DICTIONARY.Outputs),
            `the dictionary must be live before anything else is proved — section titles: ${JSON.stringify(titles)}`,
        );

        const warning = root.querySelector('.indicator-source-warning');
        assert.ok(warning, 'an unavailable source renders a warning in the editor');
        const text = warning.textContent.trim();
        assert.ok(
            text.startsWith('RENDERED-UNAVAILABLE'),
            'the warning must be looked up under a key a dictionary can actually hold: the reason '
            + 'was interpolated into the key itself, so no entry could ever match it; got: '
            + JSON.stringify(text),
        );
        assert.ok(
            !text.includes(IndicatorSourceStatusReason.MissingIndicator),
            `the raw enum slug must not reach the user; got: ${JSON.stringify(text)}`,
        );
    });

    it('keys every unavailable reason on fixed text, slug or no slug', () => {
        // The four reasons the dialog words itself, plus one it has never heard of — a newer
        // indicators package is free to add reasons, and the key has to stay fixed then too.
        const reasons = [
            IndicatorSourceStatusReason.MissingIndicator,
            IndicatorSourceStatusReason.MissingOutput,
            IndicatorSourceStatusReason.UpstreamUnavailable,
            IndicatorSourceStatusReason.Error,
            'invented-later',
        ];

        for (const reason of reasons) {
            const { keys, host } = recordingHost();
            openEditor(host, snapshotWith(reason));

            const asked = keys.filter((key) => key.startsWith('Source unavailable'));
            assert.equal(
                asked.length, 1,
                `exactly one warning key per render; reason ${reason} asked for ${JSON.stringify(asked)}`,
            );
            assert.ok(
                !asked[0].includes(reason),
                'the reason must ride as an argument, not be baked into the key a dictionary is '
                + `asked for; reason ${reason} produced the key ${JSON.stringify(asked[0])}`,
            );
        }
    });
});

describe('indicator dialog words itself through the host it was given', () => {
    it('renders two dialogs in two languages at once, and reads no page global', () => {
        const snapshot = snapshotWith(IndicatorSourceStatusReason.MissingIndicator);
        const first = openEditor(dictionaryHost({ ...DICTIONARY, Outputs: 'HOST-A-OUTPUTS' }), snapshot);
        const second = openEditor(dictionaryHost({ ...DICTIONARY, Outputs: 'HOST-B-OUTPUTS' }), snapshot);

        assert.ok(
            sectionTitles(first.root).includes('HOST-A-OUTPUTS'),
            `the first dialog must word itself through its own host: ${JSON.stringify(sectionTitles(first.root))}`,
        );
        assert.ok(
            sectionTitles(second.root).includes('HOST-B-OUTPUTS'),
            `the second dialog must word itself through its own host: ${JSON.stringify(sectionTitles(second.root))}`,
        );
        for (const { root } of [first, second]) {
            assert.ok(
                !sectionTitles(root).includes(GLOBAL_DICTIONARY.Outputs),
                'nothing may be looked up in window.__T; the host is the whole dictionary',
            );
        }
    });

    it('opens through the modal controller instead of showing itself', () => {
        const snapshot = snapshotWith(IndicatorSourceStatusReason.MissingIndicator);
        const { modal, dialog } = openEditor(dictionaryHost(DICTIONARY), snapshot);

        assert.equal(modal.opened, 1, 'showEdit opens the page\'s modal');
        assert.equal(modal.closed, 0, 'and closes nothing on the way in');

        dialog.hide();
        assert.equal(modal.closed, 1, 'hide closes through the same controller');
    });
});
