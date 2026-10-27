import { Matrix4, Mesh } from 'three';
import type { Group, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { initialXRStatus, sessionError, XRSessionController } from './session';
import type { XRStatus } from './session';
import type { XRRenderer } from './rendering';
import { defaultCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';
import { defaultPresentation } from '../gates/presentation';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function harness({ hitTest = true, floor = true, overlay = true, mode = 'marker', placementMethod = 'two-point', diagnostics = true }: { hitTest?: boolean; floor?: boolean; overlay?: boolean; mode?: 'gate' | 'marker'; placementMethod?: 'single-point' | 'two-point'; diagnostics?: boolean } = {}) {
  const space = new EventTarget() as XRReferenceSpace;
  const viewer = new EventTarget() as XRReferenceSpace;
  const source = { cancel: vi.fn() };
  const session = Object.assign(new EventTarget(), {
    visibilityState: 'visible', enabledFeatures: [],
    domOverlayState: overlay ? { type: 'screen' } : undefined,
    requestReferenceSpace: vi.fn(async (type: string) => {
      if (type === 'local-floor' && !floor) throw new DOMException('no floor', 'NotSupportedError');
      return type === 'viewer' ? viewer : space;
    }),
    requestHitTestSource: vi.fn(async () => {
      if (!hitTest) throw new DOMException('no hit test', 'NotSupportedError');
      return source;
    }),
    end: vi.fn(async () => { session.dispatchEvent(new Event('end')); }),
  });
  const requestSession = vi.fn().mockResolvedValue(session);
  let loop: ((time: number, frame?: XRFrame) => void) | null = null;
  const renderer = {
    domElement: document.createElement('canvas'),
    xr: { enabled: false, setFramebufferScaleFactor: vi.fn(), setFoveation: vi.fn(), setReferenceSpaceType: vi.fn(), setReferenceSpace: vi.fn(), setSession: vi.fn().mockResolvedValue(undefined) },
    setAnimationLoop: vi.fn((callback) => { loop = callback; }), render: vi.fn(),
    dispose: vi.fn(), forceContextLoss: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(), setClearColor: vi.fn(),
  };
  const host = document.createElement('div');
  const overlayRoot = document.createElement('section');
  const statuses: XRStatus[] = [];
  const onAutoFit = vi.fn();
  const rendererFactory = vi.fn(() => renderer as unknown as XRRenderer);
  const xr = { requestSession };
  const controller = new XRSessionController({ xr, host, overlay: overlayRoot, onStatus: (status) => statuses.push(status), onAutoFit, rendererFactory, mode, placementMethod, diagnostics });
  function frame({ time = 0, x = 0, hitX = 2, hitY = 0, tilt = false, hit = hitTest, tracking = true, emulated = false, anchorPose = true, createAnchor, frameAnchor }: { time?: number; x?: number; hitX?: number; hitY?: number; tilt?: boolean; hit?: boolean; tracking?: boolean; emulated?: boolean; anchorPose?: boolean; createAnchor?: () => Promise<XRAnchor>; frameAnchor?: (pose: XRRigidTransform, space: XRSpace) => Promise<XRAnchor> } = {}) {
    const hitMatrix = new Matrix4().makeTranslation(hitX, hitY, -2);
    if (tilt) hitMatrix.multiply(new Matrix4().makeRotationX(-Math.PI / 2));
    const hitPose = { transform: { matrix: new Float32Array(hitMatrix.elements) } };
    const result = { getPose: vi.fn(() => hitPose), ...(createAnchor ? { createAnchor: vi.fn(createAnchor) } : {}) };
    const xrFrame = {
      session,
      getViewerPose: vi.fn(() => tracking ? { emulatedPosition: emulated, transform: { matrix: new Float32Array(new Matrix4().makeTranslation(x, 1.6, 0).elements) } } : null),
      getHitTestResults: vi.fn(() => hit ? [result] : []),
      getPose: vi.fn(() => anchorPose ? hitPose : null),
      ...(frameAnchor ? { createAnchor: frameAnchor } : {}),
    } as unknown as XRFrame;
    loop?.(time, xrFrame);
    return xrFrame;
  }
  function marker(): Group { return (renderer.render.mock.lastCall?.[0] as Scene).children[0] as Group; }
  function reticle() { return (renderer.render.mock.lastCall?.[0] as Scene).children[1]!; }
  return { controller, session, space, source, requestSession, xr, renderer, rendererFactory, host, overlayRoot, frame, marker, reticle, onAutoFit, runFrame: (frame: XRFrame) => loop?.(32, frame), statuses, status: () => statuses.at(-1) ?? initialXRStatus };
}

describe('real XR session controller (mocked platform)', () => {
  it('uses the next valid hit when the first result has no pose in the chosen reference space', async () => {
    const h = harness(); await h.controller.start(); const frame = h.frame({ hitX: 6 });
    const good = frame.getHitTestResults(h.source as XRHitTestSource)[0]!;
    vi.mocked(frame.getHitTestResults).mockReturnValue([{ getPose: () => null } as unknown as XRHitTestResult, good]);
    h.reticle().matrix.identity(); h.runFrame(frame);
    expect(h.reticle().matrix.elements[12]).toBe(6); expect(h.status().surfaceReady).toBe(true);
    await h.controller.exit();
  });
  it('updates real reticle poses every XR frame with no interpolation and hides rather than moving on loss', async () => {
    const h = harness({ diagnostics: false }); await h.controller.start();
    h.frame({ time: 0, hitX: 1 }); const count = h.statuses.length;
    h.frame({ time: 16, hitX: 3 });
    expect(h.reticle().matrix.elements[12]).toBe(3); expect(h.reticle().visible).toBe(true);
    expect(h.statuses).toHaveLength(count);
    h.frame({ time: 32, hit: false });
    expect(h.reticle().visible).toBe(false); expect(h.reticle().matrix.elements[12]).toBe(3);
    expect(h.status().surfaceReady).toBe(false);
    h.frame({ time: 48, hitX: -2 }); expect(h.reticle().matrix.elements[12]).toBe(-2);
    const stableCount = h.statuses.length;
    for (let i = 1; i <= 120; i++) h.frame({ time: 48 + i * 16, hitX: i / 10 });
    expect(h.statuses).toHaveLength(stableCount);
    expect(h.session.requestHitTestSource).toHaveBeenCalledOnce();
    expect(h.status().profile).toBeNull(); await h.controller.exit();
  });
  it('guards the XRSystem while another controller owns its native session', async () => {
    const h = harness(); await h.controller.start();
    const other = new XRSessionController({ xr: h.xr, host: document.createElement('div'), overlay: document.createElement('section'), onStatus: vi.fn(), rendererFactory: h.rendererFactory });
    await other.start(); expect(h.requestSession).toHaveBeenCalledOnce();
    await h.controller.exit(); await other.start(); expect(h.requestSession).toHaveBeenCalledTimes(2);
    await other.exit();
  });
  it('clears readiness immediately on a missed hit and does not publish unchanged frames', async () => {
    const h = harness(); await h.controller.start();
    h.frame({ time: 0, hit: true }); const count = h.statuses.length;
    const frame = h.frame({ time: 20, hit: false });
    expect(frame.getHitTestResults).toHaveBeenCalledOnce();
    expect(h.status().surfaceReady).toBe(false);
    expect(h.statuses).toHaveLength(count + 1);
    h.frame({ time: 160, hit: false });
    expect(h.status().hitTest).toBe('Scanning; no surface yet');
    expect(h.statuses).toHaveLength(count + 1);
    await h.controller.exit();
  });
  it('requests immersive AR immediately and only once, with optional enhancements', async () => {
    const h = harness();
    const start = h.controller.start();
    expect(h.requestSession).toHaveBeenCalledExactlyOnceWith('immersive-ar', {
      requiredFeatures: ['local'], optionalFeatures: ['local-floor', 'hit-test', 'anchors', 'dom-overlay'], domOverlay: { root: h.overlayRoot },
    });
    await h.controller.start(); await start;
    expect(h.requestSession).toHaveBeenCalledTimes(1);
    expect(h.renderer.xr.enabled).toBe(true);
    expect(h.renderer.setPixelRatio).toHaveBeenCalledWith(1);
    expect(h.renderer.xr.setFramebufferScaleFactor).toHaveBeenCalledWith(0.75);
    expect(h.renderer.xr.setFramebufferScaleFactor.mock.invocationCallOrder[0]).toBeLessThan(h.renderer.xr.setSession.mock.invocationCallOrder[0]!);
    expect(h.renderer.xr.setReferenceSpace).toHaveBeenCalledWith(h.space);
    expect(h.status().session).toBe('running');
    await h.controller.exit();
  });

  it('handles denied session permission without allocating a renderer', async () => {
    const h = harness();
    h.requestSession.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    await h.controller.start();
    expect(h.status().session).toBe('error');
    expect(h.status().message).toMatch(/permission was denied/);
    expect(h.rendererFactory).not.toHaveBeenCalled();
  });

  it('falls back to local space and fixed-distance placement without following the viewer', async () => {
    const h = harness({ floor: false, hitTest: false, overlay: false });
    await h.controller.start();
    expect(h.status().referenceSpace).toBe('local');
    expect(h.status().overlay).toMatch(/Unavailable/);
    h.session.dispatchEvent(new Event('select'));
    h.frame({ x: 1 });
    const matrix = h.marker().matrix.clone();
    expect(matrix.elements[12]).toBe(1);
    expect(matrix.elements[14]).toBe(-1.5);
    h.frame({ x: 5 });
    expect(h.marker().matrix.equals(matrix)).toBe(true);
    expect(h.marker().parent?.type).toBe('Scene');
    expect(h.status().anchors).toMatch(/session-scoped/);
    h.session.dispatchEvent(new Event('select'));
    expect(h.marker().visible).toBe(false);
    await h.controller.exit();
  });

  it('requires a current surface hit, then fixes the marker in reference space', async () => {
    const h = harness(); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hit: false });
    expect(h.status().placement).toBe('Not placed');
    h.controller.queuePlacement(); h.frame({ hitX: 3 });
    expect(h.marker().matrix.elements[12]).toBe(3);
    h.frame({ x: 7, hitX: 9 });
    expect(h.marker().matrix.elements[12]).toBe(3);
    await h.controller.exit();
  });

  it('hides content on tracking loss, refuses emulated poses and restores the same placement', async () => {
    const h = harness(); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ emulated: true });
    expect(h.status().placement).toBe('Not placed');
    h.controller.queuePlacement(); h.frame();
    const matrix = h.marker().matrix.clone();
    h.frame({ tracking: false }); expect(h.marker().visible).toBe(false);
    expect(h.status().tracking).toMatch(/Lost/);
    h.frame({ x: 5 }); expect(h.marker().visible).toBe(true);
    expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.space.dispatchEvent(new Event('reset'));
    expect(h.status().placement).toBe('Not placed');
    await h.controller.exit();
  });

  it('uses an anchor pose and hides an unlocatable anchor; deletes anchors on reset', async () => {
    const h = harness(); await h.controller.start();
    const anchor = { anchorSpace: {}, delete: vi.fn() } as unknown as XRAnchor;
    h.controller.queuePlacement(); h.frame({ createAnchor: async () => anchor });
    await Promise.resolve();
    h.frame({ hitX: 4 }); expect(h.marker().matrix.elements[12]).toBe(4);
    expect(h.status().anchors).toBe('Tracking anchor');
    h.frame({ anchorPose: false }); expect(h.marker().visible).toBe(false);
    h.controller.reset(); expect(anchor.delete).toHaveBeenCalledTimes(1);
    await h.controller.exit();
  });

  it('falls back when anchor creation rejects', async () => {
    const h = harness(); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ createAnchor: async () => { throw new Error('unsupported'); } });
    await vi.waitFor(() => expect(h.status().anchors).toMatch(/Creation failed/));
    expect(h.marker().visible).toBe(true);
    await h.controller.exit();
  });

  it('uses frame.createAnchor in the chosen reference space if hit-result anchors are absent', async () => {
    const h = harness(); await h.controller.start();
    const anchor = { anchorSpace: {}, delete: vi.fn() } as unknown as XRAnchor;
    const frameAnchor = vi.fn().mockResolvedValue(anchor);
    h.controller.queuePlacement(); h.frame({ frameAnchor });
    expect(frameAnchor).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ matrix: expect.any(Float32Array) }), h.space);
    await Promise.resolve(); await h.controller.exit();
    expect(anchor.delete).toHaveBeenCalledTimes(1);
  });

  it('deletes late anchors after reset or exit instead of attaching stale placement', async () => {
    const h = harness(); await h.controller.start();
    const pending = deferred<XRAnchor>();
    const anchor = { delete: vi.fn() } as unknown as XRAnchor;
    h.controller.queuePlacement(); h.frame({ createAnchor: () => pending.promise });
    h.controller.reset(); await h.controller.exit();
    pending.resolve(anchor); await Promise.resolve();
    expect(anchor.delete).toHaveBeenCalledTimes(1);
  });

  it('cancels a late hit-test source if the session ends during setup', async () => {
    const h = harness();
    const pending = deferred<typeof h.source>();
    h.session.requestHitTestSource.mockReturnValue(pending.promise);
    const start = h.controller.start();
    await vi.waitFor(() => expect(h.session.requestHitTestSource).toHaveBeenCalled());
    await h.controller.exit();
    pending.resolve(h.source); await start;
    expect(h.source.cancel).toHaveBeenCalledTimes(1);
  });

  it('ends a session that resolves after disposal and does not allocate a renderer', async () => {
    const h = harness(); const pending = deferred<XRSession>();
    h.requestSession.mockReturnValue(pending.promise);
    const start = h.controller.start(); h.controller.dispose();
    pending.resolve(h.session as unknown as XRSession); await start;
    expect(h.session.end).toHaveBeenCalledTimes(1);
    expect(h.rendererFactory).not.toHaveBeenCalled();
  });

  it('defers rendering disposal until an in-flight renderer attachment settles', async () => {
    const h = harness(); const attaching = deferred<void>();
    h.renderer.xr.setSession.mockReturnValue(attaching.promise);
    const start = h.controller.start();
    await vi.waitFor(() => expect(h.renderer.xr.setSession).toHaveBeenCalled());
    await h.controller.exit();
    expect(h.renderer.dispose).not.toHaveBeenCalled();
    attaching.resolve(); await start;
    expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(h.host.children).toHaveLength(0);
    expect(h.status().session).toBe('ended');
    expect(h.overlayRoot.dataset.xrActive).toBeUndefined();
  });

  it('ends and cleans resources when renderer attachment fails', async () => {
    const h = harness();
    h.renderer.xr.setSession.mockRejectedValue(new Error('WebGL setup failed'));
    await h.controller.start();
    expect(h.session.end).toHaveBeenCalledTimes(1);
    expect(h.status().session).toBe('error');
    expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(h.host.children).toHaveLength(0);
  });

  it('cleans an active session when the page controller is disposed', async () => {
    const h = harness(); await h.controller.start();
    h.controller.dispose();
    await vi.waitFor(() => expect(h.renderer.dispose).toHaveBeenCalledTimes(1));
    expect(h.session.end).toHaveBeenCalledTimes(1);
    expect(h.source.cancel).toHaveBeenCalledTimes(1);
  });

  it('releases application resources on disposal even if native end rejects', async () => {
    const h = harness(); await h.controller.start();
    h.session.end.mockRejectedValueOnce(new Error('platform end failed'));
    h.controller.dispose();
    await vi.waitFor(() => expect(h.renderer.dispose).toHaveBeenCalledTimes(1));
    expect(h.source.cancel).toHaveBeenCalledTimes(1);
    expect(h.host.children).toHaveLength(0);
    h.session.dispatchEvent(new Event('end')); // Browser/native exit eventually ends the platform session.
  });

  it('attempts to end AR on pagehide', async () => {
    const h = harness(); await h.controller.start();
    window.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => expect(h.status().session).toBe('ended'));
    expect(h.session.end).toHaveBeenCalledTimes(1);
  });

  it('exits with a clear error when WebGL context is lost', async () => {
    const h = harness(); await h.controller.start();
    h.renderer.domElement.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    await vi.waitFor(() => expect(h.status().session).toBe('error'));
    expect(h.status().message).toMatch(/context lost/);
    expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('cleans listeners, sources, anchors, GPU resources and canvas after native end', async () => {
    const h = harness(); await h.controller.start();
    const anchor = { anchorSpace: {}, delete: vi.fn() } as unknown as XRAnchor;
    h.controller.queuePlacement(); h.frame({ createAnchor: async () => anchor }); await Promise.resolve();
    const mesh = h.marker().children[0] as Mesh;
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material, 'dispose');
    const removeSession = vi.spyOn(h.session, 'removeEventListener');
    const removeSpace = vi.spyOn(h.space, 'removeEventListener');
    h.session.dispatchEvent(new Event('end')); await Promise.resolve();
    expect(h.status().session).toBe('ended');
    expect(h.source.cancel).toHaveBeenCalledTimes(1);
    expect(anchor.delete).toHaveBeenCalledTimes(1);
    expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(h.renderer.dispose).toHaveBeenCalledTimes(1); expect(h.renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(h.renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    expect(h.host.children).toHaveLength(0);
    expect(removeSession).toHaveBeenCalledWith('select', expect.any(Function));
    expect(removeSession).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeSpace).toHaveBeenCalledWith('reset', expect.any(Function));
    await h.controller.exit(); expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps an exit handle after end rejects, then successfully retries', async () => {
    const h = harness(); await h.controller.start();
    h.session.end.mockRejectedValueOnce(new Error('busy'));
    await h.controller.exit();
    expect(h.status().session).toBe('running');
    expect(h.status().message).toMatch(/Retry Exit/);
    expect(h.renderer.dispose).not.toHaveBeenCalled();
    await h.controller.exit(); expect(h.renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('can restart cleanly after exit', async () => {
    const h = harness(); await h.controller.start(); await h.controller.exit();
    await h.controller.start();
    expect(h.requestSession).toHaveBeenCalledTimes(2);
    expect(h.status().session).toBe('running');
    await h.controller.exit();
  });

  it('suppresses XR select for overlay buttons and handles visibility pause', async () => {
    const h = harness(); await h.controller.start();
    const button = document.createElement('button'); h.overlayRoot.append(button);
    const event = new Event('beforexrselect', { bubbles: true, cancelable: true });
    button.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    h.controller.queuePlacement(); h.frame();
    h.session.visibilityState = 'hidden'; h.session.dispatchEvent(new Event('visibilitychange'));
    expect(h.marker().visible).toBe(false);
    await h.controller.exit();
  });

  it('maps unsupported and conflicting sessions to clear errors', () => {
    expect(sessionError(new DOMException('', 'NotSupportedError'))).toMatch(/ARCore-certified/);
    expect(sessionError(new DOMException('', 'InvalidStateError'))).toMatch(/Another XR session/);
  });
});

function gateFixture(width = 640, height = 360): GateImage {
  return { image: document.createElement('img'), asset: { id: 'gate-test', name: 'Gate test', src: '/gate.png', widthPixels: width, heightPixels: height, placeholder: false } };
}

describe('Stage 3 gate placement with real spatial calibration', () => {
  it('fits the gate exactly between two arbitrary ground points, clearing stale size and offsets', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture());
    h.controller.setCalibration({ ...defaultCalibration, width: 9, scale: 2, x: 3, z: 1, elevation: .5, yaw: 40 });
    await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -2 }); h.controller.queuePlacement(); h.frame({ hitX: 3 });
    const gate = h.marker().children[1] as Mesh;
    expect(gate.scale.x).toBeCloseTo(5); expect(gate.scale.y).toBeCloseTo(5 * 360 / 640);
    expect(h.marker().matrix.elements[12]).toBeCloseTo(.5);
    expect(h.marker().matrix.elements[13]).toBeCloseTo(0); expect(h.marker().matrix.elements[14]).toBeCloseTo(-2);
    expect(h.onAutoFit).toHaveBeenCalledWith(expect.objectContaining({ width: 5, scale: 1, x: 0, z: 0, elevation: 0, yaw: 0 }), expect.objectContaining({ fitting: 'proportional' }));
    await h.controller.exit();
  });
  it('does not get stuck preparing a gate when the same pending resize is applied twice', async () => {
    const pending = deferred<ImageBitmap>(); vi.stubGlobal('createImageBitmap', vi.fn(() => pending.promise));
    try {
      const h = harness({ mode: 'gate', placementMethod: 'single-point' }), image = gateFixture(4096, 2048);
      h.controller.setGateImage(image); await h.controller.start();
      h.controller.setGateImage(image); expect(h.status().gateReady).toBe(false);
      pending.resolve({ width: 2048, height: 1024, close: vi.fn() } as unknown as ImageBitmap);
      await vi.waitFor(() => expect(h.status().gateReady).toBe(true));
      h.frame(); h.controller.queuePlacement(); h.frame(); expect(h.status().placement).toBe('Placed on surface');
      await h.controller.exit();
    } finally { vi.unstubAllGlobals(); }
  });
  it('previews an upright single-point gate, commits once and keeps it fixed as hits/viewer move', async () => {
    const h = harness({ mode: 'gate', placementMethod: 'single-point' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.frame({ hitX: 1, tilt: true }); expect(h.marker().visible).toBe(true);
    expect(h.status().placement).toBe('Not placed'); expect(h.status().surfaceReady).toBe(true);
    expect(h.marker().matrix.elements[5]).toBeCloseTo(1);
    h.frame({ hitX: 2, time: 16 }); expect(h.marker().matrix.elements[12]).toBeCloseTo(2);
    h.controller.queuePlacement(); h.frame({ hitX: 2, time: 32 });
    expect(h.status().locked).toBe(true); expect(h.status().placement).toBe('Placed on surface');
    const matrix = h.marker().matrix.clone();
    h.frame({ hitX: 9, x: 8, time: 48 }); expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.controller.setGateImage(gateFixture(900, 1800)); h.frame({ x: 12, time: 64 });
    expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.controller.lockPlacement(); h.frame({ hitX: 7, time: 80 });
    expect(h.reticle().matrix.elements[12]).toBe(7); expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.frame({ tracking: false, time: 96 }); expect(h.marker().visible).toBe(false); expect(h.reticle().visible).toBe(false);
    h.frame({ hitX: 4, time: 112 }); expect(h.marker().matrix.equals(matrix)).toBe(true);
    await h.controller.exit();
  });
  it('does not show a simple gate preview or enable placement without a valid hit', async () => {
    const h = harness({ mode: 'gate', placementMethod: 'single-point' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.frame({ hit: false }); expect(h.marker().visible).toBe(false); expect(h.status().surfaceReady).toBe(false);
    h.controller.queuePlacement(); h.frame({ hit: false }); expect(h.status().placement).toBe('Not placed');
    await h.controller.exit();
  });
  it('shows the captured left point in world space and supports retaking without clearing dimensions', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture());
    h.controller.setCalibration({ ...defaultCalibration, width: 4 }); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -2 });
    const left = (h.renderer.render.mock.lastCall?.[0] as Scene).children[2]!;
    expect(left.visible).toBe(true); expect(left.matrix.elements[12]).toBe(-2);
    h.frame({ x: 5, hitX: 8 }); expect(left.matrix.elements[12]).toBe(-2);
    h.controller.undoLeftBase(); expect(left.visible).toBe(false);
    expect(h.status().calibration).toBe('Capture left pillar base');
    h.controller.queuePlacement(); h.frame({ hitX: -1 });
    h.controller.queuePlacement(); h.frame({ hitX: 3 });
    expect(h.status().baseline).toBe(4); expect(left.visible).toBe(false);
    await h.controller.exit();
  });
  it('skips hit-result reads after placement and resumes them on reposition', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5 });
    h.controller.queuePlacement(); h.frame({ hitX: 1.5 });
    h.controller.lockPlacement();
    const placedFrame = h.frame(); expect(placedFrame.getHitTestResults).not.toHaveBeenCalled();
    h.controller.reset(); const scanningFrame = h.frame({ time: 200 });
    expect(scanningFrame.getHitTestResults).toHaveBeenCalledOnce();
    await h.controller.exit();
  });
  it('allows explicit manual placement when hit testing exists but finds no surface, without camera following', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hit: false });
    expect(h.status().placement).toBe('Not placed');
    h.controller.queuePlacement(true); h.frame({ hit: false, x: 1 });
    expect(h.status().placement).toBe('Placed 1.5 m ahead (no surface alignment)');
    expect(h.status().calibration).toMatch(/Manual alignment required/);
    expect(h.status().baseline).toBeNull();
    const matrix = h.marker().matrix.clone();
    h.frame({ x: 6 }); expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.controller.lockPlacement(); h.controller.queuePlacement(true); h.frame({ x: 8 });
    expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.frame({ tracking: false }); expect(h.marker().visible).toBe(false);
    h.frame({ x: 9 }); expect(h.marker().matrix.equals(matrix)).toBe(true);
    h.controller.reset();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5 });
    expect(h.status().calibration).toBe('Capture right pillar base');
    await h.controller.exit();
  });
  it('does not use a surface anchor for an explicitly manual placement even when a hit exists', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5 });
    const createAnchor = vi.fn();
    h.controller.queuePlacement(true); h.frame({ x: 2, hitX: 7, createAnchor });
    expect(createAnchor).not.toHaveBeenCalled();
    expect(h.status().baseline).toBeNull();
    expect(h.marker().matrix.elements[12]).toBe(2);
    expect(h.marker().matrix.elements[14]).toBe(-1.5);
    await h.controller.exit();
  });
  it('refuses manual placement during lost tracking and clears pending manual placement on reset', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(true); h.frame({ tracking: false });
    expect(h.status().placement).toBe('Not placed');
    h.frame(); expect(h.status().placement).toBe('Not placed');
    h.controller.queuePlacement(true); h.controller.reset(); h.frame();
    expect(h.status().placement).toBe('Not placed');
    await h.controller.exit();
  });
  it('requires two distinct real hits and keeps a vertical gate fixed as the viewer moves', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5, tilt: true });
    expect(h.status().calibration).toBe('Capture right pillar base');
    expect(h.marker().visible).toBe(false);
    h.controller.queuePlacement(); h.frame({ hitX: 1.5, tilt: true });
    expect(h.status().baseline).toBe(3);
    expect(h.marker().visible).toBe(true);
    expect(h.marker().matrix.elements[12]).toBeCloseTo(0);
    expect(h.marker().matrix.elements[5]).toBeCloseTo(1);
    const placed = h.marker().matrix.clone();
    h.frame({ x: 5, hitX: 9 });
    expect(h.marker().matrix.equals(placed)).toBe(true);
    expect(h.marker().children[0]?.visible).toBe(false);
    expect(h.marker().children[1]?.visible).toBe(true);
    await h.controller.exit();
  });
  it('rejects duplicate points and inconsistent base heights without claiming calibration', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: 0 });
    h.controller.queuePlacement(); h.frame({ hitX: 0.01 });
    expect(h.status().placement).toBe('Not placed');
    expect(h.status().message).toMatch(/distinct RIGHT/);
    h.controller.queuePlacement(); h.frame({ hitX: 3, hitY: 0.5 });
    expect(h.status().placement).toBe('Not placed');
    expect(h.status().message).toMatch(/25 cm/);
    h.controller.reset(); expect(h.status().calibration).toBe('Capture left pillar base');
    await h.controller.exit();
  });
  it('preserves calibration, adjustments, anchor and lock across image replacement', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5 });
    const anchor = { anchorSpace: {}, delete: vi.fn() } as unknown as XRAnchor;
    h.controller.queuePlacement(); h.frame({ hitX: 1.5, createAnchor: async () => anchor }); await Promise.resolve();
    expect(h.controller.setCalibration({ ...defaultCalibration, x: 0.2, elevation: 0.1, yaw: 5 })).toBe(true);
    h.frame({ hitX: 1.5 }); const matrix = h.marker().matrix.clone();
    h.controller.lockPlacement();
    expect(h.controller.setCalibration({ ...defaultCalibration, x: 5 })).toBe(false);
    h.session.dispatchEvent(new Event('select'));
    h.controller.setGateImage(gateFixture(1000, 1000)); h.frame({ hitX: 1.5, x: 9 });
    expect(h.marker().matrix.equals(matrix)).toBe(true);
    expect(h.status().locked).toBe(true);
    expect(h.status().baseline).toBe(3);
    expect(anchor.delete).not.toHaveBeenCalled();
    h.frame({ tracking: false }); expect(h.marker().visible).toBe(false);
    h.frame({ hitX: 1.5 }); expect(h.marker().visible).toBe(true);
    h.space.dispatchEvent(new Event('reset'));
    expect(h.status().placement).toBe('Not placed'); expect(h.status().locked).toBe(false);
    await h.controller.exit();
  });
  it('provides an explicitly approximate manual plane when hit testing is unavailable', async () => {
    const h = harness({ mode: 'gate', hitTest: false }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    expect(h.status().message).toMatch(/not depth-calibrated/);
    h.controller.queuePlacement(); h.frame({ x: 1 });
    expect(h.status().calibration).toMatch(/Manual alignment required/);
    expect(h.status().baseline).toBeNull();
    expect(h.marker().matrix.elements[12]).toBe(1);
    expect(h.marker().matrix.elements[14]).toBe(-1.5);
    h.controller.setCalibration({ ...defaultCalibration, elevation: -1.6 }); h.frame({ x: 5 });
    expect(h.marker().matrix.elements[13]).toBeCloseTo(0);
    expect(h.marker().matrix.elements[12]).toBe(1);
    await h.controller.exit();
  });
  it('does not place an untextured gate before the image is loaded', async () => {
    const h = harness({ mode: 'gate' }); await h.controller.start();
    h.controller.queuePlacement(); h.frame();
    expect(h.status().message).toMatch(/Load a gate image/);
    expect(h.status().placement).toBe('Not placed');
    await h.controller.exit();
  });
});

describe('Stage 5 live fitting transitions', () => {
  it('preserves lock/placement across appearance, before/after and catalogue changes; recovery restores the gate', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5 });
    h.controller.queuePlacement(); h.frame({ hitX: 1.5 });
    h.controller.setPresentation({ ...defaultPresentation, fitting: 'crop' });
    h.controller.lockPlacement(); const original = h.marker().matrix.clone();
    expect(h.controller.setPresentation({ ...defaultPresentation, fitting: 'proportional' })).toBe(false);
    expect(h.controller.setPresentation({ ...defaultPresentation, fitting: 'crop', opacity: 0.4, before: true })).toBe(true);
    expect(h.marker().children[1]?.visible).toBe(false);
    h.controller.setGateImage(gateFixture(480, 360)); h.frame({ x: 5, time: 16 });
    expect(h.marker().matrix.equals(original)).toBe(true); expect(h.status().locked).toBe(true);
    h.controller.setPresentation({ ...defaultPresentation, fitting: 'crop', opacity: 0.4, before: false });
    expect(h.marker().children[1]?.visible).toBe(true);
    h.frame({ tracking: false, time: 32 }); expect(h.marker().visible).toBe(false);
    h.frame({ x: 8, time: 48 }); expect(h.marker().visible).toBe(true); expect(h.marker().matrix.equals(original)).toBe(true);
    h.space.dispatchEvent(new Event('reset')); expect(h.status().locked).toBe(false); expect(h.status().placement).toBe('Not placed');
    await h.controller.exit();
  });
  it('nudges horizontally in the placed plane’s world direction and honors the lock', async () => {
    const h = harness({ mode: 'gate' }); h.controller.setGateImage(gateFixture()); await h.controller.start();
    h.controller.queuePlacement(); h.frame({ hitX: -1.5 }); h.controller.queuePlacement(); h.frame({ hitX: 1.5 });
    const next = h.controller.nudgeHorizontal(0.01)!; expect(next.x).toBeCloseTo(0.01); expect(next.z).toBeCloseTo(0);
    h.frame({ time: 16 }); expect(h.marker().matrix.elements[12]).toBeCloseTo(0.01);
    h.controller.lockPlacement(); expect(h.controller.nudgeHorizontal(0.01)).toBeNull();
    await h.controller.exit();
  });
});
