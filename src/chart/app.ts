// Demo wiring for the chart UI layer.
//
// It mounts the layer the way a consumer does - one `createChartUi` call - which is what keeps that
// API honest: an option awkward for somebody else is awkward here first. The chart-type switcher is
// wired separately because this page is the one that switches renderings.
//
// The engine is loaded separately and published as the `SSChart` global.
import { ChartTypeSwitcher } from './chart-type-switcher.js';
import type { ChartOptions, OrderPlace } from '../core/chart-api.js';
import {
    ChartType,
    allChartTypes,
    createChartUi,
    defaultChartTypePalette,
    isDerivedChartType,
    localChartUiStorage,
    standaloneHost,
    type ChartTypeValue,
} from './ui.js';
import {
    getIndicatorPainterNames,
    hasIndicatorPainter,
    registerIndicatorPainter,
} from './indicators/painters/index.js';

declare const SSChart: any;

// The demo speaks English, formats numbers the package's own way and logs its messages. A real
// page passes its own translator, its own price ladder and its own toast.
const uiHost = standaloneHost;

// What the legend's chart-type dropdown offers here: everything the switcher implements. A page
// whose toolbar renders fewer buttons passes fewer entries.
const CHART_TYPE_MENU = [
    { value: ChartType.Candle, label: 'Candles', icon: 'bi bi-bar-chart-fill' },
    { value: ChartType.Bar, label: 'Bars', icon: 'bi bi-bar-chart-line' },
    { value: ChartType.Line, label: 'Line', icon: 'bi bi-graph-up' },
    { value: ChartType.Area, label: 'Area', icon: 'bi bi-graph-up-arrow' },
    { value: ChartType.HeikinAshi, label: 'Heikin-Ashi', icon: 'bi bi-bar-chart-steps' },
    { value: ChartType.Renko, label: 'Renko', icon: 'bi bi-grid-3x3' },
    { value: ChartType.PointFigure, label: 'Point and Figure', icon: 'bi bi-x-diamond' },
];

// Plugin surface for applications that consume the browser bundles. Module
// consumers can import the same functions from indicators/painters/index.ts.
Object.assign((window as any).SSChart, {
    registerIndicatorPainter,
    hasIndicatorPainter,
    getIndicatorPainterNames,
});

function boot() {
    const S = (window as any).SampleData;
    const container = document.getElementById('chartContainer');
    if (!container || !S) return;

    // Light / dark chart palettes. The page chrome re-themes automatically via
    // terminal.css's [data-bs-theme] CSS vars; the chart canvases (main chart +
    // every sub-pane) are re-coloured explicitly by applyTheme().
    interface ChartPalette {
        surf: string; text: string; grid: string; border: string;
        cross: string; crossLabel: string; up: string; down: string;
    }
    type ThemeName = 'dark' | 'light';
    const THEMES: Record<ThemeName, ChartPalette> = {
        dark:  { surf: '#131820', text: '#8b97a7', grid: 'rgba(30,38,51,0.4)',  border: '#1e2633', cross: 'rgba(74,158,255,0.30)', crossLabel: '#4a9eff', up: '#00c853', down: '#ff3d57' },
        light: { surf: '#ffffff', text: '#5b6b7f', grid: 'rgba(148,163,184,0.28)', border: '#e2e8f0', cross: 'rgba(217,119,6,0.35)',  crossLabel: '#d97706', up: '#16a34a', down: '#dc2626' },
    };
    let themeName: ThemeName = 'dark';
    const chartTheme = (p: ChartPalette) => ({
        layout: { background: { type: 'solid', color: p.surf }, textColor: p.text, fontFamily: "'IBM Plex Mono','Consolas',monospace", fontSize: 11, attributionLogo: false },
        grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
        rightPriceScale: { borderColor: p.border },
        leftPriceScale: { borderColor: p.border },
        timeScale: { borderColor: p.border, timeVisible: true, secondsVisible: false },
        crosshair: { mode: SSChart.CrosshairMode.Normal,
                     vertLine: { color: p.cross, labelBackgroundColor: p.crossLabel },
                     horzLine: { color: p.cross, labelBackgroundColor: p.crossLabel } },
    });

    const chart = SSChart.createChart(container, chartTheme(THEMES.dark));

    let candleSeries = chart.addSeries(SSChart.CandlestickSeries, {
        upColor: THEMES.dark.up, downColor: THEMES.dark.down, borderVisible: false, wickUpColor: THEMES.dark.up, wickDownColor: THEMES.dark.down,
    });
    const volumeSeries = chart.addSeries(SSChart.HistogramSeries, { priceScaleId: '', priceFormat: { type: 'volume' } });
    try { volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } }); } catch { /* */ }

    // The live candle window — shared BY REFERENCE with the indicator engine.
    const live = S.candles.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.vol, levels: c.levels }));
    const volColor = (c: any) => (c.close >= c.open ? 'rgba(0,200,83,0.4)' : 'rgba(255,61,87,0.4)');
    candleSeries.setData(live);
    volumeSeries.setData(live.map((c: any) => ({ time: c.time, value: c.volume, color: volColor(c) })));
    try { if (SSChart.createSeriesMarkers && S.markers) SSChart.createSeriesMarkers(candleSeries, S.markers); } catch { /* */ }
    chart.timeScale().fitContent();

    // The whole UI layer in one call: pane chrome, indicator engine and renderer, the three
    // controllers, the legend, the picker and the right-click menu, wired in the order that works.
    // The dialog's markup is this page's own, server-rendered and localised, so it is handed over
    // rather than built; a page with none omits it and gets one.
    const dialogEl = document.getElementById('indicatorModal');
    if (!dialogEl) return;
    const ui = createChartUi(chart, {
        container,
        host: uiHost,
        priceSource: candleSeries,
        chartTypes: CHART_TYPE_MENU,
        storage: localChartUiStorage('sschart'),
        dialogRoot: dialogEl,
    });
    const { engine, legend, dialog, menu } = ui;
    engine.onChange = () => { if (themeName !== 'dark') applyTheme(); };   // re-theme new sub-panes
    ui.setCandles(live);

    // "+ Pane" toolbar button and the main chart's right-click "Add pane…" open
    // the picker with the target preset to a NEW pane — picking a study and
    // pressing Add then creates the pane with that study in it (so the pane is
    // labelled by its indicator, and cancelling leaves no empty pane behind).
    const addNewPane = () => dialog.showForPane('__new__');

    // Chart-type switcher, driven by the legend's per-pane chart-type dropdown.
    const typeSwitcher = new ChartTypeSwitcher({
        chart,
        series: candleSeries,
        initialType: ChartType.Candle,
        availableTypes: allChartTypes,
        palette: defaultChartTypePalette,
        host: uiHost,
    });
    typeSwitcher.setRawCandles(live);   // shares the ref, so it always rebuilds from the live window
    // The one place that learns a switch happened, so nothing has to patch a method to find out.
    typeSwitcher.onSeriesChanged(series => {
        candleSeries = series;
        menu.setPriceSource(series);
    });
    legend.onChartTypeChange = (value: string) => {
        const type = value as ChartTypeValue;
        typeSwitcher.switchType(type);
        // Renko / P&F own one stable streaming transform. The visible custom
        // series and indicators therefore consume identical boxes/columns while
        // live replacements rewind only their provisional tail.
        const derived = isDerivedChartType(type);
        const indicatorCandles = typeSwitcher.getIndicatorCandles();
        engine.setCandles(indicatorCandles, { rewindableTail: derived });
        legend.setRawCandles(indicatorCandles);
        if (derived) volumeSeries.setData([]);
        else volumeSeries.setData(live.map((c: any) => ({ time: c.time, value: c.volume, color: volColor(c) })));
    };

    // Toolbar buttons.
    const addBtn = document.getElementById('addIndicatorBtn');
    if (addBtn) addBtn.addEventListener('click', () => dialog.show());
    const addPaneBtn = document.getElementById('addPaneBtn');
    if (addPaneBtn) addPaneBtn.addEventListener('click', addNewPane);
    const fitBtn = document.getElementById('fitBtn');
    if (fitBtn) fitBtn.addEventListener('click', () => chart.timeScale().fitContent());

    // Theme toggle: flips the page chrome (terminal.css [data-bs-theme] vars) and
    // re-colours every chart canvas — main chart + candle series + all sub-panes.
    function applyTheme() {
        const p = THEMES[themeName];
        document.documentElement.setAttribute('data-bs-theme', themeName);
        // One engine option bag goes to the main chart and to every sub-pane adapter, each
        // reading only the keys it owns. The annotation sits on the variable, not on
        // chartTheme's return, so keys the engine ignores stay in the literal untouched.
        const opts: ChartOptions = chartTheme(p);
        chart.applyOptions(opts);
        candleSeries.applyOptions({ upColor: p.up, downColor: p.down, wickUpColor: p.up, wickDownColor: p.down });
        ui.paneManager.getPanes().forEach((id: string) => {
            const pane = ui.paneManager.getChart(id);
            if (pane) pane.applyOptions(opts);
        });
        const tb = document.getElementById('themeBtn');
        if (tb) tb.innerHTML = themeName === 'dark' ? '☀ Light' : '☾ Dark';
    }
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', () => { themeName = themeName === 'dark' ? 'light' : 'dark'; applyTheme(); });

    // Default studies (one overlay + one sub-pane) so the chart is populated.
    engine.add('BollingerBands', { length: 20, stdDev: 2 });
    engine.add('RelativeStrengthIndex', { length: 14 });
    legend.refresh();

    // ---- realtime feed: mutate the shared array in place; time-aligned studies
    //      consume append/replace patches through the incremental runtime ----
    const feed = S.makeFeed();
    let timer: any = null;
    function step() {
        const bar = feed.next(5);
        const lv = S.levelsFor(bar);   // per-bar volume-by-price for the footprint (cluster / box) types
        const derived = isDerivedChartType(typeSwitcher.getCurrentType());
        const last = live[live.length - 1];
        const newBar = bar.time !== last.time;
        if (newBar) {
            live.push({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.vol, levels: lv });
        } else {
            last.open = bar.open; last.high = bar.high; last.low = bar.low; last.close = bar.close; last.volume = bar.vol; last.levels = lv;
        }
        typeSwitcher.updatePrice({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.vol, levels: lv });
        if (!derived) volumeSeries.update({ time: bar.time, value: bar.vol, color: volColor(bar) });
        try { chart.timeScale().scrollToRealTime(); } catch { /* */ }
        engine.onLiveUpdate();          // RAF-coalesced incremental append/replace/rewind
        legend.setRawCandles(derived ? typeSwitcher.getIndicatorCandles() : live);
        legend.refresh();
    }
    const rtBtn = document.getElementById('realtimeBtn');
    if (rtBtn) rtBtn.addEventListener('click', () => {
        if (timer) { clearInterval(timer); timer = null; rtBtn.classList.remove('on'); }
        else { timer = setInterval(step, 350); rtBtn.classList.add('on'); }
    });

    // ---- Resting order lines with a buy/sell side, driven by the chart's OWN order engine — the one
    //      the terminal uses. Each line is `draggable`, so the chart owns the whole gesture: hover it
    //      (ns-resize), drag it up/down (autoscale frozen + label anchored so it stays WYSIWYG,
    //      pinned to the edge if it leaves the view), release to commit. The "✕" cancels it.
    //      Placement is terminal-style: HOLD Ctrl → a neutral amber "⊕ ORDER" preview tracks the
    //      cursor (side not decided yet); Ctrl+click opens a Buy/Sell chooser at that price — the
    //      terminal does the same with its right-click "Buy at price / Sell at price" menu.
    (function orderLineDemo() {
        const fmt = (p: number) => p.toFixed(2);
        const snap = (p: number) => Math.round(p * 100) / 100;
        const BUY = '#00c853';
        const SELL = '#ff3d57';

        function addOrder(price: number, side: string, color: string): void {
            let line: any;
            line = candleSeries.createPriceLine({
                price, color, lineWidth: 2, axisLabelVisible: true, draggable: true,
                title: `${side} @ ${fmt(price)}`,
                onDrag: (p: number) => line.applyOptions({ title: `${side} @ ${fmt(p)}` }),        // live label while dragging
                onDragCommit: (p: number) => line.applyOptions({ title: `${side} @ ${fmt(p)}` }),  // a terminal would send an order-replace here
                onClose: () => candleSeries.removePriceLine(line),                                 // ✕ cancels the order
            });
        }

        const ref = snap(live[live.length - 1]?.close ?? 100);
        addOrder(snap(ref - 3), 'Buy', BUY);     // one resting order each side at startup
        addOrder(snap(ref + 3), 'Sell', SELL);

        // Order placement is the CHART's feature: hold Ctrl and the chart shows its own neutral amber
        // "⊕ ORDER" preview; on the click it EMITS an OrderPlace signal. The chart does not form the
        // order — the demo (the host) catches the signal and creates the line, choosing the side from
        // the mouse button (Ctrl + LEFT → Buy / green, Ctrl + RIGHT → Sell / red).
        chart.setOrderPlacement({ modifier: 'ctrl' });
        chart.subscribeOrderPlace((e: OrderPlace) => {
            const price = snap(e.price);
            if (e.button === 2) addOrder(price, 'Sell', SELL);
            else addOrder(price, 'Buy', BUY);
        });
    })();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
