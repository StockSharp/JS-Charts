// History-backfill showcase. A ChartDataController is wired to a fake async
// datafeed of 2500 bars. It serves an initial page, then — as the visible range
// approaches the oldest loaded bar on zoom-out / scroll-left — fetches the next
// older page and prepends it. An SMA line recomputes over whatever history has
// been loaded so far, demonstrating that indicators extend with backfill. The
// same mechanism drives an exact footprint series in "Footprint" mode.
(function () {
    'use strict';
    var pal = Demo.PALETTES.dark;
    Demo.applyCssPalette(pal);

    var TICK = 0.25;
    var SMA_PERIOD = 50;
    var chart = SSChart.createChart(Demo.el('chart'), Demo.chartTheme(pal, { mode: 'ordinal' }));

    // Full deterministic histories (2500 bars each). The feed pages over these.
    var candleHistory = Demo.genCandles(2500, { startPrice: 100, step: 3600, seed: 555 });
    var footprintHistory = Demo.genExactBars(2500, { tickSize: TICK, step: 3600, seed: 555 });

    var controller = null, priceSeries = null, mode = 'candles';

    function teardown() {
        if (controller) { controller.dispose(); controller = null; }
        if (priceSeries) { try { chart.removeSeries(priceSeries); } catch (e) { /* gone */ } }
        priceSeries = null;
    }

    function build(next) {
        teardown();
        mode = next;
        var all = mode === 'candles' ? candleHistory : footprintHistory;

        if (mode === 'candles') {
            priceSeries = chart.addSeries(SSChart.CandlestickSeries, {
                upColor: pal.up, downColor: pal.down, borderVisible: false,
                wickUpColor: pal.up, wickDownColor: pal.down,
            });
        } else {
            priceSeries = chart.addSeries(SSChart.FootprintSeries, {
                tickSize: TICK, mode: SSChart.FootprintDisplayMode.BidAsk,
                detailLevel: SSChart.FootprintDetailLevel.Auto,
                bidColor: pal.bid, askColor: pal.ask,
            });
        }
        controller = new SSChart.ChartDataController({
            chart: chart, series: priceSeries,
            dataSource: Demo.makeArrayFeed(all, { latencyMs: 400 }),
            initialCount: 300, historyCount: 250, historyPrefetchThreshold: 40,
            autoPrefetch: true,
        });
        controller.subscribe(onSnapshot);
        controller.setSelection({ symbol: mode === 'candles' ? 'DEMO' : 'DEMO-OF', resolution: '1h' })
            .then(function () {
                var loaded = controller.rawData().length;
                chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, loaded - 90), to: loaded + 3 });
            })
            .catch(function () { /* surfaced in status */ });
    }

    var lastLoaded = -1;
    function onSnapshot(snap) {
        if (snap.status === 'ready' && snap.loadedBars !== lastLoaded) {
            lastLoaded = snap.loadedBars;
            // Indicators recompute over the whole loaded window, so an older page arriving at the
            // left extends them backwards rather than leaving a study that starts mid-chart. The
            // SMA this page opens with is one of them, which is why it appears in the legend and
            // can be edited and removed like any other.
            ui.setCandles(controller.rawData());
        }
        renderStatus(snap);
    }

    function renderStatus(snap) {
        var loading = snap.loadingHistory;
        Demo.el('status').innerHTML =
            '<span class="st">symbol <b>' + (snap.selection ? snap.selection.symbol : '—') + '</b></span>'
            + '<span class="st">loaded <b>' + snap.loadedBars + '</b> / 2500</span>'
            + '<span class="st">more before <b>' + (snap.hasMoreBefore ? 'yes' : 'no') + '</b></span>'
            + '<span class="st ' + (loading ? 'busy' : '') + '">' + (loading ? 'loading older…' : 'idle') + '</span>'
            + (snap.historyError ? '<span class="st err">error</span>' : '');
    }

    // ---- controls -----------------------------------------------------------
    var seg = Demo.el('modeSeg');
    seg.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-mode]');
        if (!btn || btn.classList.contains('on')) return;
        Array.prototype.forEach.call(seg.querySelectorAll('.tbtn'), function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        lastLoaded = -1;
        build(btn.getAttribute('data-mode'));
    });

    function loadOlder() {
        if (controller) controller.loadMoreBefore();
    }

    Demo.el('olderBtn').addEventListener('click', loadOlder);

    // ---- right-click menu ----------------------------------------------------
    //
    // This page is about pulling older history, so that goes first; the indicator rows come from
    // the shared stack below it. Every row comes from here - the menu module contributes none of
    // its own, which is what lets it sit on a page with no broker behind it.
    var ui = SSChartUI.createChartUi(chart, {
        container: Demo.el('chart'),
        host: SSChartUI.standaloneHost,
        priceSource: null,
        chartTypes: [],
        storage: SSChartUI.localChartUiStorage('sschart:demo:backfill'),
        provideItems: function () {
            var snap = controller ? controller.snapshot() : null;
            return [
                [{
                    key: 'older',
                    label: 'Load older history',
                    icon: 'bi bi-arrow-bar-left',
                    // Greyed out rather than hidden once the feed is exhausted or a load is in
                    // flight, so the row keeps its place and says why it cannot act.
                    disabled: snap === null || !snap.hasMoreBefore || snap.loadingHistory,
                    invoke: loadOlder,
                }, {
                    key: 'fit',
                    label: 'Fit loaded range',
                    icon: 'bi bi-arrows-collapse-vertical',
                    invoke: function () { chart.timeScale().fitContent(); },
                }],
            ];
        },
    });

    var dark = true;
    Demo.el('themeBtn').addEventListener('click', function () {
        dark = !dark;
        pal = dark ? Demo.PALETTES.dark : Demo.PALETTES.light;
        Demo.applyCssPalette(pal);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        chart.applyOptions(Demo.chartTheme(pal, { mode: 'ordinal' }));
        lastLoaded = -1;
        build(mode);
        Demo.el('themeBtn').innerHTML = dark ? '&#9788; Light' : '&#9789; Dark';
    });

    build('candles');
    // The overlay the page is about, added the way a reader would add it: through the engine, so it
    // is in the legend with its value under the cursor rather than being a line nothing names.
    ui.engine.add('SimpleMovingAverage', { length: SMA_PERIOD }, '__main__');
})();
