// Chart Legend — OHLCV overlay + indicator values on crosshair move
//
// Everything outside the legend arrives through the constructor: the element it paints into, the
// host that words strings and numbers, whatever owns the sub-pane headers, the chart types the
// page's switcher implements, and the layer a floating menu opens in. Nothing is read off
// `window`, so a page can mount one legend per chart tile and the two neither share an element nor
// tear down each other's menu.
import type { ChartUiHost } from './chart-host.js';

/**
 * A bar as the legend reads it. Every price field is optional on purpose: the crosshair
 * payload carries one entry per series, and a line/histogram/whitespace point has no OHLC —
 * which is exactly why `_onCrosshairMove` finite-checks a candidate before accepting it.
 */
export interface LegendBar {
    time: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
}

/** The per-series bar snapshot the host attaches to a crosshair event, keyed by series handle. */
export type LegendSeriesData = ReadonlyMap<unknown, LegendBar>;

/** The crosshair payload, reduced to the three fields this legend reads. */
export interface LegendCrosshairParam {
    time?: number | null;
    point?: { x: number; y: number } | null;
    seriesData?: LegendSeriesData;
}

/**
 * The host chart, described structurally rather than imported: this legend is the same code
 * the web terminal runs, where the chart handle comes from the terminal's own charting stack,
 * while the demo mounts it on this package's engine. Both expose these two members.
 */
export interface LegendChart {
    subscribeCrosshairMove(handler: (param: LegendCrosshairParam) => void): void;
    /** Optional so an existing host that does not offer it still satisfies the contract. */
    unsubscribeCrosshairMove?(handler: (param: LegendCrosshairParam) => void): void;
    clearCrosshairPosition?(): void;
}

/** One indicator row as the indicator engine hands it to the legend. */
export interface LegendIndicatorValue {
    id: number;
    type: string;
    name: string;
    /** Output name -> value on the hovered bar; null where the study is sparse there. */
    values: Record<string, number | null | undefined>;
    /** Line colours, positionally aligned with `Object.keys(values)`. */
    colors: readonly string[];
    /** null = overlay on the main chart; anything else names the sub-pane it lives in. */
    paneId: string | null;
}

/** The slice of the indicator engine the legend talks to — same structural reasoning as LegendChart. */
export interface LegendIndicatorEngine {
    onChange: (() => void) | null;
    getIndicators(): readonly unknown[];
    getValuesAt(time: number | null | undefined, seriesData?: LegendSeriesData): readonly LegendIndicatorValue[];
    remove(id: number): void;
}

/**
 * Whatever owns the sub-panes an oscillator is drawn in.
 *
 * One member, because one is all the legend wants: somewhere to put a pane's values. It hands
 * back the element rather than taking a string of HTML, so the rows stay this legend's own nodes
 * carrying this legend's own handlers.
 */
export interface LegendPaneHost {
    /** The element a pane's indicator values belong in, or null once the pane is gone. */
    getValuesElement(paneId: string): HTMLElement | null;
}

/**
 * One entry of the chart-type menu behind the legend's toggle.
 *
 * The page supplies the list because the page owns the switcher: an entry for a rendering the
 * switcher does not implement is a menu item that does nothing when picked.
 */
export interface LegendChartType {
    /** Handed back through `onChartTypeChange`, and what `setChartType` matches on. */
    value: string;
    /** English source text; the legend words it through the host's translator. */
    label: string;
    /** The class list for the entry's icon element, e.g. `bi bi-bar-chart-fill`. */
    icon: string;
}

/**
 * Where the floating chart-type menu is appended. Called on every open, so a page that entered or
 * left fullscreen between two opens gets the menu in the layer that is on screen now.
 */
export type LegendMenuLayer = () => HTMLElement;

/**
 * The layer most pages want: the fullscreen element while one is up, the document body otherwise.
 * Nothing outside the fullscreen element is painted, so a menu in the body would simply not appear.
 */
export const fullscreenMenuLayer: LegendMenuLayer = () => {
    const withWebkit = document as Document & { webkitFullscreenElement?: Element | null };
    const full = document.fullscreenElement ?? withWebkit.webkitFullscreenElement ?? null;
    return full instanceof HTMLElement ? full : document.body;
};

/** What the legend needs from the page it is mounted in. */
export interface ChartLegendOptions {
    /** The element the legend paints its strip and indicator rows into. */
    container: HTMLElement;
    /** Words and numbers: every user-visible string and every formatted value goes through it. */
    host: ChartUiHost;
    /** Where sub-pane indicator values are painted. */
    paneHost: LegendPaneHost;
    /** The renderings the page's chart-type switcher implements, in menu order. */
    chartTypes: readonly LegendChartType[];
    /** The layer the floating chart-type menu opens in; `fullscreenMenuLayer` suits most pages. */
    menuLayer: LegendMenuLayer;
}

export class ChartLegend {
    readonly _container: HTMLElement;
    readonly _host: ChartUiHost;
    readonly _paneHost: LegendPaneHost;
    readonly _chartTypes: readonly LegendChartType[];
    readonly _menuLayer: LegendMenuLayer;
    _chart: LegendChart | null = null;
    _rawCandles: readonly LegendBar[] = [];
    // Whether the candle set carries volume at all, decided once per set rather than per hovered
    // bar: the terminal's feed leaves volume off some bars, and reading it off the bar under the
    // cursor made the V column appear and vanish as the mouse moved.
    _hasVolume: boolean = false;
    _indicatorEngine: LegendIndicatorEngine | null = null;
    _isHovered: boolean = false;
    _isDisposed: boolean = false;
    // Kept so dispose() can detach exactly what init() attached.
    _onMouseEnter: (() => void) | null = null;
    _onMouseLeave: (() => void) | null = null;
    _onClick: ((event: MouseEvent) => void) | null = null;
    _onCrosshair: ((param: LegendCrosshairParam) => void) | null = null;
    _onPaneClick: (event: MouseEvent) => void;
    _engineHook: { previous: (() => void) | null; wrapper: () => void } | null = null;
    _lastIndSignature: string | null = null;
    _stripHasVolume: boolean | null = null;
    _lastSubPaneIds: Set<string> = new Set();
    // Pane values elements this legend has bound a click handler on, so dispose() releases them
    // and a rebuilt pane does not collect a second handler.
    _boundPaneValues: Map<string, HTMLElement> = new Map();
    // This instance's open chart-type menu, and the outside-click listener that closes it. Held
    // per instance: a second legend on the page owns its own, and neither removes the other's.
    _chartTypeMenu: HTMLElement | null = null;
    _chartTypeOutsideClick: ((event: MouseEvent) => void) | null = null;
    onEditIndicator: ((id: number, type: string) => void) | null = null;
    onChartTypeChange: ((type: string) => void) | null = null;
    _currentChartType: string;

    constructor(options: ChartLegendOptions) {
        this._container = options.container;
        this._host = options.host;
        this._paneHost = options.paneHost;
        this._chartTypes = options.chartTypes;
        this._menuLayer = options.menuLayer;
        // Until the page says otherwise the chart shows what the page listed first.
        this._currentChartType = this._chartTypes.length > 0 ? this._chartTypes[0].value : '';
        this._onPaneClick = (event: MouseEvent) => {
            // The row was built here, so the click is answered here and goes no further: a host
            // listening on the pane header would otherwise act on the same click a second time.
            if (this._handleIndicatorClick(event.target as Element | null)) event.stopPropagation();
        };
    }

    /** Attaches the legend to a chart: crosshair subscription plus the container's own listeners. */
    init(chart: LegendChart) {
        this._chart = chart;

        // Freeze the indicator strip while the cursor is over a clickable
        // row — `_isHovered` gates _renderIndicators so live ticks AND
        // crosshair-move both stop changing the numbers, the row sits
        // perfectly still, and the user can aim at × / ✎ without the
        // target moving. CSS already sets pointer-events:auto on
        // .legend-indicator so the chart's crosshair-move doesn't fire
        // while hovering; this hover flag covers the indicator-engine
        // RAF-driven repaint path as well.
        this._isHovered = false;
        // Named handlers, kept for dispose(). A host that rebuilds the chart on every symbol or
        // timeframe change has to be able to detach the legend; anonymous listeners and an
        // unremovable crosshair subscription made that impossible.
        this._onMouseEnter = () => {
            this._isHovered = true;
            // Drop the on-chart vertical crosshair line immediately — the engine
            // leaves the last position drawn unless we tell it to clear,
            // which would otherwise still ghost the bar behind the legend.
            try { this._chart?.clearCrosshairPosition?.(); } catch {}
        };
        this._onMouseLeave = () => { this._isHovered = false; };
        this._onCrosshair = (param: LegendCrosshairParam) => { this._onCrosshairMove(param); };
        this._container.addEventListener('mouseenter', this._onMouseEnter);
        this._container.addEventListener('mouseleave', this._onMouseLeave);
        this._chart.subscribeCrosshairMove(this._onCrosshair);

        // Delegate click on edit / remove / chart-type buttons (legend re-renders on crosshair move).
        this._onClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (this._handleIndicatorClick(target)) return;
            const toggle = target === null
                ? null
                : target.closest('.legend-ct-toggle') as HTMLElement | null;
            if (toggle === null) return;
            event.stopPropagation();
            this._openChartTypeMenu(toggle);
        };
        this._container.addEventListener('click', this._onClick);
    }

    /**
     * Detaches the legend: DOM listeners, the crosshair subscription and the engine hook it wrapped.
     * A terminal that rebuilds its chart on every symbol or timeframe change could not release the
     * legend at all before, so each rebuild left another set of listeners and another wrapper
     * around engine.onChange.
     */
    dispose() {
        if (this._onMouseEnter) this._container.removeEventListener('mouseenter', this._onMouseEnter);
        if (this._onMouseLeave) this._container.removeEventListener('mouseleave', this._onMouseLeave);
        if (this._onClick) this._container.removeEventListener('click', this._onClick);
        if (this._chart && this._onCrosshair) this._chart.unsubscribeCrosshairMove?.(this._onCrosshair);
        if (this._indicatorEngine && this._engineHook) {
            // Only give the hook back if nobody wrapped it after us; otherwise dropping ours would
            // silently unhook theirs too.
            if (this._indicatorEngine.onChange === this._engineHook.wrapper) {
                this._indicatorEngine.onChange = this._engineHook.previous;
            }
        }
        this._closeChartTypeMenu();
        for (const paneId of [...this._boundPaneValues.keys()]) this._detachPaneValues(paneId);
        this._onMouseEnter = null;
        this._onMouseLeave = null;
        this._onClick = null;
        this._onCrosshair = null;
        this._engineHook = null;
        this._indicatorEngine = null;
        this._chart = null;
        this._isDisposed = true;
    }

    /** Selects the rendering the toggle button reports; the page's switcher does the drawing. */
    setChartType(type: string) {
        this._currentChartType = type;
        // Repaint legend so the toggle button reflects the new type.
        if (this._rawCandles.length > 0) {
            this._renderOHLCV(this._rawCandles[this._rawCandles.length - 1]);
        }
    }

    /** Hands the legend the bars behind the chart — the source it reads a hovered candle from. */
    setRawCandles(candles: readonly LegendBar[] | null | undefined) {
        this._rawCandles = candles || [];
        this._hasVolume = this._rawCandles.some(candle => Number.isFinite(candle.volume));
        // Paint as soon as the first bars land, hover or no hover: at rest the strip reads the
        // newest bar, which is what a chart legend shows when nobody is pointing at anything. It
        // also puts the edit and remove buttons beside indicators that were already active.
        this.refresh();
    }

    /** Points the legend at the indicator engine whose values it prints. */
    setIndicatorEngine(engine: LegendIndicatorEngine | null) {
        this._indicatorEngine = engine;
        // Re-render the indicator strip whenever the set of active indicators
        // changes — add() / remove() / replaceParams() all fire onChange. Prior
        // to this, the legend stayed empty until the user happened to hover
        // the chart, which meant freshly-added indicators had no × button to
        // click (and on mobile there's no hover at all).
        if (engine) {
            const prev = engine.onChange;
            const wrapper = () => {
                if (prev) prev();
                this.refresh();
            };
            engine.onChange = wrapper;
            this._engineHook = { previous: prev, wrapper };
        } else {
            this._engineHook = null;
        }
    }

    // Paint the legend using the latest bar — safe to call any time indicators
    // change. Mirrors the "no-hover" branch of _onCrosshairMove.
    refresh() {
        if (this._isDisposed) return;
        if (this._rawCandles.length > 0) {
            const last = this._rawCandles[this._rawCandles.length - 1];
            this._renderOHLCV(last);
            this._renderIndicators(last.time);
        } else {
            // No candles yet — still put the .legend-indicators span in place
            // so _renderIndicators has something to fill when indicators arrive.
            if (!this._container.querySelector('.legend-indicators')) {
                this._container.innerHTML = '<span class="legend-ohlcv"></span><span class="legend-indicators"></span>';
                // Both caches describe nodes that were just thrown away; left standing, they let
                // the next paint decide nothing needs rebuilding and the legend stays blank.
                this._stripHasVolume = null;
                this._lastIndSignature = null;
            }
            this._renderIndicators(0);
        }
    }

    _onCrosshairMove(param: LegendCrosshairParam) {
        if (this._isDisposed) return;

        if (param.time == null || param.point == null) {
            // Show last candle
            if (this._rawCandles.length > 0) {
                const last = this._rawCandles[this._rawCandles.length - 1];
                this._renderOHLCV(last);
                this._renderIndicators(last.time);
            }
            return;
        }

        // The candle array is the strip's source: it is the bar the feed produced, volume and all,
        // while the crosshair snapshot carries what a series drew — a Heikin-Ashi body, a line
        // point, and never the volume that lives in a separate histogram series.
        const time = param.time;
        let candle: LegendBar | null = this._rawCandles.find(c => c.time === time) ?? null;
        if (candle === null && param.seriesData !== undefined) {
            // Nothing in the array: a page that feeds the chart but not the legend still gets an
            // OHLC strip out of the snapshot, provided one of its series drew a real bar there.
            for (const point of param.seriesData.values()) {
                if (point && Number.isFinite(point.open) && Number.isFinite(point.high)
                    && Number.isFinite(point.low) && Number.isFinite(point.close)) {
                    candle = point;
                    break;
                }
            }
        }
        if (candle) {
            this._renderOHLCV(candle);
        }
        this._renderIndicators(time, param.seriesData);
    }

    _renderOHLCV(candle: LegendBar) {
        if (this._isDisposed) return;

        // The assertions only stand in for LegendBar's optional prices: a bar missing either
        // side compares `undefined >= …` → false at runtime, i.e. the "down" colouring below.
        const isUp = candle.close! >= candle.open!;
        const cls = isUp ? 'legend-up' : 'legend-down';
        const formatters = this._host.formatters;
        const fmt = (value: number | null | undefined) =>
            value === undefined || value === null ? '--' : formatters.price(value);

        // The strip is built once and written into afterwards. A live feed refreshes the legend
        // several times a second, and rewriting the row's HTML each time destroys the chart-type
        // toggle -- the mousedown lands on one node and the mouseup on its replacement, so the
        // click never happens. That is the same failure the indicator rows below are careful
        // about, and the hover freeze does not help here: it only gates _renderIndicators.
        let strip = this._container.querySelector('.legend-ohlcv') as HTMLElement | null;
        if (strip === null || this._stripHasVolume !== this._hasVolume) {
            let html = '<span class="legend-item legend-time" data-ohlc="time"></span>';
            for (const key of ['o', 'h', 'l', 'c']) {
                html += `<span class="legend-item">${key.toUpperCase()} `
                    + `<span data-ohlc="${key}"></span></span>`;
            }
            if (this._hasVolume)
                html += '<span class="legend-item">V <span class="legend-vol" data-ohlc="v"></span></span>';
            // Per-pane chart-type selector: only the toggle button lives in the legend, the menu
            // itself is built in the menu layer on click, or a refresh would throw away a menu the
            // user has open.
            //
            // Drawn only when the page offers something to switch to. A page with one rendering
            // would otherwise get a dropdown that opens empty.
            if (this._chartTypes.length > 0) {
                html += '<span class="legend-item legend-ct"><button class="legend-ct-toggle"'
                    + ' type="button"><i data-ct-icon></i>'
                    + '<i class="bi bi-caret-down-fill" style="font-size:8px;margin-left:3px;"></i>'
                    + '</button></span>';
            }
            if (this._container.querySelector('.legend-indicators') !== null && strip !== null) {
                strip.innerHTML = html;
            } else {
                this._container.innerHTML = `<span class="legend-ohlcv">${html}</span>`
                    + '<span class="legend-indicators"></span>';
                strip = this._container.querySelector('.legend-ohlcv') as HTMLElement | null;
                // The indicator rows went with it, so the next _renderIndicators has to rebuild
                // rather than trust a signature describing nodes that no longer exist.
                this._lastIndSignature = null;
            }
            this._stripHasVolume = this._hasVolume;
        }
        if (strip === null) return;

        const write = (key: string, text: string, coloured: boolean) => {
            const el = strip.querySelector(`[data-ohlc="${key}"]`) as HTMLElement | null;
            if (el === null) return;
            el.textContent = text;
            if (coloured) el.className = cls;
        };
        write('time', formatters.time(candle.time), false);
        write('o', fmt(candle.open), true);
        write('h', fmt(candle.high), true);
        write('l', fmt(candle.low), true);
        write('c', fmt(candle.close), true);
        if (this._hasVolume) {
            const volume = candle.volume;
            // The column stays put on a bar the feed left volume off; only the number is missing.
            write('v', volume === undefined ? '--' : formatters.volume(volume), false);
        }

        const toggle = strip.querySelector('.legend-ct-toggle') as HTMLElement | null;
        if (toggle !== null) {
            toggle.title = this._host.translate('Chart');
            toggle.dataset.current = this._currentChartType;
            const icon = toggle.querySelector('[data-ct-icon]') as HTMLElement | null;
            if (icon !== null) icon.className = this._currentChartTypeIcon();
        }
    }

    /**
     * The icon for the rendering on screen. A type the page never listed — set from a toolbar that
     * offers more than the menu does — wears the first entry's icon rather than no icon at all.
     */
    _currentChartTypeIcon(): string {
        for (const type of this._chartTypes) {
            if (type.value === this._currentChartType) return type.icon;
        }
        return this._chartTypes.length > 0 ? this._chartTypes[0].icon : '';
    }

    /**
     * Opens the chart-type menu under its toggle. The menu is built in the host's menu layer rather
     * than inside the legend, whose HTML is rebuilt as bars tick — a menu in there is torn out of
     * the DOM the moment the user reaches for it.
     */
    _openChartTypeMenu(toggle: HTMLElement) {
        this._closeChartTypeMenu();

        const menu = document.createElement('div');
        menu.className = 'chart-legend-floating-ct-menu';
        for (const type of this._chartTypes) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'legend-ct-item';
            item.dataset.type = type.value;
            const icon = document.createElement('i');
            icon.className = type.icon;
            item.appendChild(icon);
            item.appendChild(document.createTextNode(' ' + this._host.translate(type.label)));
            menu.appendChild(item);
        }
        const rect = toggle.getBoundingClientRect();
        menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;`
            + 'z-index:99999;display:block;min-width:140px;';
        this._menuLayer().appendChild(menu);
        this._chartTypeMenu = menu;

        menu.addEventListener('click', (event) => {
            const item = (event.target as Element).closest('.legend-ct-item') as HTMLElement | null;
            if (item === null) return;
            const newType = item.dataset.type!;
            this.setChartType(newType);
            if (this.onChartTypeChange) this.onChartTypeChange(newType);
            this._closeChartTypeMenu();
        });
        // Close on outside click, registered a tick later so the click that opened the menu does
        // not immediately close it again.
        setTimeout(() => {
            if (this._chartTypeMenu !== menu) return;
            const outside = (event: MouseEvent) => {
                if (!menu.contains(event.target as Node)) this._closeChartTypeMenu();
            };
            this._chartTypeOutsideClick = outside;
            document.addEventListener('click', outside);
        }, 0);
    }

    /**
     * Takes this instance's menu down. One place for it, so choosing an item releases the outside
     * click listener too: removing the menu alone left the listener registered, holding the whole
     * detached subtree until some later click happened to land elsewhere.
     */
    _closeChartTypeMenu() {
        if (this._chartTypeOutsideClick !== null) {
            document.removeEventListener('click', this._chartTypeOutsideClick);
            this._chartTypeOutsideClick = null;
        }
        if (this._chartTypeMenu === null) return;
        this._chartTypeMenu.remove();
        this._chartTypeMenu = null;
    }

    /**
     * Acts on a click that landed on an indicator's edit or remove button, wherever the row lives —
     * the main strip or a pane header. Answers whether it was one of those.
     */
    _handleIndicatorClick(target: Element | null): boolean {
        if (target === null) return false;

        const removeBtn = target.closest('.legend-remove-btn') as HTMLElement | null;
        if (removeBtn !== null) {
            const id = parseInt(removeBtn.dataset.indId!, 10);
            if (this._indicatorEngine !== null) this._indicatorEngine.remove(id);
            return true;
        }
        const editBtn = target.closest('.legend-edit-btn') as HTMLElement | null;
        if (editBtn !== null) {
            const id = parseInt(editBtn.dataset.indId!, 10);
            const type = editBtn.dataset.indType!;
            if (this.onEditIndicator !== null) this.onEditIndicator(id, type);
            return true;
        }
        return false;
    }

    _renderIndicators(time: number | null | undefined, seriesData?: LegendSeriesData) {
        if (this._isDisposed || !this._indicatorEngine) return;
        // Freeze updates while the cursor is over the legend row — see init().
        if (this._isHovered) return;

        const indEl = this._container.querySelector('.legend-indicators');
        if (!indEl) return;

        // Only overlay (main-chart) indicators belong in this legend —
        // sub-pane indicators have their own pane headers, painted below.
        const all = this._indicatorEngine.getValuesAt(time, seriesData);
        const values = all.filter(v => v.paneId == null);
        const signature = values.map(v => (
            `${v.id}:${Object.keys(v.values).join('|')}`
        )).join(',');
        // Sub-pane values: group by paneId and push to each pane's header.
        this._paintSubPaneValues(all);

        // Rebuild the DOM ONLY when the indicator set changes — on every
        // crosshair move we just update the numeric text inside existing spans.
        // Keeps the edit/remove buttons' nodes stable so clicks register even
        // while the mouse is moving (mousedown / mouseup on a DOM node that
        // disappears between the two events silently drops the click).
        if (signature !== this._lastIndSignature) {
            this._lastIndSignature = signature;
            indEl.innerHTML = '';
            for (const ind of values) {
                const row = document.createElement('span');
                row.className = 'legend-indicator';
                // `dataset` is a DOMStringMap: the id is numeric, so the stringification the
                // DOM binding was doing implicitly is now spelled out (same value either way).
                row.dataset.indId = String(ind.id);

                // Multi-output indicators (Ichimoku → 5 values, MACD → 3, …)
                // used to spell every inner series name inline:
                //   "tenkan: 77892 kijun: 77913 senkouA: 78032 …"
                // which ate a whole screen-width. Instead: print the
                // indicator's short name once, then just the numbers in
                // the matching series colour. Inner names go in the
                // `title` tooltip for anyone who needs them.
                const valueKeys = Object.keys(ind.values);
                const singleVal = valueKeys.length === 1 && valueKeys[0] === 'value';

                if (!singleVal) {
                    const nameEl = document.createElement('span');
                    nameEl.className = 'legend-ind-name';
                    nameEl.textContent = ind.name;
                    row.appendChild(nameEl);
                }

                valueKeys.forEach((key, i) => {
                    const color = ind.colors[i] || '#fff';
                    const v = document.createElement('span');
                    v.className = 'legend-value';
                    v.dataset.key = key;
                    v.style.color = color;
                    // Inner series name as tooltip for multi-output rows
                    // (hoverable on desktop; falls back to no tooltip on touch).
                    if (!singleVal) v.title = key;
                    v.textContent = singleVal ? `${ind.name}: --` : '--';
                    row.appendChild(document.createTextNode(' '));
                    row.appendChild(v);
                });

                row.appendChild(document.createTextNode(' '));
                row.appendChild(this._createEditButton(ind));
                row.appendChild(document.createTextNode(' '));
                row.appendChild(this._createRemoveButton(ind));

                indEl.appendChild(row);
            }
        }

        // Update values in-place on the existing DOM.
        for (const ind of values) {
            const row = indEl.querySelector(`.legend-indicator[data-ind-id="${ind.id}"]`);
            if (!row) continue;
            const valueKeys = Object.keys(ind.values);
            const singleVal = valueKeys.length === 1 && valueKeys[0] === 'value';
            row.querySelectorAll('.legend-value').forEach((v: Element) => {
                const ve = v as HTMLElement;
                const key = ve.dataset.key!;
                const raw = ind.values[key];
                if (raw == null) {
                    // A sparse single-output indicator still needs its name on
                    // candles where it has no marker/value.
                    ve.textContent = singleVal ? `${ind.name}: --` : '';
                    return;
                }
                // Single-output keeps "NAME: value"; multi-output prints
                // just the number (the name is already once at row start).
                const text = this._host.formatters.price(raw);
                ve.textContent = singleVal ? `${ind.name}: ${text}` : text;
                // Colour is not part of the rebuild signature, and a style-only edit keeps the
                // indicator's id -- so nothing above would notice it. Re-applying here is what
                // keeps a recoloured overlay from wearing its old colour until the indicator set
                // changes, and it costs one assignment on a node that already exists.
                ve.style.color = ind.colors[valueKeys.indexOf(key)] || '#fff';
            });
        }
    }

    /**
     * Paints the values that live in a sub-pane into that pane's values element, obtained from the
     * pane host; the overlay values in the same list belong to the main strip and are skipped here.
     * Grouped by paneId so two indicators sharing the same Percent pane (RSI + Stochastic) render
     * side by side, and each keeps its own edit + remove buttons so they are managed independently.
     */
    _paintSubPaneValues(values: readonly LegendIndicatorValue[]) {
        const groups: Map<string, LegendIndicatorValue[]> = new Map();
        for (const value of values) {
            const paneId = value.paneId;
            if (paneId == null) continue;
            const group = groups.get(paneId);
            if (group === undefined) groups.set(paneId, [value]);
            else group.push(value);
        }

        // Clear panes that no longer have anything — so removing the last
        // indicator from a pane (before the pane itself is destroyed)
        // doesn't leave stale text in the header.
        for (const paneId of this._lastSubPaneIds) {
            if (groups.has(paneId)) continue;
            const el = this._paneHost.getValuesElement(paneId);
            if (el !== null) el.replaceChildren();
            this._detachPaneValues(paneId);
        }
        this._lastSubPaneIds = new Set(groups.keys());

        for (const [paneId, inds] of groups) {
            const el = this._paneHost.getValuesElement(paneId);
            if (el === null) continue;
            this._attachPaneValues(paneId, el);
            // A pane is labelled after the study that created it, so the one study alone in it
            // would otherwise be named twice on one line: once by the header, once by its own row.
            // A pane holding several needs every name, because the label can only carry one.
            const named = inds.length > 1;
            el.replaceChildren(...inds.map(ind => this._createPaneRow(ind, named)));
        }
    }

    /// One pane-header row: the indicator's coloured values and its two buttons, named only when
    /// the header's own label cannot stand for it.
    _createPaneRow(ind: LegendIndicatorValue, named: boolean): HTMLElement {
        const row = document.createElement('span');
        row.className = 'legend-indicator';

        const valueKeys = Object.keys(ind.values);
        const singleVal = valueKeys.length === 1 && valueKeys[0] === 'value';
        const space = () => {
            if (row.childNodes.length > 0) row.appendChild(document.createTextNode(' '));
        };
        // The name once at the front, then just the coloured numbers, so ADX's
        // "DMI: X Wilder MA: Y" reads "ADX X Y". Inner names go in each value's tooltip.
        if (named) {
            const nameEl = document.createElement('span');
            nameEl.className = 'pane-ind-name';
            nameEl.textContent = ind.name;
            row.appendChild(nameEl);
        }
        for (let i = 0; i < valueKeys.length; i++) {
            const key = valueKeys[i];
            const value = ind.values[key];
            if (value == null) continue;
            const text = this._host.formatters.price(value);
            const el = document.createElement('span');
            el.className = 'pane-value';
            el.style.color = ind.colors[i] || '#d0d6de';
            if (!singleVal) el.title = key;
            el.textContent = text;
            space();
            row.appendChild(el);
        }
        space();
        row.appendChild(this._createEditButton(ind));
        space();
        row.appendChild(this._createRemoveButton(ind));
        return row;
    }

    _createEditButton(ind: LegendIndicatorValue): HTMLElement {
        const edit = document.createElement('span');
        edit.className = 'legend-edit-btn';
        edit.dataset.indId = String(ind.id);
        edit.dataset.indType = ind.type;
        edit.title = this._host.translate('Edit');
        edit.textContent = '✎';
        return edit;
    }

    _createRemoveButton(ind: LegendIndicatorValue): HTMLElement {
        const remove = document.createElement('span');
        remove.className = 'legend-remove-btn';
        remove.dataset.indId = String(ind.id);
        remove.title = this._host.translate('Remove');
        remove.textContent = '×';
        return remove;
    }

    /** Binds this legend's click handling to a pane's values element, once per element. */
    _attachPaneValues(paneId: string, el: HTMLElement) {
        if (this._boundPaneValues.get(paneId) === el) return;
        this._detachPaneValues(paneId);
        el.addEventListener('click', this._onPaneClick);
        this._boundPaneValues.set(paneId, el);
    }

    _detachPaneValues(paneId: string) {
        const bound = this._boundPaneValues.get(paneId);
        if (bound === undefined) return;
        bound.removeEventListener('click', this._onPaneClick);
        this._boundPaneValues.delete(paneId);
    }
}
