export interface FrameProfile { fps: number; p95IntervalMs: number; cpuMs: number; draws: number | null; geometries: number | null; textures: number | null }
export class FrameProfiler {
  private intervals: number[] = []; private costs: number[] = [];
  private last: number | null = null; private lastReport = 0;
  sample(time: number, cpuMs: number, counters?: { render: { calls: number }; memory: { geometries: number; textures: number } }): FrameProfile | null {
    if (this.last !== null && time > this.last && Number.isFinite(time - this.last)) this.intervals.push(time - this.last);
    this.last = time;
    this.costs.push(cpuMs);
    if (this.intervals.length > 120) this.intervals.shift();
    if (this.costs.length > 120) this.costs.shift();
    if (time - this.lastReport < 1000 || !this.intervals.length) return null;
    this.lastReport = time;
    const sorted = [...this.intervals].sort((a, b) => a - b);
    return { fps: 1000 / (this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length), p95IntervalMs: sorted[Math.ceil(sorted.length * 0.95) - 1]!, cpuMs: this.costs.reduce((a, b) => a + b, 0) / this.costs.length,
      draws: counters?.render.calls ?? null, geometries: counters?.memory.geometries ?? null, textures: counters?.memory.textures ?? null };
  }
  reset() { this.intervals = []; this.costs = []; this.last = null; this.lastReport = 0; }
}
