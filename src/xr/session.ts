import { Matrix4, Vector3 } from 'three';
import type { createTestScene, XRRenderer } from './rendering';
import { adjustedGateMatrix, defaultCalibration, entranceBasis, validCalibration } from '../geometry/calibration';
import type { GateCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';
import { cameraFrameStatus } from './cameraAccess';
import { defaultPresentation, validPresentation } from '../gates/presentation';
import type { GatePresentation } from '../gates/presentation';
import { WorldPoseFilter } from './stability';
import { FrameProfiler } from './profiling';
import type { FrameProfile } from './profiling';
import { acquireXR, releaseHitSource, trackHitSource, trackXRSession, xrResourceCounts } from './resources';

export interface XRStatus {
  session: 'idle' | 'requesting' | 'starting' | 'running' | 'ending' | 'ended' | 'error';
  tracking: string;
  referenceSpace: string;
  hitTest: string;
  anchors: string;
  overlay: string;
  placement: string;
  message: string;
  calibration: string;
  baseline: number | null;
  locked: boolean;
  cameraFrames: string;
  profile: FrameProfile | null;
  surfaceReady: boolean;
  gateReady: boolean;
}
export const initialXRStatus: XRStatus = {
  session: 'idle', tracking: 'Not started', referenceSpace: 'Not requested',
  hitTest: 'Not requested', anchors: 'Not requested', overlay: 'Not requested',
  placement: 'Not placed', message: 'Physical-device behavior: UNVERIFIED. Start AR to test on Android.',
  calibration: 'Capture left pillar base', baseline: null, locked: false,
  cameraFrames: 'Target camera pixels UNVERIFIED; separate pre-AR photo workflow selected.',
  profile: null,
  surfaceReady: false,
  gateReady: false,
};

export function sessionError(error: unknown): string {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'AR permission was denied or blocked. Use trusted HTTPS, allow XR permissions, and check the xr-spatial-tracking Permissions-Policy.';
  if (name === 'NotSupportedError') return 'Immersive AR or a required local reference space is unsupported. Use Chrome on an ARCore-certified phone with Google Play Services for AR.';
  if (name === 'InvalidStateError') return 'Another XR session may be active, or the page is not active. Exit other AR experiences and retry.';
  return 'AR setup or rendering failed. Check WebGL support, Chrome/AR services, and the remote console, then retry.';
}

export interface SessionOptions {
  xr: Pick<XRSystem, 'requestSession'>;
  host: HTMLElement;
  overlay: HTMLElement;
  onStatus: (status: XRStatus) => void;
  rendererFactory?: () => XRRenderer;
  mode?: 'gate' | 'marker';
  placementMethod?: 'single-point' | 'two-point';
  diagnostics?: boolean;
}

export class XRSessionController {
  private status: XRStatus = { ...initialXRStatus };
  private session: XRSession | null = null;
  private renderer: XRRenderer | null = null;
  private world: ReturnType<typeof createTestScene> | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private hitSource: XRHitTestSource | null = null;
  private anchor: XRAnchor | null = null;
  private referenceType: 'local-floor' | 'local' = 'local';
  private placed = false;
  private placeQueued = false;
  private manualQueued = false;
  private placementVersion = 0;
  private disposed = false;
  private cancelled = false;
  private endTask: Promise<void> | null = null;
  private startPending = false;
  private attachingRenderer = false;
  private gateImage: GateImage | null = null;
  private calibration: GateCalibration = { ...defaultCalibration };
  private leftPoint: Vector3 | null = null;
  private placementBase = new Matrix4();
  private gateBasis = new Matrix4();
  private gateTarget = new Matrix4();
  private presentation: GatePresentation = { ...defaultPresentation };
  private poseFilter = new WorldPoseFilter();
  private profiler: FrameProfiler | null;
  private hitMatrix = new Matrix4();
  private viewerMatrix = new Matrix4();
  private upright = new Matrix4();
  private previewBasis = new Matrix4();
  private hitPosition = new Vector3();
  private viewerPosition = new Vector3();
  private placementMethod: 'single-point' | 'two-point';
  private releaseOwner: (() => void) | null = null;
  private ownerTransferred = false;
  private imageVersion = 0;

  setPresentation(value: GatePresentation) {
    if (!validPresentation(value) || (this.status.locked && value.fitting !== this.presentation.fitting)) return false;
    this.presentation = { ...value };
    this.world?.setPresentation(this.presentation);
    if (!value.smoothing) this.poseFilter.reset();
    return true;
  }

  private get isGate() { return this.options.mode === 'gate'; }
  private get singlePoint() { return this.isGate && this.placementMethod === 'single-point'; }
  setPlacementMethod(method: 'single-point' | 'two-point') {
    if (this.placed) return false;
    this.placementMethod = method; this.reset(); return true;
  }

  setGateImage(image: GateImage) {
    this.gateImage = image;
    const world = this.world;
    if (!world) return;
    const version = ++this.imageVersion;
    const pending = world.setGateImage(image);
    world.configureGate(this.calibration, this.isGate);
    this.update({ gateReady: world.gateReady });
    if (pending) void pending.then(() => { if (world === this.world && version === this.imageVersion) this.update({ gateReady: world.gateReady }); })
      .catch(() => { if (world === this.world && version === this.imageVersion) this.update({ gateReady: false, message: 'Could not prepare the gate texture. Choose a smaller PNG/JPG/WebP and retry.' }); });
  }

  setCalibration(value: GateCalibration) {
    if (this.status.locked || !validCalibration(value)) return false;
    this.calibration = { ...value };
    this.poseFilter.reset();
    this.world?.configureGate(this.calibration, this.isGate);
    return true;
  }

  nudgeHorizontal(meters: number): GateCalibration | null {
    if (!this.isGate || (!this.placed && !(this.singlePoint && this.status.surfaceReady)) || !this.world || !Number.isFinite(meters) || Math.abs(meters) > 0.1) return null;
    const direction = new Vector3(1, 0, 0).transformDirection(this.world.marker.matrix);
    const next = { ...this.calibration, x: this.calibration.x + direction.x * meters, z: this.calibration.z + direction.z * meters };
    return this.setCalibration(next) ? next : null;
  }

  lockPlacement() {
    if (!this.placed || this.status.session !== 'running') return;
    this.placeQueued = false;
    this.update({ locked: !this.status.locked, surfaceReady: false, message: this.status.locked ? 'Unlocked. Adjust the gate while observing both pillars.' : 'Placement locked. Tracking remains active; edits and XR taps are ignored until unlocked. Image replacement is still allowed.' });
  }

  constructor(private readonly options: SessionOptions) {
    this.placementMethod = options.placementMethod ?? 'two-point';
    this.profiler = (options.diagnostics ?? import.meta.env.DEV) ? new FrameProfiler() : null;
  }

  private update(patch: Partial<XRStatus>) {
    if (this.disposed) return;
    let changed = false;
    for (const key in patch) if (this.status[key as keyof XRStatus] !== patch[key as keyof XRStatus]) { changed = true; break; }
    if (!changed) return;
    this.status = { ...this.status, ...patch };
    this.options.onStatus(this.status);
  }

  // Called directly from the Start AR click: no await before requestSession.
  async start(): Promise<void> {
    if (this.disposed || this.startPending || this.endTask || this.session) return;
    this.releaseOwner = acquireXR(this.options.xr);
    if (!this.releaseOwner) { this.update({ session: 'error', message: 'Another XR session is starting or ending. Exit it before starting again.' }); return; }
    this.ownerTransferred = false;
    this.startPending = true;
    this.cancelled = false;
    this.profiler?.reset(); this.poseFilter.reset();
    this.update({ ...initialXRStatus, session: 'requesting', message: 'Allow Chrome to start immersive AR.' });
    try {
      const session = await this.options.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local'],
        optionalFeatures: ['local-floor', 'hit-test', 'anchors', 'dom-overlay'],
        domOverlay: { root: this.options.overlay },
      });
      this.session = session;
      trackXRSession(session, this.releaseOwner);
      this.ownerTransferred = true;
      session.addEventListener('end', this.onEnd);
      if (this.disposed || this.cancelled) { await this.exit(); return; }
      this.update({ session: 'starting', overlay: session.domOverlayState ? 'Enabled' : 'Unavailable; use XR taps and browser exit' });
      if (session.domOverlayState) this.options.overlay.dataset.xrActive = 'true';
      session.addEventListener('select', this.onSelect);
      session.addEventListener('visibilitychange', this.onVisibility);
      this.options.overlay.addEventListener('beforexrselect', this.onBeforeXRSelect);
      window.addEventListener('pagehide', this.onPageHide);
      let referenceSpace: XRReferenceSpace;
      try {
        referenceSpace = await session.requestReferenceSpace('local-floor');
        this.referenceType = 'local-floor';
      } catch {
        if (!this.isCurrent(session)) return;
        referenceSpace = await session.requestReferenceSpace('local');
        this.referenceType = 'local';
      }
      if (!this.isCurrent(session)) return;
      this.referenceSpace = referenceSpace;
      this.referenceSpace.addEventListener('reset', this.onReferenceReset);
      this.update({ referenceSpace: this.referenceType });
      const hitTestReady = this.setupHitTest(session);
      // Load the WebGL renderer only after the gesture has requested a native session.
      const { createTestScene, createXRRenderer } = await import('./rendering');
      if (!this.isCurrent(session)) return;
      const renderer = (this.options.rendererFactory ?? createXRRenderer)();
      this.renderer = renderer;
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType(this.referenceType);
      renderer.setPixelRatio(1);
      // Configure before attachment; XR framebuffer size cannot change mid-session.
      renderer.xr.setFramebufferScaleFactor?.(0.75);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      this.options.host.append(renderer.domElement);
      renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
      this.world = createTestScene();
      this.world.setPresentation(this.presentation);
      if (this.gateImage) this.setGateImage(this.gateImage);
      this.world.configureGate(this.calibration, this.isGate);
      this.attachingRenderer = true;
      try { await renderer.xr.setSession(session); }
      finally { this.attachingRenderer = false; }
      if (!this.isCurrent(session)) return;
      // Rendering, hit poses and anchor poses use exactly the same space.
      renderer.xr.setReferenceSpace(this.referenceSpace);
      renderer.xr.setFoveation?.(1);
      this.update({ cameraFrames: cameraFrameStatus(session, undefined), ...(this.singlePoint ? { calibration: 'Aim at entrance ground centre' } : {}) });
      this.update({ session: 'running', tracking: 'Waiting for viewer pose', anchors: session.enabledFeatures?.includes('anchors') ? 'Enabled; waiting for placement' : 'Not confirmed; world-space fallback available', message: this.singlePoint ? 'Aim at the entrance ground centre, select a gate, then Place Gate. Fine Tune retains measured pillar alignment.' : this.isGate ? 'Scan the entrance floor. Aim at the LEFT pillar base and capture, then the RIGHT base. These are real XR hits, not image corners.' : 'Move slowly and scan a textured, well-lit surface. Aim the teal ring, then tap to place the orange marker.' });
      renderer.setAnimationLoop(this.onFrame);
      await hitTestReady;
      if (this.isCurrent(session) && this.status.hitTest.startsWith('Unavailable')) this.update({ message: 'Surface detection is unavailable. Manual placement is not depth-calibrated; align height and direction in Fine Tune.' });
    } catch (error) {
      if (this.disposed || this.cancelled) return;
      const message = sessionError(error);
      await this.exit();
      if (!this.session) this.update({ session: 'error', message });
    } finally {
      this.startPending = false;
      if (this.cancelled && this.status.session !== 'running') this.release();
      if (!this.session && !this.ownerTransferred) { this.releaseOwner?.(); this.releaseOwner = null; }
    }
  }

  private isCurrent(session: XRSession) { return this.session === session && !this.cancelled && !this.disposed; }

  private async setupHitTest(session: XRSession) {
    if (this.hitSource) return;
    try {
      if (!session.requestHitTestSource) throw new Error('No hit-test API');
      const viewer = await session.requestReferenceSpace('viewer');
      if (!this.isCurrent(session)) return;
      const source = await session.requestHitTestSource({ space: viewer });
      if (!source) throw new Error('No hit-test source');
      if (!this.isCurrent(session)) { source.cancel(); return; }
      this.hitSource = source;
      trackHitSource(source);
      this.update({ hitTest: 'Scanning; no surface yet' });
    } catch {
      if (this.isCurrent(session)) this.update({ hitTest: 'Unavailable; fixed-distance fallback', message: this.isGate ? 'No hit testing: tap for an approximate vertical gate 1.5 m ahead at viewer height. Manually lower its base, adjust depth/yaw, and verify from the side. This is not depth-calibrated.' : 'Surface hit testing is unavailable. Tap to place once, 1.5 m ahead in world space. This fallback is not surface-aligned.' });
    }
  }

  private onFrame = (time: number, frame?: XRFrame) => {
    const { session, referenceSpace: space, renderer, world } = this;
    if (!frame || !session || !space || !renderer || !world || this.status.session !== 'running') return;
    try {
      const cpuStart = this.profiler ? performance.now() : 0;
      const pose = frame.getViewerPose(space);
      const tracked = !!pose && !pose.emulatedPosition && session.visibilityState === 'visible';
      const tracking = !pose ? 'Lost; move slowly to recover' : pose.emulatedPosition ? 'Limited; position is emulated' : session.visibilityState !== 'visible' ? 'Paused; session not visible' : 'Tracking';
      if (this.status.tracking !== tracking) this.update({ tracking });
      world.marker.visible = tracked && this.placed;
      world.leftBase.visible = tracked && !!this.leftPoint && !this.placed;
      world.reticle.visible = false;
      if (!tracked && this.hitSource && this.status.hitTest !== 'Paused; waiting for positional tracking') this.update({ hitTest: 'Paused; waiting for positional tracking', surfaceReady: false });
      if (tracked && this.anchor) {
        const anchorPose = frame.getPose(this.anchor.anchorSpace, space);
        world.marker.visible = !!anchorPose;
        const anchorStatus = anchorPose ? 'Tracking anchor' : 'Anchor pose unavailable; marker hidden';
        if (anchorPose) { this.placementBase.fromArray(anchorPose.transform.matrix); world.marker.matrix.copy(this.placementBase); }
        if (this.status.anchors !== anchorStatus) this.update({ anchors: anchorStatus });
      }
      let hit: XRHitTestResult | undefined;
      let hitPose: XRPose | null = null;
      if (tracked && this.hitSource && (!this.placed || !this.status.locked)) {
        const results = frame.getHitTestResults(this.hitSource);
        // A first result can be unlocatable in this reference space. Try the next
        // real result, without inventing a pose or carrying one across frames.
        for (let i = 0; i < results.length && i < 4; i++) {
          const candidate = results[i]!.getPose(space);
          if (candidate && !candidate.emulatedPosition) { hit = results[i]; hitPose = candidate; break; }
        }
        const nextHit = hitPose ? 'Surface found' : 'Scanning; no surface yet';
        if (this.status.hitTest !== nextHit || this.status.surfaceReady !== !!hitPose) this.update({ hitTest: nextHit, surfaceReady: !!hitPose });
        this.profiler?.recordHit(!!hitPose);
        if (hitPose) {
          world.reticle.matrix.fromArray(hitPose.transform.matrix);
          world.reticle.visible = true;
          this.profiler?.recordReticle();
          if (this.singlePoint && !this.placed && world.gateReady && pose) {
            this.uprightFromHit(hitPose, pose);
            world.marker.matrix.copy(adjustedGateMatrix(this.hitMatrix, this.previewBasis, this.calibration, this.gateTarget));
            world.marker.visible = true;
          }
        }
      }
      if (tracked && this.hitSource && this.placed && this.status.locked && this.status.hitTest !== 'Paused after placement; Reposition to scan again') this.update({ hitTest: 'Paused after placement; Reposition to scan again', surfaceReady: false });
      if (this.placeQueued) {
        this.placeQueued = false;
        const manual = this.manualQueued;
        this.manualQueued = false;
        if (manual) { hit = undefined; hitPose = null; }
        if (!tracked) this.update({ message: 'Placement paused: restore positional tracking first.' });
        else if (!manual && this.hitSource && !hitPose) this.update({ message: 'No surface at the aim point. Scan until the teal ring appears, or choose approximate manual placement.' });
        else if (!manual && this.status.hitTest === 'Not requested') this.update({ message: 'Wait for hit-test initialization, then tap again.' });
        else if (pose) {
          const position = new Vector3(0, 0, -1.5).applyMatrix4(new Matrix4().fromArray(pose.transform.matrix));
          const matrix = hitPose ? new Matrix4().fromArray(hitPose.transform.matrix) : new Matrix4().makeTranslation(position.x, position.y, position.z);
          if (this.isGate && (!this.gateImage || !world.gateReady)) this.update({ message: 'Load a gate image before calibrating.' });
          else if (this.singlePoint && hitPose) {
            this.uprightFromHit(hitPose, pose); this.gateBasis.copy(this.previewBasis);
            this.update({ calibration: 'Surface position captured; verify size and direction in Fine Tune' });
            this.place(frame, matrix, hit, hitPose);
          }
          else if (this.isGate && hitPose) this.captureEntrance(frame, matrix, hit, hitPose);
          else {
            if (this.isGate) {
              const forward = new Vector3(0, 0, -1).transformDirection(new Matrix4().fromArray(pose.transform.matrix));
              // Approximate vertical plane facing the initial viewer; never updated from later camera poses.
              const yaw = Math.atan2(-forward.x, -forward.z);
              const upright = new Matrix4().makeTranslation(position.x, position.y, position.z).multiply(new Matrix4().makeRotationY(yaw));
              this.gateBasis.copy(matrix).invert().multiply(upright);
              this.update({ calibration: 'Manual alignment required (no depth/surface calibration)' });
            }
            this.place(frame, matrix, hit, hitPose);
          }
        }
      }
      // Three.js updates per-view XR camera poses/projections. The base camera stays
      // at the origin, and no camera-follow transform is applied to the marker.
      if (this.isGate && this.placed) {
        if (!world.marker.visible) this.poseFilter.reset();
        const target = adjustedGateMatrix(this.placementBase, this.gateBasis, this.calibration, this.gateTarget);
        world.marker.matrix.copy(this.poseFilter.update(target, time, this.presentation.smoothing));
        if (!world.marker.visible) this.poseFilter.reset();
      }
      renderer.render(world.scene, world.camera);
      if (this.profiler) {
        const profile = this.profiler.sample(time, performance.now() - cpuStart, renderer.info);
        if (profile) { const counts = xrResourceCounts(); profile.activeSessions = counts.sessions; profile.activeHitSources = counts.hitSources; this.update({ profile }); }
      }
    } catch (error) {
      const message = sessionError(error);
      void this.exit().then(() => { if (!this.session) this.update({ session: 'error', message }); });
    }
  };

  private uprightFromHit(hit: XRPose, viewer: XRViewerPose) {
    this.hitMatrix.fromArray(hit.transform.matrix); this.viewerMatrix.fromArray(viewer.transform.matrix);
    this.hitPosition.setFromMatrixPosition(this.hitMatrix); this.viewerPosition.setFromMatrixPosition(this.viewerMatrix);
    const dx = this.viewerPosition.x - this.hitPosition.x, dz = this.viewerPosition.z - this.hitPosition.z;
    const yaw = dx * dx + dz * dz > .0001 ? Math.atan2(dx, dz) : Math.atan2(this.viewerMatrix.elements[8]!, this.viewerMatrix.elements[10]!);
    this.upright.makeRotationY(yaw).setPosition(this.hitPosition);
    this.previewBasis.copy(this.hitMatrix).invert().multiply(this.upright);
  }

  private captureEntrance(frame: XRFrame, matrix: Matrix4, hit: XRHitTestResult | undefined, pose: XRPose) {
    const point = new Vector3().setFromMatrixPosition(matrix);
    if (!this.leftPoint) {
      this.leftPoint = point;
      if (this.world) {
        this.world.leftBase.matrix.makeTranslation(point.x, point.y + 0.005, point.z);
        this.world.leftBase.visible = true;
      }
      this.update({ calibration: 'Capture right pillar base', message: 'LEFT base captured. Aim at the RIGHT pillar base at the same ground level and capture. Enter measured dimensions; a floor hit alone cannot determine the entrance plane.' });
      return;
    }
    try {
      const basis = entranceBasis(this.leftPoint, point);
      if (basis.heightDifference > 0.25) { this.update({ message: 'Base points differ by more than 25 cm in height. Reposition and select both pillar bases at the same level.' }); return; }
      this.gateBasis.copy(matrix).invert().multiply(basis.matrix);
      this.update({ baseline: basis.distance, calibration: 'Two spatial points captured; verify measured dimensions and alignment' });
      this.place(frame, matrix, hit, pose);
    } catch {
      this.update({ message: 'Select a distinct RIGHT pillar base, 0.2–20 m from the left base. Use Reposition to restart.' });
    }
  }

  private place(frame: XRFrame, matrix: Matrix4, hit: XRHitTestResult | undefined, pose: XRPose | null) {
    const { world, referenceSpace: space, session } = this;
    if (!world || !space || !session || this.placed) return;
    this.placed = true;
    this.poseFilter.reset();
    this.placementBase.copy(matrix);
    world.marker.matrix.copy(matrix);
    world.marker.visible = true;
    world.reticle.visible = false;
    world.leftBase.visible = false;
    const version = ++this.placementVersion;
    if (this.singlePoint) this.update({ locked: true, surfaceReady: false });
    this.update({ placement: pose ? 'Placed on surface' : 'Placed 1.5 m ahead (no surface alignment)', message: this.isGate ? (pose ? 'Gate positioned. Fine-tune measured dimensions, offsets and yaw from multiple viewpoints, then lock. Physical behavior UNVERIFIED.' : 'Approximate gate placed once 1.5 m ahead at camera height. Lower its base and adjust depth/rotation in Gate calibration & image. Check both pillars from the side, then lock. No surface depth was measured; physical behavior UNVERIFIED.') : 'Walk sideways and closer: the orange marker should stay in the world. Tap again to reset. Physical behavior UNVERIFIED.' });
    try {
      // Invoke anchor creation during the active XR frame, not in a later promise.
      const pending = hit?.createAnchor ? hit.createAnchor() : frame.createAnchor
        ? frame.createAnchor(pose?.transform ?? new XRRigidTransform({ x: matrix.elements[12]!, y: matrix.elements[13]!, z: matrix.elements[14]! }), space)
        : null;
      if (!pending) { this.update({ anchors: 'Unavailable; session-scoped world-space transform' }); return; }
      this.update({ anchors: 'Creating anchor; world-space transform in use' });
      void pending.then((anchor) => {
        if (!this.isCurrent(session) || version !== this.placementVersion) { anchor.delete(); return; }
        this.anchor = anchor;
        this.update({ anchors: 'Created; waiting for anchor pose' });
      }).catch(() => {
        if (this.isCurrent(session) && version === this.placementVersion) this.update({ anchors: 'Creation failed; session-scoped world-space transform' });
      });
    } catch {
      this.update({ anchors: 'Unavailable; session-scoped world-space transform' });
    }
  }

  queuePlacement(manual = false) {
    if (this.status.session !== 'running' || this.placed || this.status.locked || (manual && !this.isGate)) return;
    this.manualQueued = manual; this.placeQueued = true;
    if (manual) {
      this.leftPoint = null; this.gateBasis.identity();
      this.update({ baseline: null, message: 'Approximate placement requested. Waiting for a valid tracked XR frame; no surface depth will be inferred.' });
    }
  }

  undoLeftBase = () => {
    if (!this.isGate || this.placed || this.status.locked || this.status.session !== 'running') return;
    this.leftPoint = null; this.placeQueued = false; this.manualQueued = false;
    if (this.world) this.world.leftBase.visible = false;
    this.update({ baseline: null, calibration: 'Capture left pillar base', message: 'Left bottom point cleared. Aim at the LEFT inner pillar bottom and capture again.' });
  };

  reset = () => {
    ++this.placementVersion;
    this.anchor?.delete(); this.anchor = null;
    this.placed = false; this.placeQueued = false; this.manualQueued = false;
    this.leftPoint = null;
    this.gateBasis.identity();
    this.poseFilter.reset();
    if (this.world) { this.world.marker.visible = false; this.world.reticle.visible = false; this.world.leftBase.visible = false; }
    this.update({ placement: 'Not placed', locked: false, surfaceReady: false, baseline: null, calibration: this.singlePoint ? 'Aim at entrance ground centre' : 'Capture left pillar base', message: 'Placement cleared. Scan and tap to place again. Physical behavior UNVERIFIED.' });
  };

  private onSelect = () => { if (this.status.locked || (this.singlePoint && this.session?.domOverlayState)) return; if (this.placed) { if (!this.isGate) this.reset(); } else this.queuePlacement(); };
  private onBeforeXRSelect = (event: Event) => { if ((event.target as Element | null)?.closest('button,input,select,label,details,summary,a,.xr-control-card')) event.preventDefault(); };
  private onVisibility = () => {
    this.placeQueued = false; this.manualQueued = false;
    this.update({ surfaceReady: false });
    if (this.session?.visibilityState !== 'visible') {
      this.poseFilter.reset(); this.profiler?.reset();
      if (this.world) { this.world.marker.visible = false; this.world.reticle.visible = false; this.world.leftBase.visible = false; }
      this.update({ tracking: 'Paused; session not visible' });
    }
  };
  private onReferenceReset = () => { this.reset(); this.update({ referenceSpace: `${this.referenceType} (reset)`, message: 'The XR reference space reset. Placement cleared to avoid an incorrect world position; scan and place again.' }); };
  private onContextLost = (event: Event) => { event.preventDefault(); void this.exit().then(() => { if (!this.session) this.update({ session: 'error', message: 'WebGL context lost. Exit and restart AR.' }); }); };
  private onPageHide = () => { void this.exit(); };
  private onEnd = () => {
    this.cancelled = true;
    // Let Three.js process the same end event before releasing rendering resources.
    queueMicrotask(() => { if (!this.attachingRenderer) this.release(); this.update({ session: 'ended', tracking: 'Stopped', referenceSpace: 'Released', hitTest: 'Released', anchors: 'Released', overlay: 'Ended', placement: 'Not placed', message: 'AR session ended. Physical-device behavior remains UNVERIFIED.' }); });
  };

  async exit(): Promise<void> {
    this.cancelled = true;
    if (this.endTask) return this.endTask;
    const session = this.session;
    if (!session) { this.release(); this.update({ session: 'ended' }); return; }
    this.update({ session: 'ending' });
    this.renderer?.setAnimationLoop(null);
    this.endTask = (async () => {
      try { await session.end(); }
      catch {
        // Retain the session handle so exit can be retried if the browser rejects end.
        this.cancelled = false;
        if (!this.disposed) this.renderer?.setAnimationLoop(this.onFrame);
        this.update({ session: 'running', message: 'Could not end the XR session. Retry Exit AR or use Chrome’s native XR exit control.' });
        return;
      }
      if (!this.attachingRenderer) this.release();
      this.update({ session: 'ended', tracking: 'Stopped', referenceSpace: 'Released', hitTest: 'Released', anchors: 'Released', overlay: 'Ended', placement: 'Not placed', message: 'AR session ended. Physical-device behavior remains UNVERIFIED.' });
    })();
    try { await this.endTask; } finally { this.endTask = null; }
  }

  private release() {
    ++this.placementVersion;
    this.session?.removeEventListener('end', this.onEnd);
    this.session?.removeEventListener('select', this.onSelect);
    this.session?.removeEventListener('visibilitychange', this.onVisibility);
    this.referenceSpace?.removeEventListener('reset', this.onReferenceReset);
    this.options.overlay.removeEventListener('beforexrselect', this.onBeforeXRSelect);
    delete this.options.overlay.dataset.xrActive;
    window.removeEventListener('pagehide', this.onPageHide);
    if (this.hitSource) releaseHitSource(this.hitSource); this.hitSource = null;
    this.anchor?.delete(); this.anchor = null;
    this.renderer?.setAnimationLoop(null);
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
      this.renderer.domElement.remove();
      this.world?.dispose();
      this.renderer.dispose(); this.renderer.forceContextLoss();
    }
    this.world = null; this.renderer = null; this.session = null; this.referenceSpace = null;
    this.placed = false; this.placeQueued = false; this.manualQueued = false;
    this.leftPoint = null;
    this.poseFilter.reset(); this.profiler?.reset();
    this.update({ locked: false, surfaceReady: false, gateReady: false, profile: null, baseline: null, calibration: 'Capture left pillar base' });
  }

  dispose() {
    this.disposed = true;
    // Even if the browser rejects end(), release application-owned resources.
    // Browser/native XR exit remains responsible for final platform teardown.
    void this.exit().finally(() => { if (!this.attachingRenderer) this.release(); });
  }
}
