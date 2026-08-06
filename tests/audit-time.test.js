const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    TradingCalendar,
    TradingSessionKind,
} = require('../src/index.js');
const { TimeAxisFormatter } = require('../src/time/time-axis-formatter.js');
const {
    PointFigureDataRuntime,
    RenkoDataRuntime,
} = require('../src/series/derived-data.js');

const utc = (year, month, day, hour = 0, minute = 0, second = 0) => (
    Date.UTC(year, month - 1, day, hour, minute, second) / 1_000
);

// Runs one public query and turns an escaping throw into reportable data instead
// of aborting the test, so a single assertion can list every query that broke.
function probe(label, call) {
    try {
        return { label, value: call() };
    } catch (error) {
        return { label, error: `${error.constructor.name}: ${error.message}` };
    }
}

describe('audit 2.10 — auto box size for Renko / Point & Figure ignores the price scale', () => {
    it('scales the fallback box to the instrument price on a single-bar reset', () => {
        const bar = (time, close) => ({ time, open: close, high: close, low: close, close });

        // A single bar is the normal start of a live stream: addSeries('Renko')
        // without boxSize resets on it, and reset() pins the box for good.
        const renkoHigh = new RenkoDataRuntime();
        renkoHigh.reset([bar(1_000, 6_000)]);
        renkoHigh.update(bar(1_060, 6_015));
        const highBricks = renkoHigh.data.length;

        const renkoLow = new RenkoDataRuntime();
        renkoLow.reset([bar(1_000, 0.0001)]);
        renkoLow.update(bar(1_060, 0.0002));
        const lowBricks = renkoLow.data.length;

        const pointFigureLow = new PointFigureDataRuntime();
        pointFigureLow.reset([bar(1_000, 0.0001)]);
        pointFigureLow.update(bar(1_060, 0.0002));
        const lowColumns = pointFigureLow.data.length;

        assert.deepEqual(
            {
                // 6000 -> 6015 is a 0.25% move; it must stay a handful of bricks.
                renkoBricksFor0p25PercentMoveAt6000:
                    highBricks >= 1 && highBricks <= 50 ? 'sane' : `${highBricks} bricks`,
                // 0.0001 -> 0.0002 doubles the price; it cannot be invisible.
                renkoBricksForDoublingAt0p0001:
                    lowBricks >= 1 ? 'sane' : `${lowBricks} bricks`,
                pointFigureColumnsForDoublingAt0p0001:
                    lowColumns >= 1 ? 'sane' : `${lowColumns} columns`,
            },
            {
                renkoBricksFor0p25PercentMoveAt6000: 'sane',
                renkoBricksForDoublingAt0p0001: 'sane',
                pointFigureColumnsForDoublingAt0p0001: 'sane',
            },
            'the fallback box must follow the price magnitude, not an absolute 0.025 / 0.02',
        );
    });
});
