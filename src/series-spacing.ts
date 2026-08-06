export interface TimedSeriesLike {
    readonly affectsTimeScale?: boolean;
    points: ReadonlyArray<{ time: number }>;
}

/**
 * Infer the pixel width of one dense time slot. Sparse overlays (Fractals,
 * ZigZag, trade signals) must never make the underlying candle slots wider.
 */
export function calculateBarStepPx(
    series: ReadonlyArray<TimedSeriesLike>,
    visibleTimeSpan: number,
    plotWidth: number,
    fallback = 6,
): number {
    if (!(visibleTimeSpan > 0) || !(plotWidth > 0)) return fallback;

    let densest = Infinity;
    for (const item of series) {
        if (item.affectsTimeScale === false || item.points.length < 2) continue;
        const first = item.points[0].time;
        const last = item.points[item.points.length - 1].time;
        if (!Number.isFinite(first) || !Number.isFinite(last)) continue;
        const timeStep = denseStep(item.points, last, first);
        const pixels = (timeStep / visibleTimeSpan) * plotWidth;
        if (Number.isFinite(pixels) && pixels > 0) densest = Math.min(densest, pixels);
    }
    return Number.isFinite(densest) ? densest : fallback;
}

/**
 * Distance between neighbouring bars inside a session, not the average across the whole series.
 *
 * Averaging (last - first) / (count - 1) folds overnight and weekend gaps into the step, which
 * inflates it structurally -- two 6.5-hour sessions already give 2.35x -- and since a candle body
 * is 0.72 x barSpacing, neighbouring in-session candles then overlap. The session-aware branch of
 * the scale already estimates with the smallest positive delta; this is the same technique applied
 * to the default Continuous mode. A low percentile rather than the strict minimum, so one
 * duplicated or out-of-order timestamp cannot collapse the whole estimate.
 */
function denseStep(points: readonly { time: number }[], last: number, first: number): number {
    const deltas: number[] = [];
    for (let i = 1; i < points.length; i += 1) {
        const delta = points[i].time - points[i - 1].time;
        if (Number.isFinite(delta) && delta > 0) deltas.push(delta);
    }
    if (deltas.length === 0) return (last - first) / Math.max(1, points.length - 1);
    deltas.sort((left, right) => left - right);
    return deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * 0.1))];
}
