import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LivePicture from './LivePicture';
const f = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), request: vi.fn(), dispose: vi.fn(), show: vi.fn(), hide: vi.fn(), overlayDispose: vi.fn() }));
const corners = [{ x: .1, y: .1 }, { x: .9, y: .1 }, { x: .9, y: .9 }, { x: .1, y: .9 }];
vi.mock('../gates/GateProvider', () => ({ useGateLibrary: () => ({ gate: { asset: { name: 'Uploaded gate' } }, load: vi.fn(), loading: false, error: '' }) }));
vi.mock('./camera', () => ({ PictureCamera: class { start = f.start; stop = f.stop; }, pictureFrame: () => ({ width: 400, height: 300, pixels: new Uint8ClampedArray(400 * 300 * 4) }) }));
vi.mock('./workerClient', () => ({ createPictureWorker: () => ({ request: f.request, dispose: f.dispose }) }));
vi.mock('./overlay', () => ({ createPictureOverlay: () => ({ show: f.show, hide: f.hide, dispose: f.overlayDispose }) }));
vi.mock('./ReviewGatePreview', () => ({ ReviewGatePreview: () => <div data-testid="frozen-fit-preview">Fitted preview on frozen frame</div> }));
vi.mock('../detection/client', () => ({ runDetection: () => ({ promise: Promise.resolve({ candidates: [{ corners, score: 80 }] }), cancel: vi.fn() }) }));
beforeEach(() => {
  vi.clearAllMocks(); f.start.mockResolvedValue(true); f.request.mockResolvedValue({ corners, matches: 30, inliers: 25 });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['photo'], { type: 'image/png' })));
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:picture') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); });
async function review() {
  fireEvent.click(screen.getByRole('button', { name: 'Start picture camera' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Freeze picture / select again' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Freeze picture / select again' }));
  await screen.findByText(/Unconfirmed geometric proposal/);
}
it('requires four confirmations before matching and stops camera/worker on exit', async () => {
  const { unmount } = render(<LivePicture />); await review();
  const confirm = screen.getByRole('button', { name: 'Confirm points & track picture live' });
  expect(confirm).toBeDisabled();
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  fireEvent.click(confirm);
  await screen.findByText(/Live picture preview — keep the confirmed region/);
  expect(f.request.mock.calls[0]![0]).toMatchObject({ type: 'reference', corners });
  expect(f.show).toHaveBeenCalledWith(corners, 1, expect.objectContaining({ mode: 'fit', width: 1, height: 1 }));
  fireEvent.click(screen.getByRole('button', { name: 'Stop picture camera' }));
  expect(f.dispose).toHaveBeenCalled(); expect(f.overlayDispose).toHaveBeenCalled();
  const stops = f.stop.mock.calls.length; unmount(); expect(f.stop.mock.calls.length).toBeGreaterThan(stops);
});
it('hides the gate on insufficient image evidence instead of showing a default alignment', async () => {
  f.request.mockResolvedValue({ corners: null, matches: 3, inliers: 2 });
  render(<LivePicture />); await review();
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm points & track picture live' }));
  await screen.findByText(/Searching for your confirmed region/);
  expect(f.show).not.toHaveBeenCalled(); expect(f.hide).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Stop picture camera' }));
});
it('supports region selection and fitting edits without inventing a default rectangle', async () => {
  render(<LivePicture />); await review();
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  const confirm = screen.getByRole('button', { name: 'Confirm points & track picture live' });
  expect(confirm).toBeEnabled();
  expect(screen.getByTestId('frozen-fit-preview')).toBeInTheDocument();
  expect(f.request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Manual region'));
  fireEvent.click(screen.getByRole('button', { name: 'Select any region manually / clear points' }));
  expect(confirm).toBeDisabled(); expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.getByText(/No automatic rectangle is supplied/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Suggest points' }));
  await screen.findByRole('checkbox', { name: 'Top left is correct' });
  fireEvent.click(screen.getByText('Adjust gate'));
  fireEvent.change(screen.getByLabelText('Picture fitting mode'), { target: { value: 'crop' } });
  fireEvent.change(screen.getByLabelText(/Gate width:/), { target: { value: '1.2' } });
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  fireEvent.click(confirm);
  await screen.findByText(/Live picture preview — keep the confirmed region/);
  expect(f.show).toHaveBeenCalledWith(corners, 1, expect.objectContaining({ mode: 'crop', width: 1.2 }));
  fireEvent.click(screen.getByRole('button', { name: 'Stop picture camera' }));
});
