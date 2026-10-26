import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ConfirmedOpening } from './detection/types';
import LivePreview from './LivePreview';
import { GateProvider } from './gates/GateProvider';
import { mockReadyImage } from './test/mockReadyImage';
function App() { return <GateProvider><LivePreview /></GateProvider>; }
afterEach(() => { vi.unstubAllGlobals(); });
vi.mock('./detection/OpeningDetection', () => ({ OpeningDetection: ({ onConfirm }: { onConfirm: (opening: ConfirmedOpening) => void }) => <button onClick={() => onConfirm({
  corners: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }], source: 'proposal', width: 3.5, height: 2,
})}>Confirm reviewed test photo</button> }));
it('transfers only confirmed measurements into calibration and still needs a gesture plus real XR hits', async () => {
  mockReadyImage();
  const requestSession = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'xr', { configurable: true, value: { isSessionSupported: vi.fn().mockResolvedValue(true), requestSession } });
  render(<App />);
  await waitFor(() => expect(screen.getByTestId('debug-capability')).toHaveTextContent(/^supported$/));
  fireEvent.click(screen.getByText('Optional: prepare opening boundaries from a photo'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm reviewed test photo' }));
  fireEvent.click(screen.getByText('Gate calibration & image'));
  expect(screen.getByLabelText('Entrance width (m)')).toHaveValue(3.5);
  expect(screen.getByLabelText('Gate height (m)')).toHaveValue(2);
  expect(screen.getByText(/Photo pixels have not supplied a world pose or depth/)).toBeInTheDocument();
  expect(requestSession).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Start AR' }));
  expect(requestSession).toHaveBeenCalledTimes(1);
  await screen.findByText(/AR permission was denied/);
});
