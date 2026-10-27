import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import LivePreview from './LivePreview';
import { initialXRStatus } from './xr/session';
import { defaultCalibration } from './geometry/calibration';
import { defaultPresentation } from './gates/presentation';

const { manual } = vi.hoisted(() => ({ manual: vi.fn() }));
vi.mock('./gates/GateProvider', () => ({ useGateLibrary: () => ({
  gate: { asset: { id: 'test', name: 'Test gate', src: '/gates/gate-01.png', widthPixels: 640, heightPixels: 360, placeholder: true } },
  loading: false, error: '', load: vi.fn(),
}) }));
vi.mock('./xr/useXRSession', () => ({ useXRSession: () => ({
  status: { ...initialXRStatus, session: 'running', tracking: 'Tracking', hitTest: 'Scanning; no surface yet' },
  hostRef: { current: null }, overlayRef: { current: null }, mode: 'gate', setMode: vi.fn(),
  calibration: defaultCalibration, configure: vi.fn(), presentation: defaultPresentation, present: vi.fn(),
  horizontal: vi.fn(), start: vi.fn(), place: vi.fn(), placeManual: manual,
  reset: vi.fn(), reposition: vi.fn(), lock: vi.fn(), exit: vi.fn(),
}) }));

it('requires explicit approximation confirmation when scanning stalls; cancelling never places', async () => {
  render(<LivePreview />);
  expect(manual).not.toHaveBeenCalled();
  const entry = screen.getByRole('button', { name: 'No surface? Place manually' });
  fireEvent.click(entry);
  expect(screen.getByRole('group', { name: 'Confirm approximate placement' })).toHaveTextContent('does not measure the entrance depth');
  expect(manual).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep scanning' }));
  expect(screen.queryByRole('group', { name: 'Confirm approximate placement' })).not.toBeInTheDocument();
  expect(manual).not.toHaveBeenCalled();
  fireEvent.click(entry);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm approximate placement' }));
  expect(manual).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('group', { name: 'Confirm approximate placement' })).not.toBeInTheDocument();
  await screen.findByTestId('debug-capability');
});
