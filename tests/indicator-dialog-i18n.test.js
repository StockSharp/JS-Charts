// Audit proofs for the UI stack (src/chart): 2.5, 2.6, 3.5, 3.8.
//
// Every test below asserts the behaviour the audit says is owed, so each one is red while the
// finding lives. Nothing here is fixed — this file only pins the defect.
//
// tests/headless-dom.js gets a chart onto a browser-free host, but its element double has no
// innerHTML, no querySelector and no getElementById, and ChartLegend / IndicatorDialog are written
// entirely in those three. So this file carries a small DOM of its own: a real (tiny) HTML parser,
// class/attribute selectors, dataset that writes through to attributes, and event dispatch that
// actually bubbles — which is the part finding 3.5 turns on, because the stale document listener
// only survives thanks to `contains()` answering true over a detached subtree.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------------------------
// A minimal DOM, installed before the modules under test are required: src/chart/i18n.ts reads
// window.__T once, at module-init time, so the dictionary has to exist before the first require.
// ---------------------------------------------------------------------------------------------

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

const VOID_TAGS = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'option-void']);
const TAG_RE = /<(\/)?([a-zA-Z][\w-]*)([^>]*)>/g;
const ATTR_RE = /([\w:-]+)(?:\s*=\s*"([^"]*)")?/g;

function decodeEntities(text) {
    return String(text)
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&times;/g, '×')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

const dataAttributeName = (key) => `data-${String(key).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
const datasetKey = (name) => name.slice('data-'.length).replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** dataset has to write through to attributes: the legend sets `row.dataset.indId` and then finds
 *  the row again with `.legend-indicator[data-ind-id="…"]`. */
function makeDataset(attributes) {
    return new Proxy({}, {
        get: (_, key) => (typeof key === 'string' ? attributes.get(dataAttributeName(key)) : undefined),
        set: (_, key, value) => { attributes.set(dataAttributeName(key), String(value)); return true; },
        has: (_, key) => attributes.has(dataAttributeName(key)),
        deleteProperty: (_, key) => { attributes.delete(dataAttributeName(key)); return true; },
        ownKeys: () => [...attributes.keys()].filter((n) => n.startsWith('data-')).map(datasetKey),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true, value: undefined }),
    });
}

function parseSelector(selector) {
    return String(selector).split(',').map((part) => {
        const compound = part.trim();
        return {
            tag: compound.match(/^([a-zA-Z][\w-]*)/)?.[1] ?? null,
            id: compound.match(/#([\w-]+)/)?.[1] ?? null,
            classes: [...compound.matchAll(/\.([\w-]+)/g)].map((m) => m[1]),
            attrs: [...compound.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)]
                .map((m) => ({ name: m[1], value: m[2] })),
        };
    });
}

function matchesCompound(element, compound) {
    if (element.nodeType !== 1) return false;
    if (compound.tag && element.tagName !== compound.tag.toUpperCase()) return false;
    if (compound.id && element.getAttribute('id') !== compound.id) return false;
    for (const cls of compound.classes) if (!element.classList.contains(cls)) return false;
    for (const attr of compound.attrs) {
        const actual = element.getAttribute(attr.name);
        if (actual === null || actual === undefined) return false;
        if (attr.value !== undefined && actual !== attr.value) return false;
    }
    return true;
}

function dispatchWithBubbling(node, event) {
    if (event.target === undefined || event.target === null) event.target = node;
    let stopped = false;
    event.stopPropagation = () => { stopped = true; };
    event.preventDefault = () => { };
    const path = [];
    for (let current = node; current; current = current.parentElement) path.push(current);
    if (node.ownerDocument) path.push(node.ownerDocument);
    for (const step of path) {
        event.currentTarget = step;
        step._fire(event);
        if (stopped) break;
    }
    return true;
}

function createTextNode(document, text) {
    return { nodeType: 3, ownerDocument: document, parentElement: null, textContent: String(text) };
}

function createElement(document, tagName) {
    const attributes = new Map();
    const listeners = new Map();

    const element = {
        nodeType: 1,
        tagName: String(tagName).toUpperCase(),
        ownerDocument: document,
        childNodes: [],
        parentElement: null,
        style: {},
        dataset: makeDataset(attributes),

        getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
        setAttribute(name, value) {
            attributes.set(name, String(value));
            if (['value', 'title', 'type', 'id', 'placeholder', 'href'].includes(name))
                element[name] = String(value);
            if (['checked', 'selected', 'hidden', 'disabled'].includes(name)) element[name] = true;
        },
        removeAttribute(name) { attributes.delete(name); },

        get children() { return element.childNodes.filter((node) => node.nodeType === 1); },
        appendChild(child) {
            child.parentElement = element;
            element.childNodes.push(child);
            return child;
        },
        append(...nodes) { for (const node of nodes) element.appendChild(node); },
        removeChild(child) {
            const at = element.childNodes.indexOf(child);
            if (at >= 0) element.childNodes.splice(at, 1);
            child.parentElement = null;
            return child;
        },
        remove() { element.parentElement?.removeChild(element); },

        get textContent() {
            return element.childNodes
                .map((node) => (node.nodeType === 3 ? node.textContent : node.textContent))
                .join('');
        },
        set textContent(value) {
            for (const child of element.childNodes) child.parentElement = null;
            element.childNodes = [];
            if (value !== '') element.appendChild(createTextNode(document, value));
        },

        get innerHTML() { return element.childNodes.map(serialize).join(''); },
        set innerHTML(html) {
            for (const child of element.childNodes) child.parentElement = null;
            element.childNodes = [];
            for (const node of parseFragment(document, String(html))) element.appendChild(node);
            for (const node of descendants(element)) if (node.tagName === 'SELECT') syncSelect(node);
        },

        querySelector(selector) { return element.querySelectorAll(selector)[0] ?? null; },
        querySelectorAll(selector) {
            const compounds = parseSelector(selector);
            return descendants(element)
                .filter((node) => compounds.some((compound) => matchesCompound(node, compound)));
        },
        matches(selector) {
            return parseSelector(selector).some((compound) => matchesCompound(element, compound));
        },
        closest(selector) {
            for (let current = element; current; current = current.parentElement)
                if (current.nodeType === 1 && current.matches(selector)) return current;
            return null;
        },
        contains(node) {
            for (let current = node; current; current = current.parentElement)
                if (current === element) return true;
            return false;
        },

        addEventListener(type, listener, options) {
            let bucket = listeners.get(type);
            if (bucket === undefined) listeners.set(type, bucket = new Set());
            bucket.add(listener);
            options?.signal?.addEventListener?.('abort', () => bucket.delete(listener));
        },
        removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
        dispatchEvent(event) { return dispatchWithBubbling(element, event); },
        _fire(event) { for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event); },
        listenerCount(type) { return listeners.get(type)?.size ?? 0; },

        getBoundingClientRect() {
            return { x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 20, width: 200, height: 20 };
        },
        focus() { },
    };

    Object.defineProperty(element, 'className', {
        get: () => attributes.get('class') ?? '',
        set: (value) => { attributes.set('class', String(value)); },
        enumerable: true,
    });
    element.classList = {
        add: (value) => {
            const classes = new Set(element.className.split(/\s+/).filter(Boolean));
            classes.add(value);
            element.className = [...classes].join(' ');
        },
        remove: (value) => {
            const classes = new Set(element.className.split(/\s+/).filter(Boolean));
            classes.delete(value);
            element.className = [...classes].join(' ');
        },
        toggle: (value, force) => {
            const on = force ?? !element.classList.contains(value);
            if (on) element.classList.add(value); else element.classList.remove(value);
            return on;
        },
        contains: (value) => element.className.split(/\s+/).includes(value),
    };
    return element;
}

function descendants(root) {
    const out = [];
    const walk = (node) => {
        for (const child of node.childNodes) {
            out.push(child);
            if (child.nodeType === 1) walk(child);
        }
    };
    walk(root);
    return out;
}

function syncSelect(select) {
    const options = select.children.filter((child) => child.tagName === 'OPTION');
    const selected = options.find((option) => option.selected === true) ?? options[0];
    select.value = selected?.getAttribute('value') ?? '';
    select.options = options;
}

function serialize(node) {
    if (node.nodeType === 3) return node.textContent;
    const tag = node.tagName.toLowerCase();
    const cls = node.className ? ` class="${node.className}"` : '';
    return `<${tag}${cls}>${node.childNodes.map(serialize).join('')}</${tag}>`;
}

function parseFragment(document, html) {
    const roots = [];
    const stack = [];
    const push = (node) => {
        const parent = stack[stack.length - 1];
        if (parent) parent.appendChild(node); else roots.push(node);
    };
    let last = 0;
    let match;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(html)) !== null) {
        if (match.index > last) push(createTextNode(document, decodeEntities(html.slice(last, match.index))));
        last = TAG_RE.lastIndex;
        const [, closing, tag, rawAttributes] = match;
        if (closing) { stack.pop(); continue; }
        const element = createElement(document, tag);
        const attributeText = rawAttributes.replace(/\/\s*$/, '');
        ATTR_RE.lastIndex = 0;
        let attribute;
        while ((attribute = ATTR_RE.exec(attributeText)) !== null) {
            element.setAttribute(attribute[1], attribute[2] === undefined ? '' : decodeEntities(attribute[2]));
        }
        push(element);
        if (!/\/\s*$/.test(rawAttributes) && !VOID_TAGS.has(tag.toLowerCase())) stack.push(element);
    }
    if (last < html.length) push(createTextNode(document, decodeEntities(html.slice(last))));
    return roots;
}

function installDom() {
    const listeners = new Map();
    const document = {
        nodeType: 9,
        createElement: (tag) => createElement(document, tag),
        createTextNode: (text) => createTextNode(document, text),
        getElementById(id) {
            return descendants(document.documentElement).find(
                (node) => node.nodeType === 1 && node.getAttribute('id') === id,
            ) ?? null;
        },
        querySelector(selector) { return document.querySelectorAll(selector)[0] ?? null; },
        querySelectorAll(selector) { return document.documentElement.querySelectorAll(selector); },
        addEventListener(type, listener, options) {
            let bucket = listeners.get(type);
            if (bucket === undefined) listeners.set(type, bucket = new Set());
            bucket.add(listener);
            options?.signal?.addEventListener?.('abort', () => bucket.delete(listener));
        },
        removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
        _fire(event) { for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event); },
        listenerCount(type) { return listeners.get(type)?.size ?? 0; },
        clearListeners() { listeners.clear(); },
    };
    document.documentElement = createElement(document, 'html');
    document.body = createElement(document, 'body');
    document.documentElement.appendChild(document.body);

    const window = { document, __T: DICTIONARY, devicePixelRatio: 1, addEventListener() { }, removeEventListener() { } };
    globalThis.document = document;
    globalThis.window = window;
    return { document, window };
}

const dom = installDom();

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

describe('indicator dialog looks the source warning up under a stable key', () => {
    it('translates the unavailable-source warning through a stable key', () => {
        const modal = document.createElement('div');
        modal.setAttribute('id', 'indicator-modal');
        modal.innerHTML = '<div class="indicator-settings"></div>';
        document.body.appendChild(modal);

        const source = {
            kind: IndicatorSourceKind.IndicatorOutput,
            indicatorId: 'ind-0',
            outputId: 'value',
        };
        const snapshot = {
            id: 'ind-1', type: 'sma', name: 'SMA',
            parameterDefinitions: [], parameters: {},
            outputs: [],
            source,
            sourceStatus: { source, available: false, reason: IndicatorSourceStatusReason.MissingIndicator },
            paneId: null, priceScaleId: null, effectivePriceScaleId: 'right', visible: true,
        };
        const controller = {
            indicators: () => [],
            update: () => snapshot,
            get: (id) => (id === snapshot.id ? snapshot : undefined),
            subscribe() { }, unsubscribe() { },
        };
        const catalog = { subscribe() { }, unsubscribe() { }, search: () => [], isFavorite: () => false };
        const templates = { subscribe() { }, unsubscribe() { }, templates: () => [] };

        const dialog = new IndicatorDialog();
        dialog.init('indicator-modal', {}, controller, {}, catalog, templates);
        dialog._showSettings(snapshot.type, snapshot.id);

        const titles = modal.querySelectorAll('.indicator-section-title').map((el) => el.textContent.trim());
        assert.ok(
            titles.includes(DICTIONARY.Outputs),
            `the dictionary must be live before anything else is proved — section titles: ${JSON.stringify(titles)}`,
        );

        const warning = modal.querySelector('.indicator-source-warning');
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
});
