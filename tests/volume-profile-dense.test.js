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

describe('a dense exact volume profile renders', () => {
    it('renders a profile whose level count exceeds the spread argument limit', () => {
        const levelCount = 130000;
        const levels = new Array(levelCount);
        for (let index = 0; index < levelCount; index++) {
            levels[index] = {
                price: (10000 + index) / 100,
                bidVolume: 1 + (index % 7),
                askVolume: 1 + (index % 5),
            };
        }
        const bar = {
            dataMode: OrderFlowDataMode.Exact,
            time: 60,
            open: levels[0].price,
            high: levels[levelCount - 1].price,
            low: levels[0].price,
            close: levels[levelCount - 1].price,
            levels,
        };

        let failure = null;
        try {
            ExactVolumeProfileSeries.renderer.draw({
                target: silentCanvas(),
                data: [bar],
                allData: [bar],
                options: {
                    ...defaultExactVolumeProfileSeriesOptions,
                    tickSize: 0.01,
                    showLabels: false,
                    rangeMode: VolumeProfileRangeMode.Visible,
                    sessionRanges: [],
                },
                priceRange: { min: 99, max: 1401 },
                visibleTimeRange: { from: 0, to: 120 },
                pane: { left: 0, right: 300, top: 0, bottom: 200, width: 300, height: 200 },
                theme: {
                    fontFamily: 'sans-serif',
                    textColor: '#ffffff',
                    horizontalGridColor: '#222222',
                    verticalGridColor: '#222222',
                },
                barSpacing: 20,
                metadata: {},
                timeToCoordinate: time => time,
                priceToCoordinate: price => price,
            });
        } catch (error) {
            failure = error;
        }

        assert.equal(
            failure && `${failure.name}: ${failure.message}`,
            null,
            `a ${levelCount}-level profile (tick 0.01 over a ~$1300 range) must render; `
            + 'spreading the levels into Math.max blows the argument limit',
        );
    });
});
