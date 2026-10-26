import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGateImage, validateUpload } from './loadImage';

const images: FakeImage[] = [];
class FakeImage {
  naturalWidth = 640; naturalHeight = 360; src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { images.push(this); }
}
beforeEach(() => { images.length = 0; vi.stubGlobal('Image', FakeImage); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('gate image loading', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s uploads', (type) => {
    expect(() => validateUpload(new File(['test'], 'gate', { type }))).not.toThrow();
  });
  it('rejects unsupported and oversize files', () => {
    expect(() => validateUpload(new File(['svg'], 'gate.svg', { type: 'image/svg+xml' }))).toThrow(/PNG, JPG or WebP/);
    const file = new File(['large'], 'gate.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    expect(() => validateUpload(file)).toThrow(/10 MB/);
  });
  it('uses decoded pixel dimensions rather than trusting file metadata', async () => {
    const pending = loadGateImage('/gates/gate-01.png', 'Sample', true);
    images[0]!.naturalWidth = 800; images[0]!.naturalHeight = 400; images[0]!.onload!();
    const loaded = await pending;
    expect(loaded.asset).toMatchObject({ widthPixels: 800, heightPixels: 400, placeholder: true });
    expect(images[0]!.onload).toBeNull();
  });
  it('rejects images that exceed the mobile texture limit', async () => {
    const pending = loadGateImage('/huge.png', 'Huge');
    images[0]!.naturalWidth = 5000; images[0]!.onload!();
    await expect(pending).rejects.toThrow(/4096/);
  });
  it('reports decode failures without a broken replacement', async () => {
    const pending = loadGateImage('/bad.png', 'Invalid');
    images[0]!.onerror!();
    await expect(pending).rejects.toThrow(/previous gate is retained/);
    expect(images[0]!.onerror).toBeNull();
  });
});
