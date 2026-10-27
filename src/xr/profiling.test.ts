import { describe, expect, it } from 'vitest';
import { FrameProfiler } from './profiling';
describe('bounded XR frame profiling', () => {
  it('reports frame intervals, app CPU and renderer counts at most once per second', () => {
    const profiler = new FrameProfiler();
    const counters = { render: { calls: 2 }, memory: { geometries: 3, textures: 1 } };
    for (let frame = 0; frame < 60; frame++) expect(profiler.sample(frame * (1000 / 60), 2, counters)).toBeNull();
    const sample = profiler.sample(1000, 2, counters)!;
    expect(sample.fps).toBeCloseTo(60); expect(sample.cpuMs).toBe(2);
    expect(sample.p95IntervalMs).toBeCloseTo(1000 / 60);
    expect(sample.textures).toBe(1); expect(sample.draws).toBe(2);
    expect(profiler.sample(1016, 2, counters)).toBeNull();
    profiler.reset(); expect(profiler.sample(9000, 2)).toBeNull();
  });
  it('includes long visible-session stalls instead of hiding them from fps/p95', () => {
    const profiler = new FrameProfiler(); profiler.sample(0, 1); profiler.sample(16, 1);
    const sample = profiler.sample(1016, 12)!;
    expect(sample.p95IntervalMs).toBe(1000); expect(sample.fps).toBeLessThan(3);
  });
  it('aggregates real hit and reticle counts and uses the first XR timestamp as the report baseline', () => {
    const p = new FrameProfiler(); p.recordHit(true); p.recordReticle();
    expect(p.sample(50000, 1)).toBeNull();
    p.recordHit(false); expect(p.sample(50016, 2)).toBeNull();
    const sample = p.sample(51000, 1, undefined, 1, 1)!;
    expect(sample.hitSuccessRate).toBe(.5); expect(sample.reticleHz).toBe(1);
    expect(sample.activeSessions).toBe(1); expect(sample.activeHitSources).toBe(1);
    expect(sample.intervalMs).toBe(500);
  });
});
