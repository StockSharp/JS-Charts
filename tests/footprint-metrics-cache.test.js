// The footprint metrics cache is bounded: a long session must not accumulate one entry per bar.

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

describe('footprint metrics cache', () => {
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

