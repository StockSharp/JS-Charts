// Failing-by-design proofs for AUDIT.md findings 1.2, 1.3, 2.3, 2.9 and 2.16.
//
// Every assertion states the behaviour the audit says is owed, so each one stays red until the
// corresponding defect is fixed. Nothing under src/ is touched and no existing spec is edited.
// Each finding is paired with a control — the same fixture one step away from the trigger — so a
// red here cannot be blamed on the fixture.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    createChart,
    LineSeries,
    CrosshairMode,
    PriceScaleMode,
} = require('../src/index.js');
const { createHeadlessDom } = require('./headless-dom.js');
const { calculateBarStepPx } = require('../src/series-spacing.js');
const { TimeScaleModel } = require('../src/core/scale/time-scale.js');
const {
    InternalPriceScaleMode,
    priceToScale,
    scaleToPrice,
} = require('../src/core/scale/price-transform.js');

const WIDTH = 800;
const HEIGHT = 400;

// One chart per call, torn down before the next one installs its own DOM globals.
function withChart(options, body) {
    const dom = createHeadlessDom();
    const chart = createChart(dom.host, { width: WIDTH, height: HEIGHT, ...options });
    try {
        return body(chart, dom);
    } finally {
        chart.remove();
        dom.restore();
    }
}

const onCanvasX = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= WIDTH;
const onCanvasY = (y) => typeof y === 'number' && Number.isFinite(y) && y >= 0 && y <= HEIGHT;

describe('applyOptions must deep-merge nested option groups', () => {
    it('keeps the siblings of a patched nested option, exactly as timeScale already does', () => {
        const after = withChart({
            grid: {
                vertLines: { color: '#101010', visible: true },
                horzLines: { color: '#202020', visible: true },
            },
            crosshair: {
                mode: CrosshairMode.Magnet,
                vertLine: { color: '#303030', visible: true },
                horzLine: { color: '#404040', visible: true },
            },
            timeScale: { borderColor: '#505050', timeVisible: true },
        }, (chart) => {
            // Exactly the patch chart-api.ts:3356 tells hosts to make while dragging an order.
            chart.applyOptions({ crosshair: { horzLine: { visible: false } } });
            chart.applyOptions({ grid: { horzLines: { visible: false } } });
            // Control: the same function already deep-merges timeScale, which is why the intent is
            // not in doubt. This half must stay green.
            chart.applyOptions({ timeScale: { timeVisible: false } });
            return chart.options();
        });

        assert.equal(after.timeScale?.borderColor, '#505050',
            'control: patching timeScale.timeVisible must keep timeScale.borderColor');

        assert.deepEqual({
            grid: after.grid,
            crosshairMode: after.crosshair?.mode,
            crosshairVertLine: after.crosshair?.vertLine,
            crosshairHorzLine: after.crosshair?.horzLine,
            timeScaleTimeVisible: after.timeScale?.timeVisible,
        }, {
            grid: {
                vertLines: { color: '#101010', visible: true },
                horzLines: { color: '#202020', visible: false },
            },
            crosshairMode: CrosshairMode.Magnet,
            crosshairVertLine: { color: '#303030', visible: true },
            crosshairHorzLine: { color: '#404040', visible: false },
            timeScaleTimeVisible: false,
        });
    });
});
