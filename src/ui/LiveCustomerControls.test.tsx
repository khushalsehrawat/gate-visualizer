import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import LivePreview from '../LivePreview';
import { initialXRStatus } from '../xr/session';
import type { XRStatus } from '../xr/session';
import { defaultCalibration } from '../geometry/calibration';
import { defaultPresentation } from '../gates/presentation';
const f = vi.hoisted(() => ({ status: null as XRStatus | null, place: vi.fn(), load: vi.fn(), reposition: vi.fn(), chooseMethod: vi.fn(), lock: vi.fn() }));
vi.mock('../gates/GateProvider', () => ({ useGateLibrary: () => ({ gate: { asset: { name: 'Own gate', widthPixels: 640, heightPixels: 360 } }, loading: false, error: '', load: f.load }) }));
vi.mock('../xr/useXRSession', () => ({ useXRSession: () => ({ status: f.status, hostRef: { current: null }, overlayRef: { current: null }, mode: 'gate', setMode: vi.fn(), placementMethod: 'single-point', chooseMethod: f.chooseMethod, calibration: defaultCalibration, configure: vi.fn(), presentation: defaultPresentation, present: vi.fn(), horizontal: vi.fn(), start: vi.fn(), place: f.place, undoLeft: vi.fn(), placeManual: vi.fn(), reset: vi.fn(), reposition: f.reposition, lock: f.lock, exit: vi.fn() }) }));
beforeEach(() => { vi.clearAllMocks(); f.status = { ...initialXRStatus, session: 'running', tracking: 'Tracking', hitTest: 'Surface found', surfaceReady: true, gateReady: true }; });
it('offers one Place Gate action and never enables it from a stale surface string', () => {
  f.status!.surfaceReady = false;
  const { rerender } = render(<LivePreview />);
  expect(screen.getByText('Finding Surface')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Place Gate' })).toBeDisabled();
  expect(screen.queryByLabelText('World X offset (m)')).not.toBeInTheDocument();
  f.status = { ...f.status!, surfaceReady: true }; rerender(<LivePreview />);
  expect(screen.getByText('Ready to Place')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Place Gate' })); expect(f.place).toHaveBeenCalledOnce();
});
it('prioritizes Change Gate and Reset after placement without requiring unlock for image replacement', () => {
  f.status = { ...f.status!, placement: 'Placed on surface', locked: true };
  render(<LivePreview />);
  expect(screen.getByText('Gate Placed')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Place Gate' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Change Gate' })).toBeEnabled();
  const file = new File(['gate'], 'new-gate.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Gate image for Live AR'), { target: { files: [file] } }); expect(f.load).toHaveBeenCalledWith(file);
  fireEvent.click(screen.getByRole('button', { name: 'Reset' })); expect(f.reposition).toHaveBeenCalledOnce();
});
it('keeps precise two-pillar fitting available only inside Fine Tune', async () => {
  render(<LivePreview />); fireEvent.click(screen.getByText('Fine Tune'));
  const method = await screen.findByLabelText('Placement method');
  fireEvent.change(method, { target: { value: 'two-point' } }); expect(f.chooseMethod).toHaveBeenCalledWith('two-point');
  expect(screen.getByLabelText('World X offset (m)')).toBeInTheDocument();
});
it('shows recovery separately from device validation and never enables placement without a current hit', () => {
  f.status = { ...f.status!, trackingRecovery: 'recovering', tracking: 'Lost; move slowly to recover', surfaceReady: false };
  const { rerender } = render(<LivePreview />);
  expect(screen.getByText('Reconnecting')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Place Gate' })).toBeDisabled();
  expect(screen.queryByText(/device.*unverified/i)).not.toBeInTheDocument();
  f.status = { ...f.status!, placement: 'Placed on surface', tracking: 'Tracking', trackingRecovery: 'recovering' }; rerender(<LivePreview />);
  expect(screen.getByText('Reconnecting')).toBeInTheDocument();
  expect(screen.getByText(/placement is kept/)).toBeInTheDocument();
});
