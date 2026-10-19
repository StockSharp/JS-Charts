// Executed trades on a candle chart: a mark for each side of every bar a trade fell in, and the trades of a mark
// listed under the pointer.
//
// A trade is marked on the bar it happened in, not at its own second: a mark placed between two bars is not drawn at
// all, and a trade seldom falls on the second a bar opens. Several trades of one side on one bar share a mark that
// says how many there are; a single one says its price. The list under the pointer tells the rest.
import type { ChartUiHost } from './chart-host.js';
import type { SeriesMarker } from '../core/chart-api.js';
import type { TradingSide } from '../trading/model.js';

/** A trade as the marks read it. */
export interface ChartTrade {
    /** When it happened, UNIX seconds. */
    time: number;
    /** Its side; null when nothing says which. */
    side: TradingSide | null;
    price: number;
    volume: number;
}

/** The colours of the marks: one for each side and one for a trade of no known side. */
export interface TradeMarkColors {
    buy: string;
    sell: string;
    unknown: string;
}

/** A bar as the marks read it: when it opens, and how far it reaches, which is where its marks sit. */
export interface TradeMarksBar {
    time: number;
    high?: number;
    low?: number;
}

/** The crosshair payload, reduced to what the marks read. */
export interface TradeMarksCrosshairParam {
    time?: number | null;
    point?: { x: number; y: number } | null;
}

/** The chart, described structurally as the legend describes it. */
export interface TradeMarksChart {
    subscribeCrosshairMove(handler: (param: TradeMarksCrosshairParam) => void): void;
    unsubscribeCrosshairMove(handler: (param: TradeMarksCrosshairParam) => void): void;
}

/** The candle series the trades are marked on. */
export interface TradeMarksSeries {
    data(): readonly TradeMarksBar[];
    priceToCoordinate(price: number): number | null;
}

/** Where the marks are drawn: the series' markers, as `createSeriesMarkers(series)` returns them. */
export interface TradeMarksPlugin {
    setMarkers(markers: SeriesMarker[]): void;
}

export interface TradeMarksOptions {
    chart: TradeMarksChart;
    series: TradeMarksSeries;
    markers: TradeMarksPlugin;
    /** The element the list of a mark's trades opens in. It sits over the chart and positions its children. */
    container: HTMLElement;
    /** Words the sides and formats the numbers of the marks and of the list. */
    host: ChartUiHost;
    colors: TradeMarkColors;
}

// The pointer's offset from the list it opens, and the margin the list keeps from the container's edges.
const TIP_OFFSET = 14;
const TIP_MARGIN = 4;

/** The bar a moment falls in: the last of the sorted bar times that is not after it; undefined before the first. */
export function barOf(time: number, barTimes: readonly number[]): number | undefined {
    let low = 0;
    let high = barTimes.length - 1;
    let found: number | undefined;

    while (low <= high) {
        const middle = (low + high) >> 1;

        if (barTimes[middle] <= time) {
            found = barTimes[middle];
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }

    return found;
}

/** The trades of each bar, keyed by the time the bar opened. A trade before the first bar has no bar to be marked on. */
export function groupTradesByBar(trades: readonly ChartTrade[], barTimes: readonly number[]): Map<number, ChartTrade[]> {
    const groups = new Map<number, ChartTrade[]>();

    for (const trade of trades) {
        const bar = barOf(trade.time, barTimes);

        if (bar === undefined)
            continue;

        const group = groups.get(bar);

        if (group === undefined)
            groups.set(bar, [trade]);
        else
            group.push(trade);
    }

    return groups;
}

/**
 * One mark per side of a bar: the buys under it, the sells over it, the trades of no known side on it. A mark for a
 * single trade says its price, a mark for several how many there are.
 */
export function tradeMarkers(
    groups: ReadonlyMap<number, readonly ChartTrade[]>,
    colors: TradeMarkColors,
    price: (value: number) => string,
): SeriesMarker[] {
    const markers: SeriesMarker[] = [];

    for (const time of [...groups.keys()].sort((a, b) => a - b)) {
        const trades = groups.get(time) ?? [];
        const sides = [
            { trades: trades.filter(t => t.side === 'buy'), position: 'belowBar', color: colors.buy, shape: 'arrowUp' },
            { trades: trades.filter(t => t.side === 'sell'), position: 'aboveBar', color: colors.sell, shape: 'arrowDown' },
            { trades: trades.filter(t => t.side === null), position: 'inBar', color: colors.unknown, shape: 'circle' },
        ] as const;

        for (const side of sides) {
            if (side.trades.length === 0)
                continue;

            const text = side.trades.length === 1 ? price(side.trades[0].price) : `×${side.trades.length}`;
            markers.push({ time, position: side.position, color: side.color, shape: side.shape, text });
        }
    }

    return markers;
}

/** What the list says of a trade: its side, size, price and time, worded and formatted by the host. */
export function describeTrade(trade: ChartTrade, host: ChartUiHost): string {
    const side = trade.side === 'buy' ? host.translate('Buy')
        : trade.side === 'sell' ? host.translate('Sell')
            : host.translate('Trade');
    const { formatters } = host;

    return `${side} ${formatters.volume(trade.volume)} @ ${formatters.price(trade.price)} · ${formatters.time(trade.time)}`;
}

/**
 * Trades marked on a candle series, and the list of a mark's trades under the pointer.
 *
 * The page hands over the trades; the bars are read from the series as it stands when they are handed over, so a
 * page that replaces the series' data hands the trades over again.
 */
export class TradeMarks {
    readonly _chart: TradeMarksChart;
    readonly _series: TradeMarksSeries;
    readonly _markers: TradeMarksPlugin;
    readonly _container: HTMLElement;
    readonly _host: ChartUiHost;
    _colors: TradeMarkColors;
    _groups: Map<number, ChartTrade[]> = new Map();
    _bars: Map<number, TradeMarksBar> = new Map();
    _tip: HTMLElement | null = null;
    _onCrosshair: ((param: TradeMarksCrosshairParam) => void) | null;

    constructor(options: TradeMarksOptions) {
        this._chart = options.chart;
        this._series = options.series;
        this._markers = options.markers;
        this._container = options.container;
        this._host = options.host;
        this._colors = options.colors;
        this._onCrosshair = (param: TradeMarksCrosshairParam) => this._showTip(param);
        this._chart.subscribeCrosshairMove(this._onCrosshair);
    }

    /** Marks the trades on the bars the series holds now. */
    setTrades(trades: readonly ChartTrade[]) {
        const bars = this._series.data();

        this._bars = new Map(bars.map(bar => [bar.time, bar]));
        this._groups = groupTradesByBar(trades, bars.map(bar => bar.time));
        this._paint();
    }

    /** Repaints the marks in other colours: the page's theme changed. */
    setColors(colors: TradeMarkColors) {
        this._colors = colors;
        this._paint();
    }

    /** The colours the marks are drawn in. */
    colors(): TradeMarkColors {
        return this._colors;
    }

    /** The trades marked on the bar that opens at `time`, in the order they were handed over; none where it has none. */
    barTrades(time: number): readonly ChartTrade[] {
        return this._groups.get(time) ?? [];
    }

    /** The trades of the mark at a point of a bar: the buys under the bar, the sells over it, the rest on it. */
    tradesAt(time: number, y: number): ChartTrade[] {
        const trades = this._groups.get(time);
        const bar = this._bars.get(time);

        if (trades === undefined || bar === undefined)
            return [];

        const lowY = bar.low === undefined ? null : this._series.priceToCoordinate(bar.low);
        const highY = bar.high === undefined ? null : this._series.priceToCoordinate(bar.high);

        if (lowY !== null && y >= lowY)
            return trades.filter(trade => trade.side === 'buy');

        if (highY !== null && y <= highY)
            return trades.filter(trade => trade.side === 'sell');

        return trades.filter(trade => trade.side === null);
    }

    /** Takes the marks and the list off the chart and stops following the pointer. */
    dispose() {
        if (this._onCrosshair !== null)
            this._chart.unsubscribeCrosshairMove(this._onCrosshair);

        this._onCrosshair = null;
        this._markers.setMarkers([]);
        this._tip?.remove();
        this._tip = null;
        this._groups = new Map();
    }

    _paint() {
        this._markers.setMarkers(tradeMarkers(this._groups, this._colors, value => this._host.formatters.price(value)));
    }

    _showTip(param: TradeMarksCrosshairParam) {
        const time = param.time ?? null;
        const point = param.point ?? null;
        const trades = time === null || point === null ? [] : this.tradesAt(time, point.y);

        if (trades.length === 0 || point === null) {
            if (this._tip !== null) this._tip.hidden = true;
            return;
        }

        const tip = this._tip ?? this._createTip();

        tip.replaceChildren(...trades.map(trade => {
            const line = document.createElement('div');
            line.className = 'chart-trade-tip-line';
            line.style.color = trade.side === 'buy' ? this._colors.buy
                : trade.side === 'sell' ? this._colors.sell
                    : this._colors.unknown;
            line.textContent = describeTrade(trade, this._host);
            return line;
        }));
        tip.hidden = false;

        // Beside the pointer, and inside the chart however near its edge the pointer is.
        const left = Math.min(point.x + TIP_OFFSET, Math.max(0, this._container.clientWidth - tip.offsetWidth - TIP_MARGIN));
        const top = Math.min(point.y + TIP_OFFSET, Math.max(0, this._container.clientHeight - tip.offsetHeight - TIP_MARGIN));
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
    }

    _createTip(): HTMLElement {
        const tip = document.createElement('div');
        tip.className = 'chart-trade-tip';
        tip.hidden = true;
        this._container.appendChild(tip);
        this._tip = tip;
        return tip;
    }
}
