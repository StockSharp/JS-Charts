const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { RenderDirty, RenderScheduler } = require('../src/core/render-scheduler.js');

function frameDriver() {
    let next = 1;
    const callbacks = new Map();
    return {
        request(callback) {
            const id = next++;
            callbacks.set(id, callback);
            return id;
        },
        cancel(id) { callbacks.delete(id); },
        fire() {
            const pending = Array.from(callbacks.values());
            callbacks.clear();
            for (const callback of pending) callback(0);
        },
        get size() { return callbacks.size; },
        pending() { return Array.from(callbacks.values()); },
    };
}

describe('RenderScheduler', () => {
    it('coalesces dirty layers into one immutable frame mask', () => {
        const frames = frameDriver();
        const rendered = [];
        const scheduler = new RenderScheduler((dirty) => rendered.push(dirty), frames);

        scheduler.invalidate(RenderDirty.Base);
        scheduler.invalidate(RenderDirty.Overlay);

        assert.equal(frames.size, 1);
        assert.equal(scheduler.pendingDirty, RenderDirty.Base | RenderDirty.Overlay);
        frames.fire();
        assert.deepEqual(rendered, [RenderDirty.Base | RenderDirty.Overlay]);
        assert.equal(scheduler.pendingDirty, RenderDirty.None);
    });

    it('retains invalidations raised while a frame is rendering', () => {
        const frames = frameDriver();
        const rendered = [];
        let scheduler;
        scheduler = new RenderScheduler((dirty) => {
            rendered.push(dirty);
            scheduler.invalidate(RenderDirty.Axes);
        }, frames);

        scheduler.invalidate(RenderDirty.Base);
        frames.fire();
        assert.equal(frames.size, 1);
        frames.fire();
        assert.deepEqual(rendered, [RenderDirty.Base, RenderDirty.Axes]);
    });

    it('cancels pending work on dispose', () => {
        const frames = frameDriver();
        let renders = 0;
        const scheduler = new RenderScheduler(() => renders++, frames);
        scheduler.invalidate(RenderDirty.All);
        scheduler.dispose();
        frames.fire();
        assert.equal(renders, 0);
        assert.equal(frames.size, 0);
    });

    // reschedule() is what a chart calls when its tab becomes visible again: rAF does not fire
    // while a tab is hidden, so a frame queued in that window never runs and the latch would keep
    // every later invalidation from queueing anything. The comment beside the caller records that
    // this shipped once as a chart frozen until the next interaction.
    it('re-queues a frame that was left pending, keeping the dirty mask', () => {
        const frames = frameDriver();
        const rendered = [];
        const scheduler = new RenderScheduler((dirty) => rendered.push(dirty), frames);

        scheduler.invalidate(RenderDirty.Base);
        const stale = frames.pending()[0];
        scheduler.reschedule();

        assert.equal(frames.size, 1, 'the stale frame is replaced, not added to');
        assert.ok(!frames.pending().includes(stale), 'the frame queued while hidden is cancelled');
        assert.equal(scheduler.pendingDirty, RenderDirty.Base, 'the dirty mask survives the re-queue');
        frames.fire();
        assert.deepEqual(rendered, [RenderDirty.Base]);
        assert.equal(scheduler.hasPendingFrame, false);
    });

    it('does not queue a frame when rescheduling with nothing dirty', () => {
        const frames = frameDriver();
        let renders = 0;
        const scheduler = new RenderScheduler(() => renders++, frames);

        scheduler.reschedule();
        assert.equal(frames.size, 0);

        scheduler.invalidate(RenderDirty.Axes);
        frames.fire();
        scheduler.reschedule();   // the frame already ran; nothing is owed
        assert.equal(frames.size, 0);
        assert.equal(renders, 1);
    });

    it('ignores a reschedule after dispose', () => {
        const frames = frameDriver();
        let renders = 0;
        const scheduler = new RenderScheduler(() => renders++, frames);

        scheduler.invalidate(RenderDirty.All);
        scheduler.dispose();
        scheduler.reschedule();

        assert.equal(frames.size, 0);
        frames.fire();
        assert.equal(renders, 0);
    });
});
