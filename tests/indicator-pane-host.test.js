// The engine may read only what IndicatorPaneHost declares.
//
// `setPaneManager` is public and a terminal supplies its own pane chrome to it, so the members
// the engine reaches for are a contract, not an implementation detail. The host below is a
// Proxy that throws on any property outside the declared five: reach for a sixth and this test
// says which, rather than a host discovering it as a TypeError months later.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { IndicatorEngine } = require('../src/chart/indicators/indicator-engine.js');

/// Exactly the members `IndicatorPaneHost` declares, and nothing else.
const DECLARED = ['getPaneByMeasure', 'addPane', 'getChart', 'removePane', 'restorePane'];

function strictHost() {
    const panes = new Map();
    const reached = new Set();
    let next = 1;

    const target = {
        getPaneByMeasure: (measure) => (measure === null ? null : `measure:${measure}`),
        addPane(label, measure) {
            const id = `pane-${next++}`;
            panes.set(id, {
                id,
                priceScale: () => ({ applyOptions() { } }),
                applyOptions() { },
            });
            return id;
        },
        getChart: (paneId) => panes.get(paneId) ?? null,
        removePane(paneId) { panes.delete(paneId); },
        restorePane: (paneId) => (panes.has(paneId) ? paneId : null),
    };

    const host = new Proxy(target, {
        get(object, property) {
            // A JS engine probes these on any object it touches; they are not the contract.
            if (typeof property === 'symbol' || property === 'then' || property === 'constructor')
                return Reflect.get(object, property);
            if (!DECLARED.includes(property))
                throw new Error(`the engine read "${String(property)}" off its pane host, which IndicatorPaneHost does not declare`);
            reached.add(property);
            return Reflect.get(object, property);
        },
    });

    return { host, reached, panes };
}

function renderer() {
    return {
        render: () => [{ applyOptions() { } }],
        getLastColors: () => ['#fff'],
        prepareRuntime() { },
        update() { },
        updateRuntime: () => true,
        removeSeries() { },
        moveSeries() { },
    };
}

describe('the pane host contract', () => {
    it('is all the engine reads, through a whole indicator lifecycle', () => {
        const { host, reached } = strictHost();
        const engine = new IndicatorEngine();
        engine.setRenderer(renderer());
        engine.setPaneManager(host);
        engine.setCandles([]);

        // Add onto a new pane, move it to the main chart, and remove it: the three paths that
        // touch the host at all.
        const entry = engine.add('RelativeStrengthIndex', { length: 14 }, '__new__');
        assert.ok(entry.paneId, 'the indicator went onto a pane the host made');
        assert.equal(engine.move(entry.id, '__main__'), true);
        engine.remove(entry.id);

        // And what it reached for is a subset of what is declared - the Proxy would have
        // thrown otherwise. This asserts the other direction: nothing declared is dead.
        for (const member of reached) assert.ok(DECLARED.includes(member), member);
        assert.ok(reached.has('addPane') && reached.has('getChart'), [...reached].join(', '));
    });

    it('works without restorePane, which is the one optional member', () => {
        const { host } = strictHost();
        // A host that keeps no tombstones: the engine must make a new pane instead of restoring.
        const withoutRestore = new Proxy(host, {
            get: (object, property) => (property === 'restorePane' ? undefined : Reflect.get(object, property)),
        });

        const engine = new IndicatorEngine();
        engine.setRenderer(renderer());
        engine.setPaneManager(withoutRestore);
        engine.setCandles([]);

        const entry = engine.add('RelativeStrengthIndex', { length: 14 }, '__new__');
        assert.ok(entry.paneId);
        assert.equal(engine.move(entry.id, '__main__'), true);
    });
});
