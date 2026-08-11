import type {
    IndicatorDefinition,
    IndicatorParameterDefinition,
} from '@stocksharp/indicators';

type ParameterRecord = Readonly<Record<string, unknown>>;

interface LegacyParameter {
    readonly id: string;
    readonly convert?: (value: unknown) => unknown;
}

type LegacyParameterMap = Readonly<Record<string, LegacyParameter | string>>;

const LEGACY_PARAMETERS: Readonly<Record<string, LegacyParameterMap>> = Object.freeze({
    Acceleration: {
        shortLength: 'shortMaLength',
        longLength: 'longMaLength',
    },
    AwesomeOscillator: {
        shortLength: 'shortMaLength',
        longLength: 'longMaLength',
    },
    BollingerBands: {
        stdDev: 'width',
    },
    CompositeMomentum: {
        fastLength: 'emaFastLength',
        slowLength: 'emaSlowLength',
    },
    ConnorsRSI: {
        rsiLength: 'rsiPeriod',
        streakLength: 'streakRSIPeriod',
        rocLength: 'rocRSIPeriod',
    },
    ElderImpulseSystem: {
        fastLength: 'shortMaLength',
        slowLength: 'longMaLength',
    },
    Envelope: {
        percent: { id: 'shift', convert: value => (
            typeof value === 'number' ? value / 100 : value
        ) },
    },
    Ichimoku: {
        tenkan: 'tenkanLength',
        kijun: 'kijunLength',
        senkouB: 'senkouBLength',
    },
    KaufmanAdaptiveMovingAverage: {
        fastSc: 'fastSCPeriod',
        slowSc: 'slowSCPeriod',
    },
    McClellanOscillator: {
        shortLength: 'ema19Length',
        longLength: 'ema39Length',
    },
    MovingAverageConvergenceDivergence: {
        fastLength: 'shortMaLength',
        slowLength: 'longMaLength',
    },
    MovingAverageConvergenceDivergenceHistogram: {
        fastLength: 'shortMaLength',
        slowLength: 'longMaLength',
        signalLength: 'signalMaLength',
    },
    MovingAverageConvergenceDivergenceSignal: {
        shortLength: 'shortMaLength',
        longLength: 'longMaLength',
        signalLength: 'signalMaLength',
    },
    PercentagePriceOscillator: {
        shortLength: 'shortPeriod',
        longLength: 'longPeriod',
    },
    PercentagePriceOscillatorHistogram: {
        shortLength: 'shortPeriod',
        longLength: 'longPeriod',
        signalLength: 'signalMaLength',
    },
    PercentagePriceOscillatorSignal: {
        shortLength: 'shortPeriod',
        longLength: 'longPeriod',
        signalLength: 'signalMaLength',
    },
    RangeActionVerificationIndex: {
        shortLength: 'shortSmaLength',
        longLength: 'longSmaLength',
    },
    RelativeVigorIndex: {
        length: 'averageLength',
    },
    SchaffTrendCycle: {
        shortLength: 'shortMaLength',
        longLength: 'longMaLength',
        cycleLength: 'stochasticKLength',
        signalLength: 'signalMaLength',
    },
    StochasticOscillator: {
        kPeriod: 'kLength',
        dPeriod: 'dLength',
    },
});

function hasOwn(value: ParameterRecord | null | undefined, key: string): boolean {
    return value !== null && value !== undefined
        && Object.prototype.hasOwnProperty.call(value, key);
}

/** Maps a pre-2.x kind to the definition that preserves its old output shape. */
export function migrateIndicatorType(
    type: string,
    parameters: ParameterRecord | null | undefined,
): string {
    if (type === 'FastStochastic') return 'StochasticOscillator';
    if (type === 'MovingAverageConvergenceDivergence'
        && ['fastLength', 'slowLength', 'signalLength'].some(key => hasOwn(parameters, key))) {
        return 'MovingAverageConvergenceDivergenceHistogram';
    }
    if (type === 'PercentagePriceOscillator'
        && ['shortLength', 'longLength', 'signalLength'].some(key => hasOwn(parameters, key))) {
        return 'PercentagePriceOscillatorHistogram';
    }
    return type;
}

export interface ResolvedIndicatorParameter {
    readonly id: string;
    readonly definition: IndicatorParameterDefinition;
    readonly value: unknown;
}

/** Resolves current ids, package-declared aliases and the parameter names used before 2.x. */
export function resolveIndicatorParameter(
    definition: IndicatorDefinition | undefined,
    key: string,
    value: unknown,
): ResolvedIndicatorParameter | null {
    if (definition === undefined) return null;
    const direct = definition.parameters.find(parameter => parameter.id === key);
    if (direct !== undefined) return { id: direct.id, definition: direct, value };

    const declared = definition.parameters.find(parameter => parameter.aliases?.includes(key));
    if (declared !== undefined) return { id: declared.id, definition: declared, value };

    const legacy = LEGACY_PARAMETERS[definition.id]?.[key];
    if (legacy === undefined) return null;
    const migration = typeof legacy === 'string' ? { id: legacy } : legacy;
    const parameter = definition.parameters.find(item => item.id === migration.id);
    if (parameter === undefined) return null;
    return {
        id: parameter.id,
        definition: parameter,
        value: migration.convert?.(value) ?? value,
    };
}

/** Drops obsolete keys and produces the canonical parameter bag consumed by Indicators 2.x. */
export function migrateIndicatorParameters(
    definition: IndicatorDefinition,
    parameters: ParameterRecord | null | undefined,
): Record<string, unknown> {
    if (parameters === null || parameters === undefined) return {};
    const result: Record<string, unknown> = {};
    const explicit = new Set(definition.parameters
        .filter(parameter => hasOwn(parameters, parameter.id))
        .map(parameter => parameter.id));
    for (const [key, value] of Object.entries(parameters)) {
        const resolved = resolveIndicatorParameter(definition, key, value);
        if (resolved === null) continue;
        if (key !== resolved.id && explicit.has(resolved.id)) continue;
        result[resolved.id] = resolved.value;
    }
    return result;
}
