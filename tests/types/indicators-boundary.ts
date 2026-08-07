// The chart and the indicator package each declare their own `Time`, candle and line-style
// types, and they are matched by shape rather than by identity. That is what lets a caller pass
// the chart's candles straight into an indicator with no conversion -- and it is also what would
// let the two drift apart in silence: widen one side's `Time` to accept a string, or add a
// required field to one candle, and nothing would complain until a consumer's build broke.
//
// So assert the compatibility here, in both directions. This file emits no runtime code; it
// fails the typecheck instead.

import type { CandlestickData, LineStyleValue, Time } from '../../src/core/chart-api.js';
import type {
    CandlestickData as PackageCandlestickData,
    LineStyleValue as PackageLineStyleValue,
    Time as PackageTime,
} from '@stocksharp/indicators';

declare const chartTime: Time;
declare const packageTime: PackageTime;
const timeIntoPackage: PackageTime = chartTime;
const timeIntoChart: Time = packageTime;

// One direction only, and deliberately: the package's candle carries an optional `volume` the
// chart's does not, so a chart candle is a valid indicator input while the reverse is not.
declare const chartCandle: CandlestickData;
const candleIntoPackage: PackageCandlestickData = chartCandle;

declare const chartLineStyle: LineStyleValue;
declare const packageLineStyle: PackageLineStyleValue;
const lineStyleIntoPackage: PackageLineStyleValue = chartLineStyle;
const lineStyleIntoChart: LineStyleValue = packageLineStyle;

void timeIntoPackage;
void timeIntoChart;
void candleIntoPackage;
void lineStyleIntoPackage;
void lineStyleIntoChart;
