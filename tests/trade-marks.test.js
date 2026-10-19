// Executed trades on the candles: the bar a trade is marked on, what its mark says, and what the list under the
// pointer shows.
//
// The DOM double has to exist before the module paints its list, and the page is stubbed the way the legend tests
// stub it: every formatter marks its output, so a number the module formatted itself would show unmarked.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { installMiniDom } = require('./mini-dom.js');
installMiniDom();

const { TradeMarks, barOf, describeTrade, groupTradesByBar, tradeMarkers } = require('../src/chart/trade-marks.js');
const { createTranslate } = require('../src/chart/chart-host.js');

const COLORS = { buy: '#0af', sell: '#f80', unknown: '#888' };

function hostStub() {
    return {
        translate: createTranslate({ Buy: 'BUY', Sell: 'SELL', Trade: 'TRADE' }),
        formatters: {
            price: (value) => `P<${value}>`,
            volume: (value) => `V<${value}>`,
            time: (timeSec) => `T<${timeSec}>`,
        },
        notify: () => { },
    };
}

const trade = (time, side, price, volume = 1) => ({ time, side, price, volume });

function chartStub() {
    return {
        handlers: [],
        subscribeCrosshairMove(handler) { this.handlers.push(handler); },
        unsubscribeCrosshairMove(handler) { this.handlers = this.handlers.filter((h) => h !== handler); },
        move(param) { for (const handler of this.handlers) handler(param); },
    };
}

// A higher price sits nearer the top, so its y is smaller.
function seriesStub(bars) {
    return {
        data: () => bars,
        priceToCoordinate: (price) => 1000 - price,
    };
}

function markersStub() {
    return {
        painted: null,
        setMarkers(markers) { this.painted = markers; },
    };
}

// Two bars: the first spans 90..110 (y 910..890), the second 95..120.
function mount() {
    const chart = chartStub();
    const markers = markersStub();
    const container = document.createElement('div');
    const marks = new TradeMarks({
        chart,
        series: seriesStub([{ time: 100, high: 110, low: 90 }, { time: 160, high: 120, low: 95 }]),
        markers,
        container,
        host: hostStub(),
        colors: COLORS,
    });

    return { chart, markers, container, marks };
}

describe('the bar a trade is marked on', () => {
    it('is the last bar that opened at or before the trade', () => {
        const bars = [100, 160, 220];

        assert.equal(barOf(100, bars), 100);
        assert.equal(barOf(159, bars), 100);
        assert.equal(barOf(160, bars), 160);
        assert.equal(barOf(999, bars), 220);
        assert.equal(barOf(99, bars), undefined);
    });

    it('takes the trades of each bar, and none from before the first bar', () => {
        const groups = groupTradesByBar(
            [trade(99, 'buy', 1), trade(130, 'buy', 2), trade(150, 'sell', 3), trade(170, 'buy', 4)],
            [100, 160]);

        assert.deepEqual([...groups.keys()], [100, 160]);
        assert.deepEqual(groups.get(100).map((t) => t.price), [2, 3]);
        assert.deepEqual(groups.get(160).map((t) => t.price), [4]);
    });
});

describe('what a mark says', () => {
    it('marks the buys under a bar, the sells over it and a trade of no known side on it', () => {
        const groups = groupTradesByBar([trade(130, 'sell', 3), trade(110, 'buy', 2), trade(140, null, 5)], [100]);

        assert.deepEqual(tradeMarkers(groups, COLORS, (value) => `P<${value}>`), [
            { time: 100, position: 'belowBar', color: '#0af', shape: 'arrowUp', text: 'P<2>' },
            { time: 100, position: 'aboveBar', color: '#f80', shape: 'arrowDown', text: 'P<3>' },
            { time: 100, position: 'inBar', color: '#888', shape: 'circle', text: 'P<5>' },
        ]);
    });

    it('counts several trades of one side on one bar instead of naming a price', () => {
        const groups = groupTradesByBar([trade(110, 'sell', 2), trade(120, 'sell', 2.5)], [100]);

        assert.deepEqual(tradeMarkers(groups, COLORS, String).map((marker) => marker.text), ['×2']);
    });

    it('lays the marks out in the order of their bars, whatever order the trades came in', () => {
        const groups = groupTradesByBar([trade(170, 'buy', 4), trade(110, 'buy', 2)], [100, 160]);

        assert.deepEqual(tradeMarkers(groups, COLORS, String).map((marker) => marker.time), [100, 160]);
    });

    it('words a trade of the list through the page', () => {
        assert.equal(describeTrade(trade(130, 'sell', 3, 0.5), hostStub()), 'SELL V<0.5> @ P<3> · T<130>');
        assert.equal(describeTrade(trade(130, 'buy', 3, 0.5), hostStub()), 'BUY V<0.5> @ P<3> · T<130>');
        assert.equal(describeTrade(trade(130, null, 3, 0.5), hostStub()), 'TRADE V<0.5> @ P<3> · T<130>');
    });
});

describe('trades marked on a chart', () => {
    it('paints a mark for each side of each bar and tells the trades it marked on a bar', () => {
        const { markers, marks } = mount();

        marks.setTrades([trade(110, 'buy', 100), trade(120, 'sell', 105), trade(170, 'buy', 101), trade(50, 'buy', 99)]);

        assert.equal(markers.painted.length, 3);
        assert.deepEqual(marks.barTrades(100).map((marked) => marked.time), [110, 120]);
        assert.deepEqual(marks.barTrades(160).map((marked) => marked.time), [170]);
        assert.deepEqual(marks.barTrades(130), [], 'no bar opens then');
    });

    it('lists the sells of a bar while the pointer is over the bar', () => {
        const { chart, container, marks } = mount();
        marks.setTrades([trade(110, 'buy', 100, 1), trade(120, 'sell', 105, 2)]);

        chart.move({ time: 100, point: { x: 50, y: 880 } });

        const tip = container.querySelector('.chart-trade-tip');
        assert.ok(tip !== null, 'the list opens in the element the marks were given');
        assert.equal(tip.hidden, false);
        assert.equal(tip.textContent, 'SELL V<2> @ P<105> · T<120>');
        assert.equal(tip.childNodes[0].style.color, '#f80');
    });

    it('lists the buys under the bar, and nothing between its marks or off the chart', () => {
        const { chart, container, marks } = mount();
        marks.setTrades([trade(110, 'buy', 100, 1), trade(120, 'sell', 105, 2)]);

        chart.move({ time: 100, point: { x: 50, y: 915 } });
        const tip = container.querySelector('.chart-trade-tip');
        assert.equal(tip.textContent, 'BUY V<1> @ P<100> · T<110>');

        chart.move({ time: 100, point: { x: 50, y: 900 } });
        assert.equal(tip.hidden, true, 'the pointer on the body of a bar is on no mark');

        chart.move({ time: 100, point: { x: 50, y: 915 } });
        chart.move({ time: null, point: null });
        assert.equal(tip.hidden, true, 'the pointer that left the chart is on no mark');
    });

    it('repaints the marks in the colours of another theme', () => {
        const { markers, marks } = mount();
        marks.setTrades([trade(110, 'buy', 100)]);

        marks.setColors({ buy: '#111', sell: '#222', unknown: '#333' });

        assert.equal(markers.painted[0].color, '#111');
        assert.deepEqual(marks.colors(), { buy: '#111', sell: '#222', unknown: '#333' });
    });

    it('takes its marks and its list away and stops following the pointer once disposed', () => {
        const { chart, container, markers, marks } = mount();
        marks.setTrades([trade(120, 'sell', 105)]);
        chart.move({ time: 100, point: { x: 50, y: 880 } });

        marks.dispose();

        assert.deepEqual(markers.painted, []);
        assert.equal(chart.handlers.length, 0);
        assert.equal(container.querySelector('.chart-trade-tip'), null);
    });
});
