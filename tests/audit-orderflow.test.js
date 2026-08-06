// Failing-by-design proofs for AUDIT.md findings 1.4, 2.11, 3.10 and 3.11.
//
// Every assertion here states the behaviour the audit says is owed, so each one stays red until the
// corresponding defect is fixed. Nothing in src/ is touched and no existing test file is modified.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { ChartTypeSwitcher } = require('../src/chart/chart-type-switcher.js');
const {
    ExactVolumeProfileAccumulator,
    ExactVolumeProfileSeries,
    FootprintDetailLevel,
    FootprintSeries,
    OrderFlowDataMode,
    VolumeProfileRangeMode,
    calculateVolumeProfile,
    defaultExactVolumeProfileSeriesOptions,
    defaultFootprintSeriesOptions,
} = require('../src/orderflow/index.js');

// ---------------------------------------------------------------------------------------------
// 1.4 — Heikin-Ashi live update must keep haOpen fixed for the whole bar
// ---------------------------------------------------------------------------------------------

function seriesMock() {
    return {
        data: [],
        updates: [],
        setData(data) { this.data = [...data]; },
        update(point) { this.updates.push(point); },
    };
}

function chartMock() {
    return {
        addSeries() { return seriesMock(); },
        removeSeries() { },
    };
}

// Canonical Heikin-Ashi, the textbook definition: haOpen of a bar is the midpoint of the *previous*
// bar's HA open/close and never moves again while that bar is forming.
function canonicalHeikinAshi(candles) {
    const result = [];
    let prevOpen = candles[0].open;
    let prevClose = candles[0].close;
    for (const c of candles) {
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen = (prevOpen + prevClose) / 2;
        result.push({
            time: c.time,
            open: haOpen,
            high: Math.max(c.high, haOpen, haClose),
            low: Math.min(c.low, haOpen, haClose),
            close: haClose,
        });
        prevOpen = haOpen;
        prevClose = haClose;
    }
    return result;
}

describe('AUDIT 2.11 — volume-profile incremental replace-last', () => {
    it('cancels a large last-bar contribution without leaving float residue', () => {
        // A tiny surviving volume at 100 from the first bar, then a huge contribution from the last
        // bar at the same price, then a replacement of that last bar that drops the price entirely.
        const first = {
            dataMode: OrderFlowDataMode.Exact,
            time: 60,
            open: 100,
            high: 101,
            low: 100,
            close: 100,
            levels: [
                { price: 100, bidVolume: 0.1, askVolume: 0 },
                { price: 101, bidVolume: 0, askVolume: 2 },
            ],
        };
        const last = {
            dataMode: OrderFlowDataMode.Exact,
            time: 120,
            open: 100,
            high: 101,
            low: 100,
            close: 101,
            levels: [
                { price: 100, bidVolume: 1e9, askVolume: 0 },
                { price: 101, bidVolume: 0, askVolume: 3 },
            ],
        };
        const replacement = {
            ...last,
            levels: [{ price: 101, bidVolume: 0, askVolume: 3 }],
        };

        const accumulator = new ExactVolumeProfileAccumulator(profileOptions);
        accumulator.reset([first]);
        accumulator.push(last);
        const updated = accumulator.push(replacement);
        const batch = calculateVolumeProfile([first, replacement], profileOptions);

        assert.equal(updated.kind, 'update');
        assert.equal(
            updated.profile.levels.find(level => level.price === 100).bidVolume,
            batch.levels.find(level => level.price === 100).bidVolume,
            'the surviving 0.1 must come back exactly after +1e9/-1e9 cancels; '
            + 'the tolerance is computed from the near-zero result instead of the cancelled magnitudes',
        );
        assert.deepEqual(
            updated.profile,
            batch,
            'incremental replace-last must equal the batch profile for the same bars',
        );
    });
});

// ---------------------------------------------------------------------------------------------
// 3.10 — the footprint metrics cache must be bounded
// ---------------------------------------------------------------------------------------------

function silentCanvas() {
    const noop = () => { };
    return {
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'center',
        textBaseline: 'middle',
        fillRect: noop,
        strokeRect: noop,
        fillText: noop,
        beginPath: noop,
        moveTo: noop,
        lineTo: noop,
        closePath: noop,
        stroke: noop,
        fill: noop,
    };
}

// `dataMode` is read exactly once per metrics calculation (normalizeFootprintBar) and by nothing
// else on the footprint draw path, so counting reads counts cache misses.
function countingFootprintBar() {
    let reads = 0;
    const bar = {
        get dataMode() { reads++; return OrderFlowDataMode.Exact; },
        time: 60,
        open: 100,
        high: 102,
        low: 100,
        close: 101,
        levels: [
            { price: 100, bidVolume: 10, askVolume: 0 },
            { price: 101, bidVolume: 4, askVolume: 16 },
            { price: 102, bidVolume: 2, askVolume: 8 },
        ],
    };
    return { bar, metricsCalculations: () => reads };
}

function drawFootprint(bar, imbalanceRatio) {
    FootprintSeries.renderer.draw({
        target: silentCanvas(),
        data: [bar],
        allData: [bar],
        options: {
            ...defaultFootprintSeriesOptions,
            tickSize: 1,
            detailLevel: FootprintDetailLevel.Numbers,
            imbalanceRatio,
        },
        priceRange: { min: 99, max: 103 },
        visibleTimeRange: { from: 0, to: 180 },
        pane: { left: 0, right: 200, top: 0, bottom: 200, width: 200, height: 200 },
        theme: {
            fontFamily: 'sans-serif',
            textColor: '#ffffff',
            horizontalGridColor: '#222222',
            verticalGridColor: '#222222',
        },
        barSpacing: 80,
        metadata: {},
        timeToCoordinate: () => 100,
        priceToCoordinate: price => (103 - price) * 16,
    });
}

describe('AUDIT 3.10 — footprint metrics cache', () => {
    it('does not retain every options combination ever applied to a bar', () => {
        const { bar, metricsCalculations } = countingFootprintBar();
        const combinations = 2000;
        const first = 1;

        drawFootprint(bar, first);
        assert.equal(metricsCalculations(), 1, 'the first draw calculates metrics once');
        drawFootprint(bar, first);
        assert.equal(metricsCalculations(), 1,
            'redrawing with the same options is served from the cache');

        // Dragging the imbalanceRatio slider: one fresh options key per frame.
        for (let index = 1; index < combinations; index++)
            drawFootprint(bar, first + index * 0.001);
        assert.equal(metricsCalculations(), combinations,
            'each distinct options combination is calculated once');

        drawFootprint(bar, first);
        assert.ok(
            metricsCalculations() > combinations,
            `a bounded metrics cache must have dropped the oldest of ${combinations} options `
            + `combinations held for one bar, forcing a recalculation; instead all of them are still `
            + `cached (metrics calculated ${metricsCalculations()} times, expected more than `
            + `${combinations})`,
        );
    });
});

// ---------------------------------------------------------------------------------------------
// 3.11 — a dense volume profile must still render
// ---------------------------------------------------------------------------------------------

