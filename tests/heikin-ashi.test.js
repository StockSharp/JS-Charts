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

describe('Heikin-Ashi live update', () => {
    it('keeps the forming bar\'s haOpen fixed while ticks replace the same bar', () => {
        // Two closed bars, then the bar that is still forming at time 300.
        const closed = [
            { time: 100, open: 100, high: 101, low: 99, close: 100 },
            { time: 200, open: 100, high: 106, low: 100, close: 105 },
        ];
        const forming = { time: 300, open: 105, high: 110, low: 104, close: 109 };

        const switcher = new ChartTypeSwitcher();
        switcher.init(chartMock(), seriesMock(), seriesMock());
        switcher.setRawCandles([...closed, forming]);
        const haSeries = switcher.switchType('heikin');

        // A live feed replaces the current bar on every tick: same time, new high/low/close.
        const ticks = [
            { time: 300, open: 105, high: 110, low: 104, close: 109 },
            { time: 300, open: 105, high: 111, low: 104, close: 110.5 },
            { time: 300, open: 105, high: 112, low: 104, close: 111 },
            { time: 300, open: 105, high: 113, low: 104, close: 112.5 },
            { time: 300, open: 105, high: 114, low: 104, close: 113 },
        ];

        const emitted = ticks.map((tick) => {
            switcher.updatePrice(tick);
            return haSeries.updates[haSeries.updates.length - 1];
        });
        const expected = ticks.map(tick => canonicalHeikinAshi([...closed, tick]).pop());

        assert.deepEqual(
            emitted.map(point => point.open),
            expected.map(point => point.open),
            'haOpen is fixed by the last CLOSED bar for the whole life of the forming bar; '
            + 'recomputing it from the previous tick of the same bar drags the open toward the close',
        );
        assert.deepEqual(
            emitted[emitted.length - 1],
            expected[expected.length - 1],
            'the streamed HA bar must equal a full Heikin-Ashi recalculation of the same candles',
        );
    });
});
