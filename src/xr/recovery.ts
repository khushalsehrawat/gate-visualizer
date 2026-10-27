export type TrackingRecovery = 'searching' | 'active' | 'recovering' | 'paused';

// Presentation stability only. Never used to permit placement or retain a lost pose.
export class TrackingRecoveryNotice {
  private seenValid = false;
  private state: TrackingRecovery = 'searching';
  private validSince: number | null = null;
  private lostSince: number | null = null;
  update(valid: boolean, time: number): TrackingRecovery {
    if (!valid) {
      this.validSince = null;
      if (!this.seenValid) return 'searching';
      this.lostSince ??= time;
      return this.state = time - this.lostSince >= 1500 ? 'paused' : 'recovering';
    }
    this.lostSince = null;
    if (!this.seenValid) { this.seenValid = true; return this.state = 'active'; }
    if (this.state !== 'active') {
      this.validSince ??= time;
      if (time - this.validSince < 350) return this.state = 'recovering';
    }
    return this.state = 'active';
  }
  reset() { this.seenValid = false; this.state = 'searching'; this.validSince = this.lostSince = null; }
}
