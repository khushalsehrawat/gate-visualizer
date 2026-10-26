import { vi } from 'vitest';
export function mockReadyImage() {
  vi.stubGlobal('Image', class {
    naturalWidth = 640; naturalHeight = 360;
    onload: (() => void) | null = null; onerror: (() => void) | null = null;
    set src(value: string) { void value; queueMicrotask(() => this.onload?.()); }
  });
}
