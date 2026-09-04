const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    ChartType,
    ChartTypeSwitcher,
    allChartTypes,
    defaultChartTypePalette,
} = require('../src/chart/chart-type-switcher.js');
const { standaloneHost } = require('../src/chart/chart-host.js');

function candle(time, close) {
    return { time, open: close, high: close + 1, low: close - 1, close };
}

function seriesMock(definition = null, options = {}) {
    return {
        definition,
        data: [],
        updates: [],
        // The switcher carries the outgoing series' priceFormat onto the one it creates, so a
        // stand-in has to answer for its options the way a real series does.
        options() { return options; },
        setData(data) { this.data = [...data]; },
        update(point) { this.updates.push(point); },
    };
}

function chartMock() {
    return {
        added: [],
        removed: [],
        addSeries(definition, options) {
            const series = seriesMock(definition, options);
            this.added.push(series);
            return series;
        },
        removeSeries(series) { this.removed.push(series); },
    };
}

// Everything the page supplies, with the parts a test does not care about answered by the
// standalone host. Candles to start with, because every case here switches away from them.
function switcherOn(chart, overrides = {}) {
    return new ChartTypeSwitcher({
        chart,
        series: seriesMock(),
        initialType: ChartType.Candle,
        availableTypes: allChartTypes,
        palette: defaultChartTypePalette,
        host: standaloneHost,
        ...overrides,
    });
}

describe('ChartTypeSwitcher', () => {
    it('shares one stable streaming Renko view with indicators', () => {
        const chart = chartMock();
        const initial = seriesMock();
        const source = [
            candle(100, 10), candle(200, 12), candle(300, 14), candle(400, 16),
        ];
        const switcher = switcherOn(chart, { series: initial });
        switcher.setRawCandles(source);

        const renko = switcher.switchType(ChartType.Renko);
        const derived = switcher.getIndicatorCandles();
        const committedTimes = derived.slice(0, 4).map(point => point.time);
        assert.ok(renko.options().boxSize > 0);
        assert.equal(derived, switcher.getIndicatorCandles());

        const replacement = candle(400, 13);
        source[source.length - 1] = replacement;
        switcher.updatePrice(replacement);

        assert.equal(renko.updates.length, 1);
        assert.equal(switcher.getIndicatorCandles(), derived);
        assert.deepEqual(
            derived.slice(0, 4).map(point => point.time),
            committedTimes,
        );

        switcher.switchType(ChartType.Candle);
        assert.equal(switcher.getIndicatorCandles(), source);
    });

    it('tells subscribers which series draws the bars now, until they unsubscribe', () => {
        const chart = chartMock();
        const switcher = switcherOn(chart);
        switcher.setRawCandles([candle(100, 10), candle(200, 12)]);

        const seen = [];
        const unsubscribe = switcher.onSeriesChanged((series, type) => seen.push({ series, type }));

        const line = switcher.switchType(ChartType.Line);
        assert.deepEqual(seen.map(entry => entry.type), [ChartType.Line]);
        assert.equal(seen[0].series, line);
        assert.equal(switcher.getCurrentSeries(), line);
        assert.equal(switcher.getCurrentType(), ChartType.Line);

        // The type already drawn creates no series, so there is nothing to re-aim at and no
        // subscriber to tell - a page that re-clicks the active button must not rebuild its layers.
        assert.equal(switcher.switchType(ChartType.Line), line);
        assert.equal(seen.length, 1);

        unsubscribe();
        const area = switcher.switchType(ChartType.Area);
        assert.equal(switcher.getCurrentSeries(), area);
        assert.equal(seen.length, 1);
    });

    it('carries the outgoing series priceFormat onto every series it creates', () => {
        const chart = chartMock();
        const priceFormat = { precision: 4, minMove: 0.0001 };
        const switcher = switcherOn(chart, { series: seriesMock(null, { priceFormat }) });
        switcher.setRawCandles([candle(100, 10), candle(200, 12), candle(300, 14)]);

        // Recreating a series drops the instrument's precision, and the axis then reads "0.44"
        // where it read "0.4438". The format has to survive every switch, not only the first.
        assert.deepEqual(switcher.switchType(ChartType.Line).options().priceFormat, priceFormat);
        assert.deepEqual(switcher.switchType(ChartType.Renko).options().priceFormat, priceFormat);
        assert.deepEqual(switcher.switchType(ChartType.Bar).options().priceFormat, priceFormat);
    });

    it('refuses a type the page does not offer and says so through the host', () => {
        const chart = chartMock();
        const messages = [];
        const switcher = switcherOn(chart, {
            availableTypes: [ChartType.Candle, ChartType.Line],
            host: { ...standaloneHost, notify: (message, kind) => messages.push({ message, kind }) },
        });
        switcher.setRawCandles([candle(100, 10), candle(200, 12)]);

        // A stored layout naming a type this page has stopped offering: the switcher keeps drawing
        // what it draws, and the page hears about it rather than being left with a dead control.
        const current = switcher.getCurrentSeries();
        assert.equal(switcher.switchType(ChartType.Renko), current);
        assert.equal(switcher.getCurrentType(), ChartType.Candle);
        assert.deepEqual(chart.added, []);
        assert.deepEqual(chart.removed, []);
        assert.deepEqual(messages, [
            { message: 'Chart type renko is not available.', kind: 'warning' },
        ]);
    });
});
