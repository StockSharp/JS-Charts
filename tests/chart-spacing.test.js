const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { calculateBarStepPx } = require('../src/series-spacing.js');

describe('chart bar spacing', () => {
    it('uses dense candles instead of a sparse Fractals overlay', () => {
        const candles = Array.from({ length: 181 }, (_, i) => ({ time: i * 60 }));
        const fractals = [0, 30, 60, 90, 120, 180].map(i => ({ time: i * 60 }));
        const series = [
            { kind: 'Candlestick', points: candles },
            { kind: 'Line', points: fractals },
        ];

        const step = calculateBarStepPx(series, 180 * 60, 1_440);
        assert.equal(step, 8);
    });

    it('still derives spacing when only a sparse series exists', () => {
        const sparse = [0, 60, 120].map(time => ({ time }));
        assert.equal(calculateBarStepPx([{ kind: 'Line', points: sparse }], 120, 600), 300);
    });

    it('returns a stable fallback for unusable data', () => {
        assert.equal(calculateBarStepPx([], 0, 600), 6);
        assert.equal(calculateBarStepPx([{ kind: 'Line', points: [{ time: 1 }] }], 10, 600), 6);
    });
});

describe('the bar step is a dense in-session slot, not a session-gap average', () => {
    it('ignores the overnight gap so neighbouring candle bodies cannot overlap', () => {
        // Two 6.5-hour sessions of 5-minute bars, one calendar day apart — the default Continuous
        // mode, which is what an equities chart actually looks like.
        const barSeconds = 300;
        const barsPerSession = 78;
        const gapped = [];
        for (let session = 0; session < 2; session++) {
            const sessionStart = session * 24 * 3600;
            for (let i = 0; i < barsPerSession; i++) gapped.push({ time: sessionStart + i * barSeconds });
        }
        const plotWidth = 1_000;
        const visibleSpan = gapped[gapped.length - 1].time - gapped[0].time;
        const denseSlotPx = (barSeconds / visibleSpan) * plotWidth;

        // Control: the same bar count and the same span, with the gap closed up. The estimator is
        // exact for a uniform series, so only the gap can move the number.
        const uniform = Array.from({ length: gapped.length }, (_, i) => ({ time: i * barSeconds }));
        const uniformSpan = uniform[uniform.length - 1].time - uniform[0].time;
        const uniformStep = calculateBarStepPx([{ kind: 'Candlestick', points: uniform }], uniformSpan, plotWidth);
        assert.ok(Math.abs(uniformStep - (barSeconds / uniformSpan) * plotWidth) < 1e-9,
            `control: a gapless series must report its own slot, got ${uniformStep}`);

        const step = calculateBarStepPx([{ kind: 'Candlestick', points: gapped }], visibleSpan, plotWidth);
        // src/series/built-in-renderers.ts:111 — a candle body is 0.72 of the reported step.
        const bodyPx = Math.max(1, step * 0.72);

        assert.deepEqual({
            stepMatchesDenseSlot: Math.abs(step - denseSlotPx) <= denseSlotPx * 0.05,
            bodyFitsItsSlot: bodyPx <= denseSlotPx,
        }, {
            stepMatchesDenseSlot: true,
            bodyFitsItsSlot: true,
        }, [
            'the session gap must not inflate the slot estimate',
            `calculateBarStepPx = ${step}px, dense in-session slot = ${denseSlotPx}px `
                + `(${(step / denseSlotPx).toFixed(2)}x too wide)`,
            `candle body = ${bodyPx}px in a ${denseSlotPx}px slot -> `
                + `${(bodyPx - denseSlotPx).toFixed(2)}px of overlap with each neighbour`,
            `control, same bar count with the gap closed up: ${uniformStep}px for its own `
                + `${(barSeconds / uniformSpan) * plotWidth}px slot`,
        ].join('\n  '));
    });
});
