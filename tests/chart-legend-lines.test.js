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
    const marks = {
        counts: () => ({ buy: 2, sell: 1, unknown: 0 }),
        colors: () => ({ buy: '#0af', sell: '#f80', unknown: '#888' }),
    };

    it('are counted for each side that has any, in the colour of its marks', () => {
        const { legend, container } = mountLegend();

        legend.setTradeMarks(marks);

        const sides = container.querySelector('[data-ohlc="trades"]').childNodes;
        assert.deepEqual(sides.map((side) => side.textContent), ['▲ BUY 2', '▼ SELL 1']);
        assert.deepEqual(sides.map((side) => side.style.color), ['#0af', '#f80']);
    });

    it('are counted no more once the page takes the marks away', () => {
        const { legend, container } = mountLegend();
        legend.setTradeMarks(marks);

        legend.setTradeMarks(null);

        assert.equal(container.querySelector('[data-ohlc="trades"]').textContent, '');
    });
});
