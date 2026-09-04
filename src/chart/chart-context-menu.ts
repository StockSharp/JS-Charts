// Chart Context Menu — replaces the browser's default right-click menu (Image / Copy / Save,
// useless on a chart canvas) with a floating menu at the cursor.
//
// Ctrl+click is the chart engine's gesture, not this menu's: the engine draws the order-placement
// preview under the cursor and emits an OrderPlace signal, and the page turns that signal into an
// order. So a Ctrl-modified right-click here only suppresses the native menu and returns —
// answering the same click twice would place one order and offer another.
//
// Nothing in this module buys, sells, cancels or adds an indicator. It contributes no rows at all:
// every one comes from the page through `provideItems`, so a trading terminal offers order rows, a
// chart with an indicator engine offers the picker, and a page with neither offers what it can do
// instead. Picking a row calls back and closes; the menu never acts on its own.
//
// What it does own is the framing: where the menu opens, what price the click landed on, and the
// rules drawn between the groups the page returns.
//
// Wire-up: the page calls init(container, options) and disposes on teardown.

import type { ChartUiHost, Translate } from './chart-host.js';

/// The price series, described structurally: the terminal passes its charting library's series
/// handle and the demo passes this package's, and pixel -> price is all the menu needs.
export interface PriceCoordinateSource {
    /// Price at a vertical offset inside the chart container, or null where the scale has no
    /// answer for that pixel.
    coordinateToPrice(coordinate: number): number | null;
}

/// What a row means, which is what decides its colour. The stylesheet owns the colours; a row
/// states its intent so a page never has to name a CSS class.
export const ChartContextMenuTone = {
    /// An ordinary action.
    Neutral: 'neutral',
    /// Adding, or buying.
    Positive: 'positive',
    /// Selling, cancelling, removing.
    Negative: 'negative',
} as const;
export type ChartContextMenuToneValue = typeof ChartContextMenuTone[keyof typeof ChartContextMenuTone];

const TONE_CLASSES: Readonly<Record<ChartContextMenuToneValue, string>> = {
    [ChartContextMenuTone.Neutral]: '',
    [ChartContextMenuTone.Positive]: 'chart-ctx-buy',
    [ChartContextMenuTone.Negative]: 'chart-ctx-sell',
};

/// One clickable row.
///
/// There is deliberately no way to describe a separator: a provider states what its group holds,
/// and the menu draws the rules between groups, so no contributor can leave a rule hanging above
/// rows that turned out to be empty.
export interface ChartContextMenuEntry {
    /// Stable id for the row, rendered as `data-ctx-key`. Identifies the row to tests and to the
    /// page; never shown to the reader.
    readonly key: string;

    /// The text to show, already worded and already translated by whoever built the row.
    readonly label: string;

    /// Class list for the row's icon element, e.g. `bi bi-graph-up`. Omitted leaves the row's icon
    /// slot empty rather than unindented: rows in one menu line up their labels whether or not
    /// every one of them has an icon, because a ragged column is harder to read than a plain one.
    ///
    /// A class rather than an image or a glyph, because the icon font is the page's choice - this
    /// module ships none and knows the name of none.
    readonly icon?: string;

    /// Defaults to `Neutral`.
    readonly tone?: ChartContextMenuToneValue;

    /// Shown but not clickable. Defaults to clickable.
    ///
    /// A row that cannot act right now stays in place greyed out rather than disappearing: a menu
    /// whose rows move between right-clicks is one the reader has to re-read every time.
    readonly disabled?: boolean;

    /// Do the thing. The menu closes first, so this may open a dialog of its own.
    invoke(): void;
}

/// What the page is told about the click it is being asked to answer.
export interface ChartContextMenuContext {
    /// Price under the cursor, or null when the click landed where no price axis answers — a
    /// sub-pane header, or a chart whose scale is not ready.
    readonly price: number | null;

    /// `price` as the page words it, or `'--'`. Handed over already formatted so every row spells
    /// the same number the same way.
    readonly priceText: string;

    /// The page's own services, for a provider that lives away from its wiring.
    readonly host: ChartUiHost;
}

/// The rows a page contributes to one right-click, in groups.
///
/// Every row in the menu comes from here - the module contributes none of its own. That is not
/// minimalism: a right-click menu offers what the page can do, and only the page knows what that
/// is. "Add indicator" is no more the menu's business than "Buy here" is; a page with no indicator
/// engine would have been left rendering a row that cannot act.
///
/// A function rather than a fixed array because what a page offers depends on the click: the price
/// under the cursor is in the label ("Cancel 3 orders at 41,250.5"), and what is resting at that
/// price decides whether the row can act at all. An array would have to be rebuilt by the page on
/// every mouse move to say as much.
///
/// Groups are how a page asks for a dividing rule: one is drawn between groups and never above the
/// first or below the last, so an empty group costs nothing. Returning no groups, or only empty
/// ones, suppresses the menu entirely - which is the honest answer when there is nothing to offer.
export type ChartContextMenuProvider =
    (context: ChartContextMenuContext) => readonly (readonly ChartContextMenuEntry[])[];

/// Where the menu is mounted, which decides whether there is a price to answer about.
export const ChartContextMenuMode = {
    /// The price chart.
    Chart: 'chart',
    /// One indicator sub-pane's header.
    Pane: 'pane',
} as const;
export type ChartContextMenuModeValue = typeof ChartContextMenuMode[keyof typeof ChartContextMenuMode];

interface ChartContextMenuOptionsBase {
    /// Words and numbers, from the page.
    readonly host: ChartUiHost;

    /// Every row the menu shows, asked for on each open.
    readonly provideItems: ChartContextMenuProvider;
}

/// Mounting the menu on the price chart.
export interface ChartContextMenuChartOptions extends ChartContextMenuOptionsBase {
    readonly mode: typeof ChartContextMenuMode.Chart;

    /// Pixel -> price for the series currently drawn. Switching chart type replaces the series, so
    /// the new one has to arrive through `setPriceSource`.
    readonly priceSource: PriceCoordinateSource;
}

/// Mounting the menu on a sub-pane header. There is no price axis here, so the context carries no
/// price and the rows cannot speak of one.
export interface ChartContextMenuPaneOptions extends ChartContextMenuOptionsBase {
    readonly mode: typeof ChartContextMenuMode.Pane;
}

export type ChartContextMenuOptions = ChartContextMenuChartOptions | ChartContextMenuPaneOptions;

export class ChartContextMenu {
    _container: HTMLElement | null;
    _options: ChartContextMenuOptions | null;
    _priceSource: PriceCoordinateSource | null;
    _menuEl: HTMLDivElement | null;
    _onContextMenu: ((event: MouseEvent) => void) | null;
    _onDocumentClick: ((event: MouseEvent) => void) | null;
    _onEscape: ((event: KeyboardEvent) => void) | null;

    constructor() {
        this._container = null;
        this._options = null;
        this._priceSource = null;
        this._menuEl = null;

        this._onContextMenu = null;
        this._onDocumentClick = null;
        this._onEscape = null;
    }

    /// Attach handlers and build the menu DOM. Idempotent — re-calls dispose() first so callers
    /// can re-init after a chart rebuild (timeframe / symbol change recreates the candle series).
    init(containerEl: HTMLElement, options: ChartContextMenuOptions): void {
        this.dispose();

        this._container = containerEl;
        this._options = options;
        this._priceSource = options.mode === ChartContextMenuMode.Chart ? options.priceSource : null;

        // The menu lives on body so it floats above panel resizers and docking splitters, and is
        // placed at the click coordinates. Everything but left/top/display comes from the
        // stylesheet, including `position: fixed` and the stacking order.
        this._menuEl = document.createElement('div');
        this._menuEl.className = 'chart-ctx-menu';
        this._menuEl.style.display = 'none';
        document.body.appendChild(this._menuEl);

        this._onContextMenu = (event) => this.openAt(event);
        this._onDocumentClick = (event) => {
            if (this._menuEl !== null && !this._menuEl.contains(event.target as Node)) this.close();
        };
        this._onEscape = (event) => {
            if (event.key === 'Escape') this.close();
        };

        containerEl.addEventListener('contextmenu', this._onContextMenu);
        document.addEventListener('click', this._onDocumentClick);
        document.addEventListener('keydown', this._onEscape);
    }

    /// Hand over the series to read prices from. The chart-type switcher builds a new series on
    /// every candle/line/area/bar toggle, and the old one stops answering, so pixel -> price is
    /// wrong until the new one arrives. Null while a switch is in flight and nothing can answer.
    setPriceSource(source: PriceCoordinateSource | null): void {
        this._priceSource = source;
    }

    /// Open the menu for a right-click the caller routed here itself.
    ///
    /// Sub-panes share one canvas with the chart, so the pane manager hit-tests the click against
    /// the pane bands and hands the event to the menu of the pane that was hit.
    openAt(event: MouseEvent): void {
        // Ctrl+right belongs to the engine's order-placement gesture, which suppresses the native
        // menu on its own. Bail rather than pop this menu on top of it.
        if (event.ctrlKey) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        this._showMenu(event.clientX, event.clientY, this._priceAt(event.clientY));
    }

    /// Hide the menu, leaving it attached and ready for the next right-click.
    close(): void {
        if (this._menuEl !== null) this._menuEl.style.display = 'none';
    }

    dispose(): void {
        if (this._container !== null && this._onContextMenu !== null)
            this._container.removeEventListener('contextmenu', this._onContextMenu);
        if (this._onDocumentClick !== null) document.removeEventListener('click', this._onDocumentClick);
        if (this._onEscape !== null) document.removeEventListener('keydown', this._onEscape);
        this._menuEl?.remove();

        this._container = null;
        this._options = null;
        this._priceSource = null;
        this._menuEl = null;
        this._onContextMenu = null;
        this._onDocumentClick = null;
        this._onEscape = null;
    }

    _priceAt(clientY: number): number | null {
        if (this._priceSource === null || this._container === null) return null;

        const y = clientY - this._container.getBoundingClientRect().top;
        try {
            const price = this._priceSource.coordinateToPrice(y);
            return typeof price === 'number' && Number.isFinite(price) ? price : null;
        } catch {
            return null;
        }
    }

    _showMenu(x: number, y: number, price: number | null): void {
        const options = this._options;
        const menuEl = this._menuEl;
        if (options === null || menuEl === null) return;

        const host = options.host;
        const priceText = price === null ? '--' : host.formatters.price(price);

        // A provider that throws costs its rows, not the menu: page code runs here, and a chart
        // that stops answering right-clicks because of it is the worse failure.
        let groups: readonly (readonly ChartContextMenuEntry[])[] = [];
        try {
            groups = options.provideItems({ price, priceText, host });
        } catch (err) {
            console.warn('[ctx-menu] provideItems', err);
        }

        menuEl.innerHTML = '';
        let drawn = 0;
        for (const group of groups) {
            if (group.length === 0) continue;
            if (drawn > 0) {
                const separator = document.createElement('div');
                separator.className = 'chart-ctx-sep';
                menuEl.appendChild(separator);
            }
            for (const entry of group) menuEl.appendChild(this._renderEntry(entry));
            drawn++;
        }

        // Native :fullscreen puts the chart panel in the browser's top layer, above everything
        // rooted in body — where the menu lives, and where it would be invisible. Move it into the
        // fullscreen element so it shares that layer.
        const fullscreenEl = document.fullscreenElement
            ?? (document as unknown as { webkitFullscreenElement: Element | null }).webkitFullscreenElement;
        const target: Element = fullscreenEl ?? document.body;
        if (menuEl.parentElement !== target) target.appendChild(menuEl);

        // Reveal, then place: the size is only measurable once it is displayed. Clamped to the
        // viewport so a click near the chart's bottom-right corner does not push the menu off it.
        menuEl.style.display = 'block';
        const maxX = window.innerWidth - menuEl.offsetWidth - 4;
        const maxY = window.innerHeight - menuEl.offsetHeight - 4;
        menuEl.style.left = Math.min(x, maxX) + 'px';
        menuEl.style.top = Math.min(y, maxY) + 'px';
    }

    _renderEntry(entry: ChartContextMenuEntry): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `chart-ctx-item ${TONE_CLASSES[entry.tone ?? ChartContextMenuTone.Neutral]}`.trim();
        button.dataset.ctxKey = entry.key;

        // The slot is always drawn, even with no icon in it, so every label in a menu starts at the
        // same x. `aria-hidden` because the icon repeats the label beside it and a reader hearing
        // both hears it twice.
        const icon = document.createElement('i');
        icon.className = `chart-ctx-icon ${entry.icon ?? ''}`.trim();
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
        button.appendChild(document.createTextNode(entry.label));

        if (entry.disabled === true) {
            button.disabled = true;
            return button;
        }

        button.addEventListener('click', () => {
            this.close();
            try {
                entry.invoke();
            } catch (err) {
                console.warn('[ctx-menu]', err);
            }
        });
        return button;
    }
}
