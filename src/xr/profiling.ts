export interface FrameProfile { fps: number; intervalMs: number; p95IntervalMs: number; cpuMs: number; draws: number | null; geometries: number | null; textures: number | null; hitSuccessRate: number | null; reticleHz: number; activeSessions: number; activeHitSources: number }
export class FrameProfiler {
  private intervals = new Float64Array(120); private costs = new Float64Array(120);
  private intervalCount = 0; private costCount = 0; private intervalIndex = 0; private costIndex = 0;
  private hitQueries = 0; private hits = 0; private reticles = 0;
  private last: number | null = null; private lastReport = 0;
  recordHit(found: boolean) { ++this.hitQueries; if (found) ++this.hits; }
  recordReticle() { ++this.reticles; }
  sample(time: number, cpuMs: number, counters?: { render: { calls: number }; memory: { geometries: number; textures: number } }, activeSessions = 0, activeHitSources = 0): FrameProfile | null {
    if (this.last === null) this.lastReport = time;
    if (this.last !== null && time > this.last && Number.isFinite(time - this.last)) { this.intervals[this.intervalIndex++ % 120] = time - this.last; this.intervalCount = Math.min(120, this.intervalCount + 1); }
    this.last = time;
    this.costs[this.costIndex++ % 120] = cpuMs; this.costCount = Math.min(120, this.costCount + 1);
    if (time - this.lastReport < 1000 || !this.intervalCount) return null;
    const seconds = (time - this.lastReport) / 1000;
    this.lastReport = time;
    const sorted = Array.from(this.intervals.subarray(0, this.intervalCount)).sort((a, b) => a - b);
    const intervalMs = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const result = { fps: 1000 / intervalMs, intervalMs, p95IntervalMs: sorted[Math.ceil(sorted.length * .95) - 1]!, cpuMs: this.costs.subarray(0, this.costCount).reduce((a, b) => a + b, 0) / this.costCount,
      draws: counters?.render.calls ?? null, geometries: counters?.memory.geometries ?? null, textures: counters?.memory.textures ?? null,
      hitSuccessRate: this.hitQueries ? this.hits / this.hitQueries : null, reticleHz: this.reticles / seconds, activeSessions, activeHitSources };
    this.hitQueries = this.hits = this.reticles = 0;
    return result;
  }
  reset() { this.intervalCount = this.costCount = this.intervalIndex = this.costIndex = this.hitQueries = this.hits = this.reticles = 0; this.last = null; this.lastReport = 0; }
}
