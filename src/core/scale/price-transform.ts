export const InternalPriceScaleMode = {
    Normal: 0,
    Logarithmic: 1,
    Percentage: 2,
    IndexedTo100: 3,
} as const;

export function priceToScale(value: number, mode: number, baseValue = 1): number {
    switch (mode) {
        case InternalPriceScaleMode.Logarithmic:
            return value > 0 ? Math.log(value) : NaN;
        // |base|, guarding only zero. Requiring a positive base made every relative mode return
        // NaN for a series that never goes above zero -- P&L, a spread, funding -- so autoscale
        // skipped it and the fallback base of 1 threw the line thousands of pixels off screen.
        // Dividing by the magnitude is what the canonical transform does.
        case InternalPriceScaleMode.Percentage:
            return baseValue !== 0 ? (value / Math.abs(baseValue) - 1) * 100 : NaN;
        case InternalPriceScaleMode.IndexedTo100:
            return baseValue !== 0 ? value / Math.abs(baseValue) * 100 : NaN;
        default:
            return value;
    }
}

export function scaleToPrice(value: number, mode: number, baseValue = 1): number {
    switch (mode) {
        case InternalPriceScaleMode.Logarithmic:
            return Math.exp(value);
        case InternalPriceScaleMode.Percentage:
            return baseValue !== 0 ? Math.abs(baseValue) * (1 + value / 100) : NaN;
        case InternalPriceScaleMode.IndexedTo100:
            return baseValue !== 0 ? Math.abs(baseValue) * value / 100 : NaN;
        default:
            return value;
    }
}

export function isRelativePriceScale(mode: number): boolean {
    return mode === InternalPriceScaleMode.Percentage
        || mode === InternalPriceScaleMode.IndexedTo100;
}
