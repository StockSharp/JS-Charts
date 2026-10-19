// What the legend names besides the candle and the indicators: the chart's own title, lines the page draws itself,
// and the trades marked on the chart.
//
// Same page stub as the refresh tests: every formatter marks its output, every caption goes through the dictionary.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');
const dom = installMiniDom();

const { ChartLegend } = require('../src/chart/chart-legend.js');
const { createTranslate } = require('../src/chart/chart-host.js');

function hostStub() {
    return {
        translate: createTranslate({ Buy: 'BUY', Sell: 'SELL', Trade: 'TRADE' }),
        formatters: {
            price: (value) => `P<${value.toFixed(2)}>`,
            volume: (value) => `V<${value}>`,
            time: (timeSec) => `T<${timeSec}>`,
        },
        notify: () => { },
    };
}

function bar(time, close) {
    return { time, open: close - 1, high: close + 2, low: close - 2, close };
}

function chartStub() {
    return {
        handlers: [],
        subscribeCrosshairMove(handler) { this.handlers.push(handler); },
        clearCrosshairPosition() { },
        move(param) { for (const handler of this.handlers) handler(param); },
    };
}

function mountLegend() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const chart = chartStub();
    const legend = new ChartLegend({
        container,
        host: hostStub(),
        paneHost: { getValuesElement: () => null },
        chartTypes: [],
        menuLayer: () => document.body,
    });
    legend.init(chart);
    legend.setRawCandles([bar(100, 10), bar(160, 11)]);
    return { legend, chart, container };
}

beforeEach(() => {
    document.body.childNodes = [];
    dom.document.clearListeners();
});

describe('the title of the chart', () => {
    it('stands ahead of the candle prices', () => {
        const { legend, container } = mountLegend();

        legend.setTitle('BTCUSDT@BNB');

        assert.equal(container.querySelector('[data-ohlc="title"]').textContent, 'BTCUSDT@BNB');
    });

    it('is nothing until the page names one', () => {
        const { container } = mountLegend();

        assert.equal(container.querySelector('[data-ohlc="title"]').textContent, '');
    });
});

describe('the lines the page draws itself', () => {
    const equity = { name: 'Equity', color: '#c0f', valueAt: (time) => (time === 100 ? 5 : undefined) };

    it('are named with their value at the bar under the pointer, in their own colour', () => {
        const { legend, chart, container } = mountLegend();
        legend.setLines([equity]);

        chart.move({ time: 100, point: { x: 1, y: 1 } });

        const row = container.querySelector('.legend-lines').querySelector('.legend-line');
        assert.equal(row.textContent, 'Equity P<5.00>');
        assert.equal(row.style.color, '#c0f');
    });

    it('say they have no value at a bar where they have none', () => {
        const { legend, container } = mountLegend();

        legend.setLines([equity]);

        assert.equal(container.querySelector('.legend-lines').querySelector('.legend-line').textContent, 'Equity --',
            'at rest the legend reads the newest bar, where this line has no value');
    });

    it('carry no edit or remove button: they are no study of the indicator engine', () => {
        const { legend, container } = mountLegend();

        legend.setLines([equity, { name: 'SMA', color: '#fa0', valueAt: () => 10.5 }]);

        const lines = container.querySelector('.legend-lines');
        assert.equal(lines.querySelectorAll('.legend-line').length, 2);
        assert.equal(lines.querySelectorAll('.legend-edit-btn, .legend-remove-btn').length, 0);
    });
});

describe('the trades marked on the chart', () => {
    // A buy and a sell on the first bar, two buys on the second.
    const byBar = new Map([
        [100, [{ time: 110, side: 'buy', price: 10, volume: 1 }, { time: 120, side: 'sell', price: 12, volume: 2 }]],
        [160, [{ time: 170, side: 'buy', price: 10, volume: 1 }, { time: 180, side: 'buy', price: 13, volume: 2 }]],
    ]);
    const marks = {
        barTrades: (time) => byBar.get(time) ?? [],
        colors: () => ({ buy: '#0af', sell: '#f80', unknown: '#888' }),
    };

    const entries = (container) => container.querySelector('.legend-trades').childNodes;

    it('are named at the bar under the pointer with their volume and price, each side in the colour of its marks', () => {
        const { legend, chart, container } = mountLegend();
        legend.setTradeMarks(marks);

        chart.move({ time: 100, point: { x: 1, y: 1 } });

        assert.deepEqual(entries(container).map((entry) => entry.textContent), ['▲ BUY V<1> @ P<10.00>', '▼ SELL V<2> @ P<12.00>']);
        assert.deepEqual(entries(container).map((entry) => entry.style.color), ['#0af', '#f80']);
    });

    it('say how many trades a side has on the bar, their volume and its average price', () => {
        const { legend, chart, container } = mountLegend();
        legend.setTradeMarks(marks);

        chart.move({ time: 160, point: { x: 1, y: 1 } });

        assert.deepEqual(entries(container).map((entry) => entry.textContent), ['▲ BUY ×2 V<3> @ P<12.00>']);
    });

    it('follow the pointer to a bar without trades, keeping their row', () => {
        const { legend, chart, container } = mountLegend();
        legend.setTradeMarks({ barTrades: (time) => (time === 100 ? byBar.get(100) : []), colors: marks.colors });

        chart.move({ time: 100, point: { x: 1, y: 1 } });
        chart.move({ time: 160, point: { x: 1, y: 1 } });

        const row = container.querySelector('.legend-trades');
        assert.equal(row.childNodes.length, 0);
        assert.equal(row.hidden, false, 'the row keeps its line, so the rows under it do not jump');
    });

    it('are those of the newest bar while the pointer is off the chart', () => {
        const { legend, chart, container } = mountLegend();
        legend.setTradeMarks(marks);

        chart.move({ time: 100, point: { x: 1, y: 1 } });
        chart.move({ time: null, point: null });

        assert.deepEqual(entries(container).map((entry) => entry.textContent), ['▲ BUY ×2 V<3> @ P<12.00>']);
    });

    it('take their row away once the page takes the marks away', () => {
        const { legend, container } = mountLegend();
        legend.setTradeMarks(marks);

        legend.setTradeMarks(null);

        const row = container.querySelector('.legend-trades');
        assert.equal(row.childNodes.length, 0);
        assert.equal(row.hidden, true);
    });
});
