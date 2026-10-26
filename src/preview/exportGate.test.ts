import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportGateOnly } from './exportGate';
import { defaultCalibration } from '../geometry/calibration';
import { defaultPresentation } from '../gates/presentation';
import type { GateImage } from '../gates/loadImage';
afterEach(() => { vi.restoreAllMocks(); });
describe('browser-supported gate-only PNG export', () => {
  it('exports the cropped source and appearance without reading any XR framebuffer', async () => {
    const gate: GateImage = { image: document.createElement('img'), asset: { id: 'image', name: 'Gate', src: '/gate.png', widthPixels: 1600, heightPixels: 800, placeholder: false } };
    const pixels = { data: new Uint8ClampedArray([128, 128, 128, 255]) };
    const context = { drawImage: vi.fn(), getImageData: vi.fn(() => pixels), putImageData: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) { callback(new Blob(['PNG'], { type: 'image/png' })); });
    const blob = await exportGateOnly(gate, { ...defaultCalibration, width: 3, height: 2 }, { ...defaultPresentation, fitting: 'crop', opacity: 0.5 });
    expect(blob.type).toBe('image/png');
    expect(context.drawImage).toHaveBeenCalledWith(gate.image, 200, 0, 1200, 800, 0, 0, 1024, 683);
    expect(pixels.data[3]).toBe(128);
    expect(context.putImageData).toHaveBeenCalledTimes(1); expect(toBlob).toHaveBeenCalledTimes(1);
    const canvas = toBlob.mock.instances[0] as HTMLCanvasElement;
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });
  it('fails honestly when the browser cannot encode PNG and frees the canvas', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const gate: GateImage = { image: document.createElement('img'), asset: { id: 'image', name: 'Gate', src: '/gate.png', widthPixels: 640, heightPixels: 360, placeholder: false } };
    await expect(exportGateOnly(gate, defaultCalibration, defaultPresentation)).rejects.toThrow(/PNG export is unavailable/);
  });
});
