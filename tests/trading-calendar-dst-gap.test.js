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

describe('session boundary inside a DST spring-forward gap', () => {
    it('keeps every public query alive for a 24x7 Havana schedule across 2026-03-08', () => {
        // Cuba springs forward at 00:00 local on the second Sunday of March, so
        // 2026-03-08 00:00 simply does not exist there. A 24x7 schedule (open
        // 00:00, close 00:00 next day) is a legitimate configuration and lands
        // both its open and its close on exactly that instant.
        const calendar = new TradingCalendar({
            timeZone: 'America/Havana',
            sessions: [{
                id: 'around-the-clock',
                kind: TradingSessionKind.Regular,
                weekdays: [1, 2, 3, 4, 5, 6, 7],
                open: { hour: 0, minute: 0 },
                close: { hour: 0, minute: 0 },
                closeDayOffset: 1,
            }],
        });

        const results = [
            probe('sessionsInRange(Mar 6..12)', () => calendar.sessionsInRange({
                from: utc(2026, 3, 6),
                to: utc(2026, 3, 12),
            })),
            probe('sessionAt(Mar 10 06:00 UTC)', () => calendar.sessionAt(utc(2026, 3, 10, 6))),
            probe('isTradingTime(Mar 10 06:00 UTC)', () => calendar.isTradingTime(utc(2026, 3, 10, 6))),
            probe('nextSession(Mar 6 06:00 UTC)', () => calendar.nextSession(utc(2026, 3, 6, 6))),
        ];

        assert.deepEqual(
            results.filter((result) => result.error !== undefined)
                .map((result) => `${result.label} -> ${result.error}`),
            [],
            'a non-existent local time on one date must not escape as RangeError from public queries',
        );

        // The nonexistent boundary belongs at the first instant that does exist
        // after the gap: 2026-03-08 01:00 Havana == 05:00 UTC. The next day is
        // already on DST, so its 00:00 boundary is 2026-03-09 04:00 UTC.
        const sessions = results[0].value;
        const gapDay = sessions.find((session) => session.tradingDate === '2026-03-08');
        assert.notEqual(gapDay, undefined, 'the spring-forward date must still produce a session');
        assert.deepEqual(
            [gapDay.openTime, gapDay.closeTime],
            [utc(2026, 3, 8, 5), utc(2026, 3, 9, 4)],
            'the boundary inside the gap must clamp forward to the first valid instant',
        );
        assert.deepEqual(
            sessions.map((session) => session.tradingDate).filter((date) => date >= '2026-03-06'),
            ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11'],
            'one degenerate date must not blank out the whole scanned window',
        );
    });
});
