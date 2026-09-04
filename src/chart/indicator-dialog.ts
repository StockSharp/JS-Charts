// Indicator picker and editor: the searchable catalog on the left, the full per-indicator editor
// on the right, the live list of what is already on the chart underneath it.
//
// Everything the module needs from the page arrives through IndicatorDialogOptions - the host
// services, the controller that shows and hides it, the engine it adds to, the workspace
// controllers it edits through. Nothing is read off `window`, and the module owns no modal
// behaviour of its own: no backdrop, no scroll lock, no Escape key.
import { IndicatorSettings } from './indicators/indicator-settings.js';
import { humanize } from '@stocksharp/indicators';
import {
    IndicatorCandleField,
    IndicatorSourceKind, IndicatorSourceStatusReason,
    type IndicatorParameterValue,
    type IndicatorOutputStylePatch,
    type IndicatorSource,
} from '@stocksharp/indicators';
import type { ChartUiHost, ModalController, Translate } from './chart-host.js';
import type {
    IndicatorController,
    IndicatorControllerSnapshot,
    IndicatorUpdatePatch,
} from '../workspace/indicator-controller.js';
import { IndicatorCatalogController } from './engine.js';
import type {
    IndicatorCatalogEntry,
    IndicatorCatalogListener,
    IndicatorFavoritesStorage,
} from '../workspace/indicator-catalog-controller.js';
import type {
    IndicatorTemplateController,
    IndicatorTemplateListener,
} from '../workspace/templates.js';

const FAVORITES_GROUP = '__favorites__';

const FAVORITE_ON = '★';
const FAVORITE_OFF = '☆';

// The search box is focused after the host's modal has finished appearing: a modal that fades in
// moves focus itself as it settles, and focusing into the middle of that transition loses the
// caret again. Long enough to outlast Bootstrap's fade, short enough to feel immediate.
const FOCUS_DELAY_MS = 200;

const CANDLE_FIELDS = [
    [IndicatorCandleField.Open, 'Open'],
    [IndicatorCandleField.High, 'High'],
    [IndicatorCandleField.Low, 'Low'],
    [IndicatorCandleField.Close, 'Close'],
    [IndicatorCandleField.Median, 'HL2'],
    [IndicatorCandleField.Typical, 'HLC3'],
    [IndicatorCandleField.Average, 'OHLC4'],
    [IndicatorCandleField.Volume, 'Volume'],
] as const;

const LINE_STYLES = [
    [0, 'Solid'],
    [1, 'Dotted'],
    [2, 'Dashed'],
    [3, 'Large dashed'],
    [4, 'Sparse dotted'],
] as const;

/** One live indicator, as the engine reports it. */
export interface IndicatorDialogEngineEntry {
    /** Runtime id. This is what `remove` takes and what a legend button carries. */
    readonly id: string | number;

    /** Stable layout id. This is what the workspace controller keys on. */
    readonly persistenceId: string;
}

/**
 * The engine operations the dialog drives directly.
 *
 * Everything else it does to an indicator - parameters, source, placement, output styling - goes
 * through IndicatorController so it lands on the command stack and can be undone. Only creation
 * and destruction have no controller equivalent, so only those are named here.
 */
export interface IndicatorDialogEngine {
    /** Creates an indicator of `type` in `targetPaneId`; null when the engine refused. */
    add(
        type: string,
        parameters: Readonly<Record<string, IndicatorParameterValue>>,
        targetPaneId: string,
    ): IndicatorDialogEngineEntry | null;

    /** Destroys the indicator with this runtime id. */
    remove(id: string | number): void;

    /** Everything currently on the chart. */
    getIndicators(): readonly IndicatorDialogEngineEntry[];
}

/** One pane of the chart, as the placement selectors read it. */
export interface IndicatorDialogPane {
    id(): string;
    priceScaleIds(): readonly string[];
}

/** The chart, narrowed to what the placement selectors need to list. */
export interface IndicatorDialogChart {
    panes(): readonly IndicatorDialogPane[];
}

/** Everything the dialog needs to run. */
export interface IndicatorDialogOptions {
    /** The dialog's markup. Queried once, and never created by this module. */
    readonly root: HTMLElement;

    /** Shows and hides `root`. The page owns backdrop, scroll lock, focus trap and Escape. */
    readonly modal: ModalController;

    readonly host: ChartUiHost;
    readonly engine: IndicatorDialogEngine;
    readonly controller: IndicatorController;
    readonly catalog: IndicatorCatalogController;
    readonly templates: IndicatorTemplateController;
    readonly chart: IndicatorDialogChart;
}

/** One catalog row, kept alive for the life of the dialog so filtering never rebuilds it. */
interface IndicatorListRow {
    readonly id: string;
    readonly element: HTMLElement;
    readonly favorite: HTMLElement;
    /** Lower-cased `name fullName translatedFullName`, matched as a plain substring. */
    readonly searchKey: string;
}

/**
 * Wording for an unavailable source.
 *
 * One fixed key per reason, with the raw slug reaching the reader only through the argument of a
 * positional key -- the form this file uses elsewhere ('Add {0}'). A key with the reason
 * interpolated into it is a key no dictionary can hold, so the warning would stay in English.
 */
function sourceUnavailableText(
    translate: Translate,
    reason: IndicatorSourceStatusReason,
): string {
    switch (reason) {
        case IndicatorSourceStatusReason.MissingIndicator:
            return translate('Source unavailable: the indicator it reads no longer exists');
        case IndicatorSourceStatusReason.MissingOutput:
            return translate('Source unavailable: the output it reads no longer exists');
        case IndicatorSourceStatusReason.UpstreamUnavailable:
            return translate('Source unavailable: an indicator it depends on is unavailable');
        case IndicatorSourceStatusReason.Error:
            return translate('Source unavailable: it could not be evaluated');
        default:
            return translate('Source unavailable: {0}', reason);
    }
}

/** Trading-workspace indicator picker and complete editor over IndicatorController. */
export class IndicatorDialog {
    private readonly root: HTMLElement;
    private readonly modal: ModalController;
    private readonly host: ChartUiHost;
    private readonly engine: IndicatorDialogEngine;
    private readonly controller: IndicatorController;
    private readonly catalog: IndicatorCatalogController;
    private readonly templates: IndicatorTemplateController;
    private readonly chart: IndicatorDialogChart;
    private readonly searchInput: HTMLInputElement;
    private readonly listEl: HTMLElement;
    private readonly emptyEl: HTMLElement;
    private readonly tabsEl: HTMLElement;
    private readonly settingsEl: HTMLElement;
    private readonly activeListEl: HTMLElement;
    private readonly events = new AbortController();
    private rows: readonly IndicatorListRow[] = [];
    private targetPaneId: string | null = null;
    private editingId: string | null = null;
    private editingSnapshot: IndicatorControllerSnapshot | null = null;
    /** Where the dialog came from, while it sits inside a fullscreen element instead. */
    private restoreParent: HTMLElement | null = null;
    private shown = false;
    private disposed = false;

    private readonly translate: Translate = (key, ...args) => this.host.translate(key, ...args);

    private readonly handleControllerChange = (): void => {
        if (this.disposed || !this.shown) return;
        this.renderActiveList();
    };
    private readonly handleCatalogChange: IndicatorCatalogListener = (): void => {
        if (this.disposed) return;
        this.syncFavorites();
    };
    private readonly handleTemplateChange: IndicatorTemplateListener = (): void => {
        if (this.disposed || !this.shown || this.editingSnapshot === null) return;
        this.refreshTemplateSelect(this.editingSnapshot.type);
    };
    private readonly handleClosed = (): void => {
        this.shown = false;
        this.restoreFromFullscreen();
    };

    constructor(options: IndicatorDialogOptions) {
        if (options === null || typeof options !== 'object')
            throw new TypeError('sschart: indicator dialog options are required');

        this.root = requireMethods(options.root, 'root element', ['querySelector', 'querySelectorAll']);
        this.modal = requireMethods(options.modal, 'modal controller', ['open', 'close', 'onClosed']);
        this.host = requireMethods(options.host, 'host', ['translate', 'notify']);
        this.engine = requireMethods(options.engine, 'engine', ['add', 'remove', 'getIndicators']);
        this.controller = requireMethods(options.controller, 'controller', [
            'indicators', 'get', 'update', 'setVisible', 'subscribe', 'unsubscribe',
        ]);
        this.catalog = requireMethods(options.catalog, 'catalog', [
            'entries', 'search', 'isFavorite', 'toggleFavorite', 'subscribe', 'unsubscribe',
        ]);
        this.templates = requireMethods(options.templates, 'templates', [
            'templates', 'create', 'replace', 'apply', 'remove', 'subscribe', 'unsubscribe',
        ]);
        this.chart = requireMethods(options.chart, 'chart', ['panes']);
        this.searchInput = requireElement(this.root, '.indicator-search-input');
        this.listEl = requireElement(this.root, '.indicator-list');
        this.tabsEl = requireElement(this.root, '.indicator-category-tabs');
        this.settingsEl = requireElement(this.root, '.indicator-settings');
        this.activeListEl = requireElement(this.root, '.active-indicators-list');

        const signal = this.events.signal;
        this.renderCategoryTabs();
        this.buildList();
        this.emptyEl = requireElement(this.listEl, '.indicator-list-empty');
        this.applyFilter();

        this.root.querySelectorAll('[data-close-modal]').forEach(button => (
            button.addEventListener('click', () => this.hide(), { signal })
        ));
        this.searchInput.addEventListener('input', () => this.applyFilter(), { signal });
        this.tabsEl.querySelectorAll('.indicator-category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.tabsEl.querySelectorAll('.indicator-category-tab')
                    .forEach(item => item.classList.remove('active'));
                tab.classList.add('active');
                this.applyFilter();
            }, { signal });
        });
        this.modal.onClosed(this.handleClosed);
        this.controller.subscribe(this.handleControllerChange);
        this.catalog.subscribe(this.handleCatalogChange);
        this.templates.subscribe(this.handleTemplateChange);
    }

    /** Opens the picker with nothing selected. */
    show(): void {
        this.renderActiveList();
        this.targetPaneId = null;
        this.editingId = null;
        this.editingSnapshot = null;
        this.settingsEl.innerHTML = `<div class="indicator-editor-empty">${html(
            this.translate('Select an indicator from the list'),
        )}</div>`;
        this.searchInput.value = '';
        // The category tab keeps whatever the user last chose, and the list is re-filtered
        // through it. Reopening on All instead would leave the strip reading Trend over a list
        // that also shows Volatility and Momentum rows.
        this.applyFilter();
        this.moveIntoFullscreen();
        this.modal.open();
        this.shown = true;
        setTimeout(() => this.searchInput.focus(), FOCUS_DELAY_MS);
    }

    /** Opens the picker so that whatever is added next lands in this pane. */
    showForPane(paneId: string): void {
        this.show();
        this.targetPaneId = paneId;
    }

    /**
     * Opens the editor on one indicator.
     *
     * Takes either id the page might be holding: the legend and the pane headers carry the
     * engine's runtime id, the workspace carries the stable persistence id.
     */
    showEdit(indicatorId: string | number): void {
        this.show();
        const snapshot = this.resolveSnapshot(indicatorId);
        if (snapshot !== undefined) this.renderEditor(snapshot);
    }

    /** Closes the dialog through the host's modal controller. */
    hide(): void {
        this.modal.close();
    }

    /** Detaches every listener. The dialog cannot be reopened afterwards. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.events.abort();
        this.controller.unsubscribe(this.handleControllerChange);
        this.catalog.unsubscribe(this.handleCatalogChange);
        this.templates.unsubscribe(this.handleTemplateChange);
        this.restoreFromFullscreen();
        this.shown = false;
    }

    /**
     * Native fullscreen puts the chart panel in the browser's top layer, and a dialog left in
     * `document.body` renders underneath it - the user presses the button and sees nothing at
     * all. Moving the dialog inside the fullscreen element puts it in the same layer; the
     * modal controller's close handler moves it back.
     */
    private moveIntoFullscreen(): void {
        if (this.restoreParent !== null) return;
        const target = fullscreenElement();
        const parent = this.root.parentElement;
        if (target === null || parent === null || target === parent) return;
        this.restoreParent = parent;
        target.appendChild(this.root);
    }

    private restoreFromFullscreen(): void {
        if (this.restoreParent === null) return;
        this.restoreParent.appendChild(this.root);
        this.restoreParent = null;
    }

    private renderCategoryTabs(): void {
        const groups = IndicatorSettings.GROUPS as readonly string[];
        const categories = [
            ['All', this.translate('All')],
            [FAVORITES_GROUP, this.translate('Favorites')],
            ...groups.map(group => [group, this.translate(group)]),
        ] as const;
        this.tabsEl.innerHTML = categories
            .map(([group, label], index) => {
                return `<button type="button" class="indicator-category-tab${
                    index === 0 ? ' active' : ''
                }" data-group="${attr(group)}">${html(label)}</button>`;
            }).join('');
    }

    /**
     * Renders every catalog entry once.
     *
     * Filtering then only toggles rows, so the scroll position and the caret in the search box
     * survive every keystroke.
     */
    private buildList(): void {
        const entries = this.catalog.entries();
        this.listEl.innerHTML = entries.map(entry => this.listRowHtml(entry)).join('')
            + '<div class="indicator-list-empty"></div>';
        const elements = this.listEl.querySelectorAll('.indicator-list-item');
        const signal = this.events.signal;
        this.rows = entries.map((entry, index) => {
            const element = elements[index] as HTMLElement;
            element.querySelector('.indicator-list-select')?.addEventListener('click', () => (
                this.renderAddSettings(entry.id)
            ), { signal });
            const favorite = requireElement<HTMLElement>(element, '.indicator-favorite-toggle');
            favorite.addEventListener('click', () => (
                void this.catalog.toggleFavorite(entry.id).catch(error => this.showError(error))
            ), { signal });
            return {
                id: entry.id,
                element,
                favorite,
                searchKey: `${entry.name} ${entry.fullName} ${this.translate(entry.fullName)}`
                    .toLocaleLowerCase(),
            };
        });
    }

    private listRowHtml(entry: IndicatorCatalogEntry): string {
        const favorite = this.catalog.isFavorite(entry.id);
        return `<div class="indicator-list-item" data-id="${attr(entry.id)}">
            <button type="button" class="indicator-favorite-toggle${
                favorite ? ' is-favorite' : ''
            }" aria-pressed="${favorite}" title="${attr(this.translate(
                favorite ? 'Remove from favorites' : 'Add to favorites',
            ))}">${favorite ? FAVORITE_ON : FAVORITE_OFF}</button>
            <button type="button" class="indicator-list-select">
                <span class="indicator-list-info">
                    <span class="indicator-list-name">${html(entry.name)}</span>
                    <span class="indicator-list-fullname">${html(
                        this.translate(entry.fullName),
                    )}</span>
                </span>
                <span class="indicator-list-group">${html(
                    this.translate(entry.categoryLabel),
                )}</span>
            </button>
        </div>`;
    }

    private syncFavorites(): void {
        for (const row of this.rows) {
            const favorite = this.catalog.isFavorite(row.id);
            row.favorite.classList.toggle('is-favorite', favorite);
            row.favorite.setAttribute('aria-pressed', String(favorite));
            row.favorite.title = this.translate(
                favorite ? 'Remove from favorites' : 'Add to favorites',
            );
            row.favorite.textContent = favorite ? FAVORITE_ON : FAVORITE_OFF;
        }
        this.applyFilter();
    }

    /**
     * Shows the rows the tab and the query select, and hides the rest.
     *
     * Two ways of matching text, because users type two different things. The catalog answers a
     * folded token-AND query over ids, names, categories and aliases, which is what finds an
     * indicator by its category or by a translated alias. A plain case-insensitive substring
     * over name, full name and translated full name is what finds one when the typed run of
     * characters spans a space that the token split would have thrown away. A row matching
     * either way stays on screen.
     */
    private applyFilter(): void {
        const query = this.searchInput.value.trim();
        const group = this.activeGroup();
        const favoritesOnly = group === FAVORITES_GROUP;
        const category = group === 'All' || favoritesOnly ? undefined : group;
        const eligible = idSet(this.catalog.search({ category, favoritesOnly }));
        const matched = query.length === 0
            ? null
            : idSet(this.catalog.search({ text: query, category, favoritesOnly }));
        const needle = query.toLocaleLowerCase();
        let visible = 0;
        for (const row of this.rows) {
            const show = eligible.has(row.id)
                && (matched === null || matched.has(row.id) || row.searchKey.includes(needle));
            row.element.style.display = show ? '' : 'none';
            if (show) visible++;
        }
        this.emptyEl.textContent = this.translate(
            favoritesOnly ? 'No favorite indicators' : 'No indicators found',
        );
        this.emptyEl.style.display = visible > 0 ? 'none' : '';
    }

    private activeGroup(): string {
        const active = this.tabsEl.querySelector('.indicator-category-tab.active') as HTMLElement | null;
        return active?.dataset.group || 'All';
    }

    private renderAddSettings(typeId: string): void {
        const settings = IndicatorSettings.getIndicator(typeId);
        if (!settings) {
            this.host.notify(this.translate('Unknown indicator: {0}', typeId), 'error');
            return;
        }
        this.editingId = null;
        this.editingSnapshot = null;
        const defaultPane = this.targetPaneId
            ?? (settings.pane === 'overlay' ? '__main__' : '__new__');
        const parameterRows = (settings.params as any[]).map(parameter => (
            catalogParameterRow(this.translate, parameter)
        )).join('');
        this.settingsEl.innerHTML = `
            <div class="indicator-settings-title">${html(this.translate(settings.name))}</div>
            <section class="indicator-editor-section">
                <div class="indicator-section-title">${html(this.translate('Inputs'))}</div>
                <div class="indicator-settings-params">${
                    parameterRows || emptyValue(this.translate, 'No inputs')
                }</div>
            </section>
            <section class="indicator-editor-section">
                <div class="indicator-section-title">${html(this.translate('Placement'))}</div>
                <div class="indicator-param-row">
                    <label class="indicator-param-label">${html(this.translate('Pane'))}</label>
                    <select class="indicator-editor-select indicator-target-select">
                        ${this.paneOptions(defaultPane, true)}
                    </select>
                </div>
            </section>
            <div class="indicator-editor-error" hidden></div>
            <div class="indicator-editor-actions">
                <button type="button" class="indicator-btn indicator-btn-primary indicator-add-btn">
                    ${html(this.translate('Add {0}', this.translate(settings.name)))}
                </button>
            </div>`;
        this.settingsEl.querySelector('.indicator-add-btn')?.addEventListener('click', () => (
            this.addIndicator(typeId)
        ));
    }

    private renderEditor(snapshot: IndicatorControllerSnapshot): void {
        this.editingId = snapshot.id;
        this.editingSnapshot = snapshot;
        const parameterRows = snapshot.parameterDefinitions.map((definition) => (
            parameterRow(this.translate, definition, snapshot.parameters[definition.id])
        )).join('');
        const sourceOptions = this.sourceOptions(snapshot);
        const selectedSource = sourceValue(snapshot.source);
        const outputRows = snapshot.outputs.map(output => outputRow(this.translate, output)).join('');
        const templateSourceNote = snapshot.source.kind === IndicatorSourceKind.IndicatorOutput
            ? `<div class="indicator-template-note">${html(this.translate(
                'The runtime indicator source is not stored in portable templates',
            ))}</div>` : '';
        const sourceWarning = snapshot.sourceStatus.available ? '' : `
            <div class="indicator-source-warning">
                ${html(sourceUnavailableText(this.translate, snapshot.sourceStatus.reason))}
            </div>`;

        this.settingsEl.innerHTML = `
            <div class="indicator-settings-title">
                <span>${html(this.translate('Edit {0}', this.translate(snapshot.name)))}</span>
                <span class="indicator-editor-id">${html(snapshot.id)}</span>
            </div>
            <section class="indicator-editor-section">
                <div class="indicator-section-title">${html(this.translate('Inputs'))}</div>
                <div class="indicator-settings-params">${
                    parameterRows || emptyValue(this.translate, 'No inputs')
                }</div>
            </section>
            <section class="indicator-editor-section">
                <div class="indicator-section-title">${html(
                    this.translate('Source and placement'),
                )}</div>
                <div class="indicator-param-row indicator-param-row-wide">
                    <label class="indicator-param-label">${html(this.translate('Source'))}</label>
                    <select class="indicator-editor-select indicator-source-select">
                        ${selectOptions(sourceOptions, selectedSource)}
                    </select>
                </div>
                ${sourceWarning}
                <div class="indicator-param-row">
                    <label class="indicator-param-label">${html(this.translate('Pane'))}</label>
                    <select class="indicator-editor-select indicator-target-select">
                        ${this.paneOptions(snapshot.paneId ?? '__main__', false)}
                    </select>
                </div>
                <div class="indicator-param-row">
                    <label class="indicator-param-label">${html(
                        this.translate('Price scale'),
                    )}</label>
                    <select class="indicator-editor-select indicator-scale-select">
                        ${this.scaleOptions(snapshot.paneId, snapshot.priceScaleId)}
                    </select>
                    <span class="indicator-effective-scale">
                        ${html(this.translate('Effective: {0}', snapshot.effectivePriceScaleId))}
                    </span>
                </div>
                <label class="indicator-toggle-row">
                    <input type="checkbox" class="indicator-visible-input"${
                        snapshot.visible ? ' checked' : ''
                    } />
                    <span>${html(this.translate('Show indicator'))}</span>
                </label>
            </section>
            <section class="indicator-editor-section indicator-output-section">
                <div class="indicator-section-title">${html(this.translate('Outputs'))}</div>
                <div class="indicator-output-header" aria-hidden="true">
                    <span>${html(this.translate('Output'))}</span>
                    <span>${html(this.translate('Color'))}</span>
                    <span>${html(this.translate('Width'))}</span>
                    <span>${html(this.translate('Style'))}</span>
                    <span>${html(this.translate('Precision'))}</span>
                </div>
                <div class="indicator-output-list">${outputRows}</div>
            </section>
            <section class="indicator-editor-section indicator-template-section">
                <div class="indicator-section-title">${html(this.translate('Templates'))}</div>
                <div class="indicator-template-existing">
                    <select class="indicator-editor-select indicator-template-select"
                        aria-label="${attr(this.translate('Indicator template'))}">
                        ${this.templateOptions(snapshot.type)}
                    </select>
                    <button type="button" class="indicator-btn indicator-template-apply-btn">
                        ${html(this.translate('Apply'))}
                    </button>
                    <button type="button" class="indicator-btn indicator-template-update-btn">
                        ${html(this.translate('Update'))}
                    </button>
                    <button type="button" class="indicator-btn indicator-template-remove-btn">
                        ${html(this.translate('Delete'))}
                    </button>
                </div>
                <div class="indicator-template-create">
                    <input type="text" class="indicator-template-name"
                        placeholder="${attr(this.translate('Template name'))}" />
                    <button type="button" class="indicator-btn indicator-template-create-btn">
                        ${html(this.translate('Save as template'))}
                    </button>
                </div>
                ${templateSourceNote}
            </section>
            <div class="indicator-editor-error" hidden></div>
            <div class="indicator-editor-actions">
                <button type="button" class="indicator-btn indicator-btn-primary indicator-save-btn">
                    ${html(this.translate('Save'))}
                </button>
            </div>`;

        const paneSelect = this.settingsEl.querySelector(
            '.indicator-target-select',
        ) as HTMLSelectElement | null;
        paneSelect?.addEventListener('change', () => {
            const scale = this.settingsEl.querySelector(
                '.indicator-scale-select',
            ) as HTMLSelectElement | null;
            if (scale) scale.innerHTML = this.scaleOptions(
                paneSelect.value === '__main__' ? null : paneSelect.value,
                null,
            );
        });
        this.settingsEl.querySelectorAll('.indicator-output-row').forEach((element) => {
            const row = element as HTMLElement;
            const picker = row.querySelector('.indicator-output-color-picker') as HTMLInputElement | null;
            const text = row.querySelector('.indicator-output-color') as HTMLInputElement | null;
            picker?.addEventListener('input', () => { if (text) text.value = picker.value; });
            text?.addEventListener('input', () => {
                if (picker && /^#[0-9a-f]{6}$/i.test(text.value.trim()))
                    picker.value = text.value.trim();
            });
        });
        this.settingsEl.querySelector('.indicator-save-btn')?.addEventListener('click', () => (
            this.saveIndicator(snapshot.id)
        ));
        this.bindTemplateEditor(snapshot);
    }

    private addIndicator(typeId: string): void {
        try {
            const parameters = readParameters(this.settingsEl);
            const pane = this.settingsEl.querySelector(
                '.indicator-target-select',
            ) as HTMLSelectElement;
            const entry = this.engine.add(typeId, parameters, pane.value);
            if (entry === null) throw new Error(this.translate('Indicator could not be added'));
            const snapshot = this.controller.get(entry.persistenceId);
            this.renderActiveList();
            if (snapshot !== undefined) this.renderEditor(snapshot);
            this.host.notify(
                this.translate(
                    '{0} added',
                    this.translate(IndicatorSettings.getIndicator(typeId)?.name || typeId),
                ),
                'success',
            );
        } catch (error) {
            this.showError(error);
        }
    }

    private saveIndicator(id: string): void {
        try {
            const updated = this.updateIndicatorFromEditor(id);
            this.renderActiveList();
            // Re-open the editor on the saved snapshot: an update replaces the runtime entry, so
            // the panel would otherwise sit on one that no longer exists.
            this.renderEditor(updated);
            this.host.notify(this.translate('Indicator updated'), 'success');
        } catch (error) {
            this.showError(error);
        }
    }

    private updateIndicatorFromEditor(id: string): IndicatorControllerSnapshot {
        const sourceSelect = this.settingsEl.querySelector(
            '.indicator-source-select',
        ) as HTMLSelectElement;
        const paneSelect = this.settingsEl.querySelector(
            '.indicator-target-select',
        ) as HTMLSelectElement;
        const scaleSelect = this.settingsEl.querySelector(
            '.indicator-scale-select',
        ) as HTMLSelectElement;
        const visible = this.settingsEl.querySelector(
            '.indicator-visible-input',
        ) as HTMLInputElement;
        const previousOutputs = new Map(
            (this.editingSnapshot?.outputs || []).map(output => [output.id, output.style]),
        );
        const outputs: Record<string, IndicatorOutputStylePatch> = {};
        this.settingsEl.querySelectorAll('.indicator-output-row').forEach((element) => {
            const row = element as HTMLElement;
            const outputId = row.dataset.outputId;
            if (!outputId) return;
            const color = (row.querySelector('.indicator-output-color') as HTMLInputElement)
                .value.trim();
            const width = (row.querySelector('.indicator-output-width') as HTMLInputElement)
                .value.trim();
            const style = (row.querySelector('.indicator-output-line-style') as HTMLSelectElement)
                .value;
            const precisionValue = (row.querySelector(
                '.indicator-output-precision',
            ) as HTMLSelectElement).value;
            const visibleValue = (row.querySelector(
                '.indicator-output-visible',
            ) as HTMLInputElement).checked;
            const previous = previousOutputs.get(outputId);
            const next: Record<string, unknown> = {};
            const colorValue = color.length === 0 ? undefined : color;
            const widthValue = width.length === 0 ? undefined : Number(width);
            const styleValue = style.length === 0 ? undefined : Number(style);
            const precision = precisionValue.length === 0
                ? undefined : Number(precisionValue);
            if (colorValue === undefined && previous?.color !== undefined)
                throw new TypeError(this.translate('Output color cannot be empty'));
            if (colorValue !== previous?.color && colorValue !== undefined)
                next.color = colorValue;
            if (widthValue !== previous?.lineWidth)
                next.lineWidth = widthValue === undefined ? null : widthValue;
            if (styleValue !== previous?.lineStyle)
                next.lineStyle = styleValue === undefined ? null : styleValue;
            if (visibleValue !== previous?.visible) next.visible = visibleValue;
            if (precision !== previous?.precision)
                next.precision = precision === undefined ? null : precision;
            if (Object.keys(next).length > 0)
                outputs[outputId] = next as IndicatorOutputStylePatch;
        });
        const patch: IndicatorUpdatePatch = {
            parameters: readParameters(this.settingsEl),
            source: parseSourceValue(sourceSelect.value),
            paneId: paneSelect.value === '__main__' ? null : paneSelect.value,
            priceScaleId: scaleSelect.value.length === 0 ? null : scaleSelect.value,
            visible: visible.checked,
            outputs,
        };
        const updated = this.controller.update(id, patch);
        this.editingSnapshot = updated;
        return updated;
    }

    private bindTemplateEditor(snapshot: IndicatorControllerSnapshot): void {
        const select = this.settingsEl.querySelector(
            '.indicator-template-select',
        ) as HTMLSelectElement | null;
        const syncButtons = (): void => {
            const disabled = !select?.value;
            this.settingsEl.querySelectorAll(
                '.indicator-template-apply-btn, .indicator-template-update-btn, '
                + '.indicator-template-remove-btn',
            ).forEach(button => { (button as HTMLButtonElement).disabled = disabled; });
        };
        select?.addEventListener('change', syncButtons);
        syncButtons();

        this.settingsEl.querySelector('.indicator-template-create-btn')
            ?.addEventListener('click', () => {
                try {
                    const name = (this.settingsEl.querySelector(
                        '.indicator-template-name',
                    ) as HTMLInputElement).value;
                    const updated = this.updateIndicatorFromEditor(snapshot.id);
                    const creating = this.templates.create(name, updated.id);
                    this.renderEditor(updated);
                    void creating.then((template) => {
                        this.refreshTemplateSelect(updated.type, template.id);
                        this.host.notify(this.translate('Indicator template saved'), 'success');
                    }).catch(error => this.showError(error));
                } catch (error) { this.showError(error); }
            });
        this.settingsEl.querySelector('.indicator-template-apply-btn')
            ?.addEventListener('click', () => {
                try {
                    if (!select?.value) return;
                    const templateId = select.value;
                    const updated = this.templates.apply(templateId, snapshot.id);
                    this.renderEditor(updated);
                    this.refreshTemplateSelect(updated.type, templateId);
                    this.host.notify(this.translate('Indicator template applied'), 'success');
                } catch (error) { this.showError(error); }
            });
        this.settingsEl.querySelector('.indicator-template-update-btn')
            ?.addEventListener('click', () => {
                try {
                    if (!select?.value) return;
                    const templateId = select.value;
                    const updated = this.updateIndicatorFromEditor(snapshot.id);
                    const replacing = this.templates.replace(templateId, updated.id);
                    this.renderEditor(updated);
                    void replacing.then(() => {
                        this.refreshTemplateSelect(updated.type, templateId);
                        this.host.notify(this.translate('Indicator template updated'), 'success');
                    }).catch(error => this.showError(error));
                } catch (error) { this.showError(error); }
            });
        this.settingsEl.querySelector('.indicator-template-remove-btn')
            ?.addEventListener('click', () => {
                if (!select?.value) return;
                void this.templates.remove(select.value).then(() => {
                    this.refreshTemplateSelect(snapshot.type);
                    this.host.notify(this.translate('Indicator template deleted'), 'success');
                }).catch(error => this.showError(error));
            });
    }

    private renderActiveList(): void {
        const indicators = this.controller.indicators();
        if (indicators.length === 0) {
            this.activeListEl.innerHTML = `<div class="no-indicators">${html(
                this.translate('No active indicators'),
            )}</div>`;
            return;
        }
        this.activeListEl.innerHTML = indicators.map(indicator => `
            <div class="active-indicator-item" data-id="${attr(indicator.id)}">
                <button type="button" class="active-indicator-visible${
                    indicator.visible ? ' is-visible' : ''
                }" title="${attr(this.translate(indicator.visible ? 'Hide' : 'Show'))}">
                    ${indicator.visible ? '&#9679;' : '&#9675;'}
                </button>
                <button type="button" class="active-indicator-name active-indicator-edit">
                    <span>${html(this.translate(indicator.name))} (${html(
                        Object.values(indicator.parameters).join(', '),
                    )})</span>
                    <small>${html(indicator.paneId ?? this.translate('Main chart'))}</small>
                </button>
                <button type="button" class="indicator-btn active-indicator-remove"
                    title="${attr(this.translate('Remove'))}">&times;</button>
            </div>`).join('');
        this.activeListEl.querySelectorAll('.active-indicator-item').forEach((element) => {
            const row = element as HTMLElement;
            const id = row.dataset.id;
            if (!id) return;
            row.querySelector('.active-indicator-edit')?.addEventListener('click', () => {
                const snapshot = this.controller.get(id);
                if (snapshot !== undefined) this.renderEditor(snapshot);
            });
            row.querySelector('.active-indicator-visible')?.addEventListener('click', () => {
                const snapshot = this.controller.get(id);
                if (snapshot === undefined) return;
                try { this.controller.setVisible(id, !snapshot.visible); }
                catch (error) { this.showError(error); }
            });
            row.querySelector('.active-indicator-remove')?.addEventListener('click', () => {
                const entry = this.engine.getIndicators().find(
                    candidate => candidate.persistenceId === id,
                );
                if (entry === undefined) return;
                this.engine.remove(entry.id);
                if (this.editingId === id) {
                    this.editingId = null;
                    this.editingSnapshot = null;
                    this.settingsEl.innerHTML = emptyValue(this.translate, 'Indicator removed');
                }
                this.renderActiveList();
            });
        });
    }

    private resolveSnapshot(id: string | number): IndicatorControllerSnapshot | undefined {
        if (typeof id === 'string') {
            const byStable = this.controller.get(id);
            if (byStable !== undefined) return byStable;
        }
        const entry = this.engine.getIndicators().find(
            candidate => candidate.id === id || candidate.persistenceId === id,
        );
        return entry === undefined ? undefined : this.controller.get(entry.persistenceId);
    }

    private templateOptions(indicatorType: string, selected = ''): string {
        const values: Array<readonly [string, string]> = [
            ['', this.translate('Select template')],
            ...this.templates.templates(indicatorType).map(template => (
                [template.id, template.name] as const
            )),
        ];
        return selectOptions(values, selected);
    }

    private refreshTemplateSelect(indicatorType: string, selected?: string): void {
        const select = this.settingsEl.querySelector(
            '.indicator-template-select',
        ) as HTMLSelectElement | null;
        if (!select) return;
        const next = selected ?? select.value;
        select.innerHTML = this.templateOptions(indicatorType, next);
        if (![...select.options].some(option => option.value === next)) select.value = '';
        select.dispatchEvent(new Event('change'));
    }

    private paneOptions(selected: string, includeNew: boolean): string {
        const values: Array<readonly [string, string]> = [];
        if (includeNew) values.push(['__new__', this.translate('New pane')]);
        values.push(['__main__', this.translate('Main chart')]);
        for (const pane of this.chart.panes()) {
            const id = pane.id();
            if (typeof id === 'string' && id !== 'main') values.push([id, id]);
        }
        if (!values.some(([value]) => value === selected)) values.push([selected, selected]);
        return selectOptions(values, selected);
    }

    private scaleOptions(paneId: string | null, selected: string | null): string {
        const ids = new Set(['right', 'left']);
        const targetId = paneId ?? 'main';
        const pane = this.chart.panes().find(candidate => candidate.id() === targetId);
        for (const id of pane?.priceScaleIds() ?? []) ids.add(id);
        if (selected) ids.add(selected);
        const values: Array<readonly [string, string]> = [
            ['', this.translate('Auto')],
            ...[...ids].map(id => [id, id] as const),
        ];
        return selectOptions(values, selected ?? '');
    }

    private sourceOptions(
        current: IndicatorControllerSnapshot,
    ): Array<readonly [string, string]> {
        const options: Array<readonly [string, string]> = [
            ['candles', this.translate('OHLC candles')],
            ...CANDLE_FIELDS.map(([field, label]) => (
                [`field:${field}`, this.translate(label)] as const
            )),
        ];
        for (const indicator of this.controller.indicators()) {
            if (indicator.id === current.id) continue;
            for (const output of indicator.outputs) {
                options.push([
                    `indicator:${encodeURIComponent(indicator.id)}:${encodeURIComponent(output.id)}`,
                    `${this.translate(indicator.name)} → ${output.name}`,
                ]);
            }
        }
        const selected = sourceValue(current.source);
        if (!options.some(([value]) => value === selected))
            options.push([selected, this.translate('Unavailable source')]);
        return options;
    }

    private showError(error: unknown): void {
        const target = this.settingsEl.querySelector(
            '.indicator-editor-error',
        ) as HTMLElement | null;
        const message = error instanceof Error ? error.message : String(error);
        if (target !== null) {
            target.textContent = message;
            target.hidden = false;
        } else {
            this.host.notify(message, 'error');
        }
    }
}

/**
 * Builds the catalog model over the built-in indicator settings, leaving preference persistence
 * to the host.
 *
 * `storage` is null on a page that keeps favorites for the session only; the alternative is a
 * host-owned store, and which of the two it is has to be said at the call site.
 */
export function createIndicatorCatalogController(
    translate: Translate,
    storage: IndicatorFavoritesStorage | null,
): IndicatorCatalogController {
    return new IndicatorCatalogController({
        entries: IndicatorSettings.getAllIndicators().map(indicator => ({
            id: indicator.id,
            name: indicator.name,
            fullName: indicator.fullName,
            category: indicator.category || indicator.group,
            categoryLabel: indicator.group,
            aliases: [
                ...(indicator.aliases || []),
                indicator.serverKind,
                translate(indicator.name),
                translate(indicator.fullName),
                translate(indicator.group),
            ].filter((value): value is string => typeof value === 'string' && value.length > 0),
        })),
        storage: storage ?? undefined,
    });
}

function parameterRow(
    translate: Translate,
    definition: any,
    value: IndicatorParameterValue | undefined,
): string {
    const id = attr(definition.id);
    const label = html(translate(definition.name || humanize(definition.id)));
    if (definition.type === 'boolean') {
        return `<label class="indicator-toggle-row">
            <input type="checkbox" data-parameter-id="${id}" data-parameter-type="boolean"${
                value === true ? ' checked' : ''
            } /><span>${label}</span></label>`;
    }
    if (definition.type === 'string' && definition.options?.length) {
        return `<div class="indicator-param-row"><label class="indicator-param-label">${label}</label>
            <select class="indicator-editor-select" data-parameter-id="${id}"
                data-parameter-type="string">${selectOptions(
                    definition.options.map((option: string) => [option, option]),
                    String(value ?? definition.defaultValue),
                )}</select></div>`;
    }
    const type = definition.type === 'string' ? 'text' : 'number';
    return `<div class="indicator-param-row"><label class="indicator-param-label">${label}</label>
        <input type="${type}" class="indicator-param-input" data-parameter-id="${id}"
            data-parameter-type="${attr(definition.type)}" value="${attr(
                String(value ?? definition.defaultValue),
            )}"${numberAttribute('min', definition.min)}${numberAttribute('max', definition.max)}${
                numberAttribute('step', definition.step)
            } /></div>`;
}

/** The picker's add form reads the catalog's own parameter descriptors, which are shaped differently. */
function catalogParameterRow(translate: Translate, parameter: any): string {
    return parameterRow(translate, {
        id: parameter.key,
        name: parameter.label || humanize(parameter.key),
        type: parameter.type === 'bool' ? 'boolean'
            : parameter.type === 'string' ? 'string'
                : Number.isInteger(parameter.default) ? 'integer' : 'number',
        defaultValue: parameter.default,
        min: parameter.min,
        max: parameter.max,
        step: parameter.step,
        options: parameter.options,
    }, parameter.default);
}

function outputRow(
    translate: Translate,
    output: IndicatorControllerSnapshot['outputs'][number],
): string {
    const style = output.style;
    const color = style.color ?? '';
    const picker = /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff';
    return `<div class="indicator-output-row" data-output-id="${attr(output.id)}">
        <label class="indicator-output-name">
            <input type="checkbox" class="indicator-output-visible"${style.visible ? ' checked' : ''} />
            <span>${html(output.name)}</span>
        </label>
        <div class="indicator-color-editor">
            <input type="color" class="indicator-output-color-picker" value="${attr(picker)}" />
            <input type="text" class="indicator-output-color" value="${attr(color)}"
                aria-label="${attr(translate('Color'))}" />
        </div>
        <input type="number" class="indicator-output-width" min="0.1" step="0.5"
            value="${style.lineWidth === undefined ? '' : attr(String(style.lineWidth))}"
            placeholder="${attr(translate('Auto'))}" aria-label="${attr(translate('Width'))}" />
        <select class="indicator-output-line-style" aria-label="${attr(translate('Style'))}">
            ${selectOptions([
                ['', translate('Auto')],
                ...LINE_STYLES.map(([value, label]) => [String(value), translate(label)] as const),
            ], style.lineStyle === undefined ? '' : String(style.lineStyle))}
        </select>
        <select class="indicator-output-precision" aria-label="${attr(translate('Precision'))}">
            ${selectOptions([
                ['', translate('Auto')],
                ...Array.from({ length: 13 }, (_, precision) => (
                    [String(precision), String(precision)] as const
                )),
            ], style.precision === undefined ? '' : String(style.precision))}
        </select>
    </div>`;
}

function readParameters(root: HTMLElement): Readonly<Record<string, IndicatorParameterValue>> {
    const result: Record<string, IndicatorParameterValue> = {};
    root.querySelectorAll('[data-parameter-id]').forEach((element) => {
        const input = element as HTMLInputElement | HTMLSelectElement;
        const id = input.dataset.parameterId;
        if (!id) return;
        const type = input.dataset.parameterType;
        if (type === 'boolean') result[id] = (input as HTMLInputElement).checked;
        else if (type === 'string') result[id] = input.value;
        else result[id] = Number(input.value);
    });
    return result;
}

function sourceValue(source: IndicatorSource): string {
    if (source.kind === IndicatorSourceKind.Candles) return 'candles';
    if (source.kind === IndicatorSourceKind.CandleField) return `field:${source.field}`;
    return `indicator:${encodeURIComponent(source.indicatorId)}:${encodeURIComponent(source.outputId)}`;
}

function parseSourceValue(value: string): IndicatorSource {
    if (value === 'candles') return { kind: IndicatorSourceKind.Candles };
    if (value.startsWith('field:')) return {
        kind: IndicatorSourceKind.CandleField,
        field: value.slice('field:'.length) as typeof IndicatorCandleField[keyof typeof IndicatorCandleField],
    };
    if (value.startsWith('indicator:')) {
        const [indicatorId, outputId, ...extra] = value.slice('indicator:'.length).split(':');
        if (!indicatorId || !outputId || extra.length > 0)
            throw new TypeError('sschart: invalid indicator source selection');
        return {
            kind: IndicatorSourceKind.IndicatorOutput,
            indicatorId: decodeURIComponent(indicatorId),
            outputId: decodeURIComponent(outputId),
        };
    }
    throw new TypeError('sschart: invalid indicator source selection');
}

function selectOptions(
    values: readonly (readonly [string, string])[],
    selected: string,
): string {
    return values.map(([value, label]) => (
        `<option value="${attr(value)}"${value === selected ? ' selected' : ''}>${html(label)}</option>`
    )).join('');
}

function numberAttribute(name: string, value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value)
        ? ` ${name}="${attr(String(value))}"` : '';
}

function emptyValue(translate: Translate, text: string): string {
    return `<div class="indicator-editor-empty">${html(translate(text))}</div>`;
}

function idSet(entries: readonly IndicatorCatalogEntry[]): ReadonlySet<string> {
    return new Set(entries.map(entry => entry.id));
}

/**
 * Refuses a dependency that cannot answer what the dialog will ask of it.
 *
 * Duck-typed rather than `instanceof`, so a page that wires the dialog from plain JavaScript -
 * and a test that stands a dependency in - fails on the missing method by name instead of on a
 * class identity it was never going to satisfy.
 */
function requireMethods<T>(value: T, name: string, methods: readonly string[]): T {
    const target = value as unknown as Record<string, unknown> | null;
    if (target === null || typeof target !== 'object'
        || methods.some(method => typeof target[method] !== 'function')) {
        throw new TypeError(`sschart: indicator dialog ${name} is invalid`);
    }
    return value;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector(selector);
    if (element === null)
        throw new TypeError(`sschart: indicator dialog markup is missing '${selector}'`);
    return element as T;
}

/** WebKit still exposes the prefixed property only, and that is where iOS reports fullscreen. */
function fullscreenElement(): Element | null {
    const prefixed = (document as { webkitFullscreenElement?: Element | null })
        .webkitFullscreenElement;
    return document.fullscreenElement ?? prefixed ?? null;
}

function html(value: unknown): string {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]!));
}

function attr(value: unknown): string { return html(value); }
