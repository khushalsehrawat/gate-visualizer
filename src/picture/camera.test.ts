import { afterEach, describe, expect, it, vi } from 'vitest';
import { PictureCamera } from './camera';
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
    expect(h.video.srcObject).toBe(h.stream); camera.stop(); expect(h.stop).toHaveBeenCalledOnce();
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
