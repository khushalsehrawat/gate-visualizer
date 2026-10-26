import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpeningDetection } from './OpeningDetection';
import { preparePhoto } from './photo';
import { runDetection } from './client';
vi.mock('./photo', () => ({ preparePhoto: vi.fn() }));
vi.mock('./client', () => ({ runDetection: vi.fn() }));
const corners = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }];
beforeEach(() => {
  vi.mocked(preparePhoto).mockResolvedValue({ width: 320, height: 240, pixels: new Uint8ClampedArray(320 * 240 * 4), url: 'blob:photo-test' });
  vi.mocked(runDetection).mockReturnValue({ promise: Promise.resolve({ candidates: [], quality: 'no-opening', message: 'No supported quadrilateral found.', meanBrightness: 120, edgeDensity: 0.02 }), cancel: vi.fn() });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
});
function upload() { fireEvent.change(screen.getByLabelText('Take/select an entrance photo before AR'), { target: { files: [new File(['photo'], 'entrance.jpg', { type: 'image/jpeg' })] } }); }
describe('separate photo workflow', () => {
  it('blocks camera/photo capture during immersive sessions', () => {
    render(<OpeningDetection arActive locked={false} onBusy={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByLabelText('Take/select an entrance photo before AR')).toBeDisabled();
    expect(screen.getByText(/Exit AR before/)).toBeInTheDocument();
  });
  it('does not substitute a rectangle or a success state for failed detection', async () => {
    render(<OpeningDetection arActive={false} locked={false} onBusy={vi.fn()} onConfirm={vi.fn()} />);
    upload(); await screen.findByText('No supported quadrilateral found.');
    expect(screen.queryByRole('button', { name: /Select Top left corner/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm boundaries & measured dimensions' })).toBeDisabled();
    expect(screen.getByText(/tap Top left next/)).toBeInTheDocument();
  });
  it('requires review and tape dimensions, and clears confirmation on manual correction', async () => {
    const onConfirm = vi.fn();
    vi.mocked(runDetection).mockReturnValue({ promise: Promise.resolve({ candidates: [{ corners: corners as import('./geometry').Quad, score: 80, source: 'lines' }], quality: 'ok', message: 'Geometric proposals only', meanBrightness: 120, edgeDensity: 0.03 }), cancel: vi.fn() });
    render(<OpeningDetection arActive={false} locked={false} onBusy={vi.fn()} onConfirm={onConfirm} />);
    upload(); await screen.findByText('Geometric proposals only');
    expect(screen.getByText(/not calibrated probabilities/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm boundaries & measured dimensions' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tape-measured opening width (m)'), { target: { value: '3.5' } });
    fireEvent.change(screen.getByLabelText('Tape-measured gate height (m)'), { target: { value: '2' } });
    const confirm = screen.getByRole('button', { name: 'Confirm boundaries & measured dimensions' });
    expect(confirm).toBeDisabled();
    for (const label of ['Top left', 'Top right', 'Bottom right']) fireEvent.click(screen.getByLabelText(`${label} point is correct`));
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Bottom left point is correct'));
    expect(confirm).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm boundaries & measured dimensions' }));
    expect(onConfirm).toHaveBeenLastCalledWith({ corners, source: 'proposal', width: 3.5, height: 2 });
    expect(screen.getByText(/No world placement or anchor has been created/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5 px →' }));
    expect(onConfirm).toHaveBeenLastCalledWith(null);
    expect(confirm).toBeDisabled();
    expect(screen.getByLabelText('Top left point is correct')).not.toBeChecked();
    expect(screen.getByText(/no automatic confidence assigned/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /magnifier/ })).toBeInTheDocument();
  });
  it('invalidates every point review when dimensions change or a reviewed point is unchecked', async () => {
    const onConfirm = vi.fn();
    vi.mocked(runDetection).mockReturnValue({ promise: Promise.resolve({ candidates: [{ corners: corners as import('./geometry').Quad, score: 80, source: 'lines' }], quality: 'ok', message: 'Review these points', meanBrightness: 120, edgeDensity: 0.03 }), cancel: vi.fn() });
    render(<OpeningDetection arActive={false} locked={false} onBusy={vi.fn()} onConfirm={onConfirm} />);
    upload(); await screen.findByText('Review these points');
    fireEvent.change(screen.getByLabelText('Tape-measured opening width (m)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Tape-measured gate height (m)'), { target: { value: '2' } });
    const checks = screen.getAllByRole('checkbox');
    checks.forEach((check) => fireEvent.click(check));
    const confirm = screen.getByRole('button', { name: 'Confirm boundaries & measured dimensions' });
    fireEvent.click(confirm);
    fireEvent.click(checks[0]!);
    expect(onConfirm).toHaveBeenLastCalledWith(null);
    expect(confirm).toBeDisabled();
    fireEvent.click(checks[0]!);
    expect(confirm).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Tape-measured opening width (m)'), { target: { value: '3.5' } });
    checks.forEach((check) => expect(check).not.toBeChecked());
    expect(confirm).toBeDisabled();
  });
  it('keeps manual marking available when a worker fails', async () => {
    vi.mocked(runDetection).mockReturnValue({ promise: Promise.reject(new Error('Worker blocked')), cancel: vi.fn() });
    render(<OpeningDetection arActive={false} locked={false} onBusy={vi.fn()} onConfirm={vi.fn()} />);
    await act(async () => { upload(); });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Worker blocked'));
    expect(screen.getByRole('button', { name: /Mark four corners/ })).toBeEnabled();
  });
});
