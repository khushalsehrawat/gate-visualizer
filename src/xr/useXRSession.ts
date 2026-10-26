import { useEffect, useRef, useState } from 'react';
import { initialXRStatus, XRSessionController } from './session';
import { defaultCalibration, validCalibration } from '../geometry/calibration';
import type { GateCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';
import { defaultPresentation, validPresentation } from '../gates/presentation';
import type { GatePresentation } from '../gates/presentation';

export function useXRSession(gate: GateImage | null) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const controller = useRef<XRSessionController | null>(null);
  const controllerMode = useRef('');
  const [status, setStatus] = useState(initialXRStatus);
  const [mode, setMode] = useState<'gate' | 'marker'>('gate');
  const [calibration, setConfig] = useState<GateCalibration>({ ...defaultCalibration });
  const [presentation, setAppearance] = useState<GatePresentation>({ ...defaultPresentation });
  useEffect(() => () => { controller.current?.dispose(); controller.current = null; }, []);
  useEffect(() => { if (gate) controller.current?.setGateImage(gate); }, [gate]);

  function configure(next: GateCalibration) {
    if (status.locked || !validCalibration(next)) return;
    controller.current?.setCalibration(next);
    setConfig(next);
  }

  function present(next: GatePresentation) {
    if (!validPresentation(next) || (status.locked && next.fitting !== presentation.fitting)) return;
    controller.current?.setPresentation(next); setAppearance(next);
  }
  function horizontal(step: number) {
    const next = controller.current?.nudgeHorizontal(step);
    if (next) setConfig(next);
  }

  function reposition() {
    controller.current?.reset();
    const next = { ...calibration, x: 0, z: 0, elevation: 0, yaw: 0 };
    controller.current?.setCalibration(next); setConfig(next);
    const after = { ...presentation, before: false }; controller.current?.setPresentation(after); setAppearance(after);
  }

  function reset() {
    controller.current?.reset();
    controller.current?.setCalibration(defaultCalibration);
    setConfig({ ...defaultCalibration });
    controller.current?.setPresentation(defaultPresentation); setAppearance({ ...defaultPresentation });
  }

  function start() {
    if (!window.isSecureContext || !navigator.xr?.requestSession || !hostRef.current || !overlayRef.current) {
      setStatus({ ...initialXRStatus, session: 'error', message: 'WebXR session API is unavailable. Open Chrome on a supported Android phone over trusted HTTPS.' });
      return;
    }
    if (controllerMode.current !== mode) { controller.current?.dispose(); controller.current = null; }
    controllerMode.current = mode;
    controller.current ??= new XRSessionController({ xr: navigator.xr, host: hostRef.current, overlay: overlayRef.current, onStatus: setStatus, mode });
    if (gate) controller.current.setGateImage(gate);
    controller.current.setCalibration(calibration);
    const after = { ...presentation, before: false }; controller.current.setPresentation(after); setAppearance(after);
    void controller.current.start();
  }
  return { status, hostRef, overlayRef, mode, setMode, calibration, configure, presentation, present, horizontal, start, place: () => controller.current?.queuePlacement(), placeManual: () => controller.current?.queuePlacement(true), reset, reposition, lock: () => controller.current?.lockPlacement(), exit: () => { void controller.current?.exit(); } };
}
