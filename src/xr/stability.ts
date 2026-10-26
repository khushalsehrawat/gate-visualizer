import { Matrix4, Quaternion, Vector3 } from 'three';

// Filters only world-anchor corrections, never the viewer/camera transform.
export class WorldPoseFilter {
  private position = new Vector3(); private rotation = new Quaternion();
  private targetPosition = new Vector3(); private targetRotation = new Quaternion();
  private scale = new Vector3(1, 1, 1); private output = new Matrix4();
  private lastTime: number | null = null;
  reset() { this.lastTime = null; }
  update(target: Matrix4, time: number, enabled: boolean) {
    target.decompose(this.targetPosition, this.targetRotation, this.scale);
    const discontinuity = this.position.distanceTo(this.targetPosition) > 0.5 || this.rotation.angleTo(this.targetRotation) > Math.PI / 6;
    if (!enabled || this.lastTime === null || time < this.lastTime || discontinuity) {
      this.position.copy(this.targetPosition); this.rotation.copy(this.targetRotation);
    } else {
      const alpha = 1 - Math.exp(-Math.min(time - this.lastTime, 100) / 80);
      this.position.lerp(this.targetPosition, alpha); this.rotation.slerp(this.targetRotation, alpha);
    }
    this.lastTime = time;
    return this.output.compose(this.position, this.rotation, this.scale);
  }
}
