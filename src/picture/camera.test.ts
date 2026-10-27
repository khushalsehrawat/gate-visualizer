import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturePictureFrame, PictureCamera } from './camera';
afterEach(() => { vi.restoreAllMocks(); });
function fixture() {
  const stop = vi.fn(), stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const video = document.createElement('video'); vi.spyOn(video, 'play').mockResolvedValue();
  return { stop, stream, getUserMedia, video };
}
describe('separate picture camera lifecycle', () => {
  it('opens one rear camera without audio and stops its tracks', async () => {
    const h = fixture(), camera = new PictureCamera();
    expect(await camera.start(h.video)).toBe(true);
    expect(h.getUserMedia).toHaveBeenCalledOnce();
    expect(h.getUserMedia.mock.calls[0]![0]).toMatchObject({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    expect(h.getUserMedia.mock.calls[0]![0]).toMatchObject({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
    expect(h.video.srcObject).toBe(h.stream); camera.stop(); expect(h.stop).toHaveBeenCalledOnce();
  });
  it('requests continuous autofocus only when the active track reports support', async () => {
    const h = fixture(), applyConstraints = vi.fn().mockResolvedValue(undefined);
    const track = { stop: h.stop, getCapabilities: () => ({ focusMode: ['continuous'] }), applyConstraints };
    h.getUserMedia.mockResolvedValue({ getTracks: () => [track], getVideoTracks: () => [track] });
    const camera = new PictureCamera(); await camera.start(h.video);
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: 'continuous' }] }); camera.stop();
  });
  it('keeps high-resolution frozen display captures separate from small analysis pixels', async () => {
    const video = document.createElement('video');
    Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 1920 }, videoHeight: { value: 1080 } });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, getImageData: () => ({ data: new Uint8ClampedArray(360 * 203 * 4) }) } as unknown as CanvasRenderingContext2D);
    const encodedSizes: number[][] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) { encodedSizes.push([this.width, this.height]); callback(new Blob(['HD frame'], { type: 'image/png' })); });
    const frame = await capturePictureFrame(video, document.createElement('canvas'));
    expect(encodedSizes).toEqual([[1280, 720]]); expect(frame.width).toBe(360); expect(frame.height).toBe(203);
    expect(frame.pixels.length).toBe(360 * 203 * 4); expect(frame.blob.type).toBe('image/png');
    expect(drawImage.mock.calls[0]).toEqual([video, 0, 0, 1280, 720]);
  });
  it('stops late camera permission results after the user has left', async () => {
    const h = fixture(), camera = new PictureCamera();
    let resolve!: (stream: MediaStream) => void;
    h.getUserMedia.mockReturnValue(new Promise((done) => { resolve = done; }));
    const start = camera.start(h.video); camera.stop(); resolve(h.stream);
    expect(await start).toBe(false); expect(h.stop).toHaveBeenCalledOnce(); expect(h.video.srcObject).not.toBe(h.stream);
  });
  it('releases a camera if playback fails and rejects insecure origins', async () => {
    const h = fixture(), camera = new PictureCamera(); vi.mocked(h.video.play).mockRejectedValue(new Error('Playback failed'));
    await expect(camera.start(h.video)).rejects.toThrow('Playback failed'); expect(h.stop).toHaveBeenCalledOnce();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    await expect(camera.start(h.video)).rejects.toThrow('HTTPS'); expect(h.getUserMedia).toHaveBeenCalledOnce();
  });
});
