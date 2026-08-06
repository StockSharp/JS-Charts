const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
    ChartDataStatus,
    RealtimeStatus,
} = require('../src/data/chart-data-controller.js');
const {
    ChartNavigator,
    NavigatorDateAlignment,
    NavigatorNavigationOutcome,
    NavigatorRangePreset,
    NavigatorStatus,
    defaultNavigatorPresets,
} = require('../src/workspace/chart-navigator.js');

function candle(time, close = time) {
    return {
        time,
        open: close - 0.5,
        high: close + 2,
        low: close - 2,
        close,
    };
}

function snapshot(overrides = {}) {
    return Object.freeze({
        status: ChartDataStatus.Ready,
        generation: 1,
        selection: { symbol: 'TEST', resolution: '1m' },
        symbolInfo: { id: 'TEST' },
        loadedBars: 0,
        renderedBars: 0,
        groupingLevel: 1,
        realtimeStatus: RealtimeStatus.Connected,
        realtimeUpdates: 0,
        realtimeError: null,
        reconnectAttempt: 0,
        nextReconnectDelayMs: null,
        hasMoreBefore: false,
        hasMoreAfter: false,
        loadingHistory: false,
        historyError: null,
        error: null,
        ...overrides,
    });
}

function dataDouble(initialBars, options = {}) {
    let bars = [...initialBars];
    let state = snapshot({
        loadedBars: bars.length,
        renderedBars: bars.length,
        hasMoreBefore: options.hasMoreBefore ?? (options.pages?.length > 0),
    });
    const listeners = new Set();
    const sliceCalls = [];
    const pages = [...(options.pages ?? [])];
    let loadCalls = 0;
    let pending = options.pending ?? null;
    const emit = () => {
        for (const listener of listeners) listener(state);
    };
    const updateState = patch => {
        state = snapshot({ ...state, ...patch });
        emit();
    };
    const applyPage = page => {
        const before = bars.length;
        const byTime = new Map([...page.bars, ...bars].map(item => [item.time, item]));
        bars = [...byTime.values()].sort((left, right) => left.time - right.time);
        updateState({
            loadedBars: bars.length,
            renderedBars: bars.length,
            hasMoreBefore: page.hasMoreBefore,
            loadingHistory: false,
            historyError: null,
        });
        return bars.length - before;
    };
    const data = {
        snapshot: () => state,
        rawDataSlice(from = 0, to = bars.length) {
            sliceCalls.push({ from, to });
            return Object.freeze(bars.slice(from, to));
        },
        async loadMoreBefore() {
            loadCalls++;
            updateState({ loadingHistory: true, historyError: null });
            try {
                const page = pending !== null ? await pending.promise : pages.shift();
                pending = null;
                if (page instanceof Error) throw page;
                if (page === undefined) {
                    updateState({ loadingHistory: false, hasMoreBefore: false });
                    return 0;
                }
                return applyPage(page);
            } catch (error) {
                updateState({ loadingHistory: false, historyError: error });
                throw error;
            }
        },
        subscribe(listener) { listeners.add(listener); },
        unsubscribe(listener) { listeners.delete(listener); },
    };
    return {
        data,
        listeners,
        sliceCalls,
        loadCalls: () => loadCalls,
        bars: () => [...bars],
        updateLast(next) {
            bars[bars.length - 1] = next;
            updateState({ realtimeUpdates: state.realtimeUpdates + 1 });
        },
        append(next) {
            bars.push(next);
            updateState({
                loadedBars: bars.length,
                renderedBars: bars.length,
                realtimeUpdates: state.realtimeUpdates + 1,
            });
        },
        replace(next, generation = state.generation + 1) {
            bars = [...next];
            updateState({
                generation,
                loadedBars: bars.length,
                renderedBars: bars.length,
                hasMoreBefore: false,
            });
        },
    };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

function chartDouble(initialRange = { from: 0, to: 1 }, bounds = () => initialRange) {
    let visibleRange = { ...initialRange };
    const listeners = new Set();
    const writes = [];
    let fitCalls = 0;
    const timeScale = {
        getVisibleRange: () => visibleRange,
        setVisibleRange(range) {
            visibleRange = { ...range };
            writes.push(visibleRange);
            for (const listener of listeners) listener(visibleRange);
        },
        fitContent() {
            fitCalls++;
            visibleRange = { ...bounds() };
            for (const listener of listeners) listener(visibleRange);
        },
        subscribeVisibleTimeRangeChange(listener) { listeners.add(listener); },
        unsubscribeVisibleTimeRangeChange(listener) { listeners.delete(listener); },
    };
    return {
        chart: { timeScale: () => timeScale },
        writes,
        listeners,
        fitCalls: () => fitCalls,
        emitRange(range) {
            visibleRange = { ...range };
            for (const listener of listeners) listener(visibleRange);
        },
        visibleRange: () => visibleRange,
    };
}

describe('ChartNavigator', () => {
    it('builds bounded min/max buckets and refreshes only the realtime tail', () => {
        const bars = Array.from({ length: 25 }, (_, index) => candle(index + 1, index * 10));
        const data = dataDouble(bars);
        const chart = chartDouble({ from: 10, to: 25 });
        const navigator = new ChartNavigator({
            chart: chart.chart,
            data: data.data,
            maxPoints: 10,
        });

        const initial = navigator.snapshot();
        assert.equal(initial.status, NavigatorStatus.Ready);
        assert.deepEqual(initial.bounds, { from: 1, to: 25, count: 25 });
        assert.equal(initial.samples.length, 9);
        assert.deepEqual(initial.samples[0], {
            from: 1,
            to: 3,
            open: 0,
            high: 22,
            low: -2,
            close: 20,
            count: 3,
        });
        assert.equal(Object.isFrozen(initial.samples), true);
        assert.equal(Object.isFrozen(initial.samples[0]), true);
        assert.deepEqual(data.sliceCalls, [
            { from: 0, to: 1 },
            { from: 24, to: 25 },
            { from: 0, to: 25 },
        ]);

        data.sliceCalls.length = 0;
        data.updateLast(candle(25, 999));
        assert.deepEqual(data.sliceCalls, [
            { from: 0, to: 1 },
            { from: 24, to: 25 },
            { from: 24, to: 25 },
        ]);
        assert.equal(navigator.snapshot().samples.at(-1).close, 999);

        data.sliceCalls.length = 0;
        data.append(candle(26, 1_000));
        assert.deepEqual(data.sliceCalls.at(-1), { from: 24, to: 26 });
        assert.ok(navigator.snapshot().samples.length <= 10);
        navigator.dispose();
        assert.equal(data.listeners.size, 0);
        assert.equal(chart.listeners.size, 0);
    });

    it('loads directed history for ranges and presets, including bounded All', async () => {
        const data = dataDouble([candle(300), candle(400)], {
            pages: [
                { bars: [candle(200), candle(250)], hasMoreBefore: true },
                { bars: [candle(100), candle(150)], hasMoreBefore: false },
            ],
        });
        const chart = chartDouble({ from: 300, to: 400 }, () => ({
            from: data.bars()[0].time,
            to: data.bars().at(-1).time,
        }));
        const navigator = new ChartNavigator({
            chart: chart.chart,
            data: data.data,
            presets: [
                { id: 'window', label: 'Window', range: context => ({ from: 150, to: context.anchor }) },
                { id: 'all', label: 'All', range: () => null },
            ],
        });

        const selected = await navigator.selectPreset('window');
        assert.equal(selected.outcome, NavigatorNavigationOutcome.Applied);
        assert.equal(selected.pagesLoaded, 2);
        assert.equal(selected.barsLoaded, 4);
        assert.equal(selected.historyExhausted, true);
        assert.deepEqual(selected.visibleRange, { from: 150, to: 400 });
        assert.equal(navigator.snapshot().activePresetId, 'window');
        assert.equal(navigator.snapshot().bounds.count, 6);

        chart.emitRange({ from: 200, to: 300 });
        assert.equal(navigator.snapshot().activePresetId, null);
        const all = await navigator.selectPreset('all');
        assert.equal(all.outcome, NavigatorNavigationOutcome.Applied);
        assert.equal(chart.fitCalls(), 1);
        assert.deepEqual(all.visibleRange, { from: 100, to: 400 });

        const limitedData = dataDouble([candle(300), candle(400)], {
            pages: [{ bars: [candle(200), candle(250)], hasMoreBefore: true }],
        });
        const limitedChart = chartDouble({ from: 300, to: 400 });
        const limited = new ChartNavigator({ chart: limitedChart.chart, data: limitedData.data });
        const limitedResult = await limited.setRange(
            { from: 100, to: 200 },
            { maxHistoryPages: 1 },
        );
        assert.equal(limitedResult.outcome, NavigatorNavigationOutcome.PageLimit);
        assert.equal(limited.snapshot().activePresetId, null);
        assert.deepEqual(limitedChart.writes.at(-1), { from: 200, to: 300 });
        limited.dispose();
        navigator.dispose();
    });

    it('goes to a date with explicit alignment and cancels a stale user operation', async () => {
        const history = deferred();
        const data = dataDouble([candle(300), candle(400)], {
            pending: history,
            hasMoreBefore: true,
        });
        const chart = chartDouble({ from: 350, to: 400 });
        const navigator = new ChartNavigator({ chart: chart.chart, data: data.data });

        const pending = navigator.goToDate(200, {
            alignment: NavigatorDateAlignment.Center,
            spanSeconds: 50,
        });
        assert.equal(navigator.snapshot().status, NavigatorStatus.Loading);
        chart.emitRange({ from: 360, to: 390 });
        history.resolve({ bars: [candle(150), candle(200), candle(250)], hasMoreBefore: false });
        const cancelled = await pending;
        assert.equal(cancelled.outcome, NavigatorNavigationOutcome.Cancelled);
        assert.deepEqual(chart.visibleRange(), { from: 360, to: 390 });
        assert.equal(navigator.snapshot().loading, false);

        const applied = await navigator.goToDate(200, {
            alignment: NavigatorDateAlignment.Start,
            spanSeconds: 40,
        });
        assert.equal(applied.outcome, NavigatorNavigationOutcome.Applied);
        assert.deepEqual(applied.requestedRange, { from: 200, to: 240 });
        assert.deepEqual(chart.writes.at(-1), { from: 200, to: 240 });
        assert.equal(applied.requestedTime, 200);

        assert.equal(navigator.presets().some(item => item.id === NavigatorRangePreset.YearToDate), true);
        navigator.dispose();
    });

    it('surfaces history failures and ignores observer failures', async () => {
        const error = new Error('history unavailable');
        const data = dataDouble([candle(300), candle(400)], {
            pages: [error],
            hasMoreBefore: true,
        });
        const chart = chartDouble({ from: 300, to: 400 });
        const navigator = new ChartNavigator({ chart: chart.chart, data: data.data });
        let notifications = 0;
        navigator.subscribe(() => { throw new Error('observer'); });
        navigator.subscribe(() => { notifications++; });

        await assert.rejects(navigator.setRange({ from: 100, to: 200 }), /history unavailable/);
        assert.equal(navigator.snapshot().status, NavigatorStatus.Error);
        assert.equal(navigator.snapshot().error, error);
        assert.ok(notifications > 0);
        assert.throws(() => navigator.goToDate(Number.NaN), /finite UNIX timestamp/);
        assert.throws(() => navigator.selectPreset('missing'), /unknown navigator preset/);
        navigator.dispose();
        assert.throws(() => navigator.snapshot(), /disposed/);
    });

    // A cancelled navigation still owes the overview rebuild that was deferred while it ran:
    // refreshData only marks the samples dirty whenever a navigation is in flight. The doubles
    // below deliver the change and its data in a single snapshot and then go quiet -- a static or
    // custom controller, not the built-in one whose next emit would launder the stale overview.
    function overviewReport(navigator) {
        const state = navigator.snapshot();
        return {
            boundsFrom: state.bounds.from,
            firstSampleFrom: state.samples[0].from,
            boundsCount: state.bounds.count,
            sampledBars: state.samples.reduce((total, sample) => total + sample.count, 0),
        };
    }

    function quietData(initialBars, loadMoreBefore) {
        let bars = [...initialBars];
        let state = snapshot({
            loadedBars: bars.length, renderedBars: bars.length, hasMoreBefore: true,
        });
        const listeners = new Set();
        const publish = patch => {
            state = snapshot({ ...state, ...patch });
            for (const listener of listeners) listener(state);
        };
        const context = {
            replaceBars(next) { bars = [...next]; },
            prependBars(next) { bars = [...next, ...bars]; },
            barCount: () => bars.length,
            publish,
        };
        return {
            data: {
                snapshot: () => state,
                rawDataSlice: (from = 0, to = bars.length) => Object.freeze(bars.slice(from, to)),
                loadMoreBefore: () => loadMoreBefore(context),
                subscribe(listener) { listeners.add(listener); },
                unsubscribe(listener) { listeners.delete(listener); },
            },
            context,
        };
    }

    it('resamples when a symbol switch cancels a navigation', async () => {
        let finishLoad = null;
        const { data, context } = quietData(
            Array.from({ length: 20 }, (_, index) => candle(1_000 + index * 60, 100 + index)),
            () => new Promise(resolve => { finishLoad = resolve; }),
        );
        const chart = chartDouble({ from: 1_000, to: 2_140 });
        const navigator = new ChartNavigator({ chart: chart.chart, data, maxPoints: 40 });
        assert.equal(navigator.snapshot().samples.at(-1).close, 119);

        const navigation = navigator.setRange({ from: 0, to: 2_140 });
        assert.equal(navigator.snapshot().loading, true);
        // The host swaps the instrument: a new generation and its bars in one snapshot.
        context.replaceBars(Array.from({ length: 20 }, (_, index) => candle(9_000 + index * 60, 900 + index)));
        context.publish({
            generation: 2,
            selection: { symbol: 'OTHER', resolution: '1m' },
            symbolInfo: { id: 'OTHER' },
            loadedBars: context.barCount(),
            renderedBars: context.barCount(),
            hasMoreBefore: false,
        });
        finishLoad(0);

        assert.equal((await navigation).outcome, NavigatorNavigationOutcome.Cancelled);
        assert.equal(navigator.snapshot().loading, false);
        assert.deepEqual(
            overviewReport(navigator),
            { boundsFrom: 9_000, firstSampleFrom: 9_000, boundsCount: 20, sampledBars: 20 },
            'the overview must describe the data the navigator reports bounds for, not the samples '
            + 'left over from the instrument that was on screen before the switch',
        );
        navigator.dispose();
    });

    it('resamples when a user pan cancels a navigation', async () => {
        let finishLoad = null;
        const older = Array.from({ length: 20 }, (_, index) => candle(2_000 + index * 60, 200 + index));
        const { data } = quietData(
            Array.from({ length: 20 }, (_, index) => candle(5_000 + index * 60, 500 + index)),
            context => {
                // The page lands and is published while the navigation is still running.
                context.prependBars(older);
                context.publish({
                    loadedBars: context.barCount(),
                    renderedBars: context.barCount(),
                    hasMoreBefore: false,
                });
                return new Promise(resolve => { finishLoad = () => resolve(older.length); });
            },
        );
        const chart = chartDouble({ from: 5_000, to: 6_140 });
        const navigator = new ChartNavigator({ chart: chart.chart, data, maxPoints: 40 });

        const navigation = navigator.setRange({ from: 0, to: 6_140 });
        assert.equal(navigator.snapshot().loading, true);
        chart.emitRange({ from: 5_500, to: 6_000 });   // the user grabs the chart and pans
        finishLoad();

        assert.equal((await navigation).outcome, NavigatorNavigationOutcome.Cancelled);
        assert.equal(navigator.snapshot().loading, false);
        assert.deepEqual(
            overviewReport(navigator),
            { boundsFrom: 2_000, firstSampleFrom: 2_000, boundsCount: 40, sampledBars: 40 },
            'the page that landed before the pan must be in the overview the navigator publishes',
        );
        navigator.dispose();
    });

    // The built-in presets do UTC calendar arithmetic -- month-end clamping and a negative month
    // rollover -- which is the classic place to be off by a day once a year. Nothing pinned it:
    // every navigation test injects its own presets, and the only assertion about these was that
    // they exist.
    describe('built-in presets', () => {
        const utc = (text) => Date.parse(text) / 1_000;
        const iso = (time) => new Date(time * 1_000).toISOString();

        function presetRange(id, anchorIso) {
            const anchor = utc(anchorIso);
            // Date.parse rolls a date that does not exist forward instead of refusing it, which
            // would quietly test a different day than the one written here.
            assert.equal(iso(anchor), anchorIso.replace('Z', '.000Z'), 'the anchor must be a real date');
            const definition = defaultNavigatorPresets().find(item => item.id === id);
            assert.ok(definition, `preset ${id} must exist`);
            return definition.range({
                anchor,
                bounds: { from: anchor - 10 * 365 * 86_400, to: anchor, count: 1_000 },
                data: snapshot(),
            });
        }

        it('subtracts whole calendar months, clamping to the end of a short month', () => {
            assert.deepEqual(
                [
                    // 31 March back one month is the last day of February, not 3 March.
                    iso(presetRange(NavigatorRangePreset.OneMonth, '2026-03-31T14:25:00Z').from),
                    // 2024 is a leap year: the same date clamps a day later.
                    iso(presetRange(NavigatorRangePreset.OneMonth, '2024-03-31T14:25:00Z').from),
                    // 31 August back six months crosses a February too.
                    iso(presetRange(NavigatorRangePreset.SixMonths, '2026-08-31T00:00:00Z').from),
                    // A date that exists in both months is untouched.
                    iso(presetRange(NavigatorRangePreset.ThreeMonths, '2026-05-15T09:30:00Z').from),
                ],
                [
                    '2026-02-28T14:25:00.000Z',
                    '2024-02-29T14:25:00.000Z',
                    '2026-02-28T00:00:00.000Z',
                    '2026-02-15T09:30:00.000Z',
                ],
            );
        });

        it('rolls the year over when the month index goes negative', () => {
            assert.deepEqual(
                [
                    iso(presetRange(NavigatorRangePreset.ThreeMonths, '2026-01-15T00:00:00Z').from),
                    iso(presetRange(NavigatorRangePreset.OneYear, '2026-01-31T23:59:59Z').from),
                    iso(presetRange(NavigatorRangePreset.FiveYears, '2024-02-29T00:00:00Z').from),
                ],
                [
                    '2025-10-15T00:00:00.000Z',
                    '2025-01-31T23:59:59.000Z',
                    // Five years before a leap day is not a leap day.
                    '2019-02-28T00:00:00.000Z',
                ],
            );
        });

        it('anchors YTD at the start of the UTC year, and never returns an empty range', () => {
            const midYear = presetRange(NavigatorRangePreset.YearToDate, '2026-08-06T12:00:00Z');
            assert.equal(iso(midYear.from), '2026-01-01T00:00:00.000Z');
            assert.equal(iso(midYear.to), '2026-08-06T12:00:00.000Z');

            // On the first instant of the year the year start is the anchor itself: the preset
            // owes a range that still spans something.
            const newYear = presetRange(NavigatorRangePreset.YearToDate, '2026-01-01T00:00:00Z');
            assert.equal(newYear.to - newYear.from, 86_400);
        });

        it('measures the day presets in fixed seconds, and All means everything', () => {
            const day = presetRange(NavigatorRangePreset.OneDay, '2026-03-29T12:00:00Z');
            assert.equal(day.to - day.from, 86_400, 'a DST date does not change a UTC day');
            assert.equal(
                presetRange(NavigatorRangePreset.FiveDays, '2026-03-29T12:00:00Z').to
                - presetRange(NavigatorRangePreset.FiveDays, '2026-03-29T12:00:00Z').from,
                5 * 86_400,
            );
            assert.equal(presetRange(NavigatorRangePreset.All, '2026-03-29T12:00:00Z'), null);
        });
    });
});
