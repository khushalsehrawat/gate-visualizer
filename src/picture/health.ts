import type { Quad } from '../detection/geometry';
export const pictureEvidenceLifetime = 500;
export class PictureHealth {
  private lastGood = -Infinity;
  private began: number | null = null;
  accept(corners: Quad | null, capturedAt: number, now: number) {
    this.began ??= now;
    if (corners && now >= capturedAt && now - capturedAt <= pictureEvidenceLifetime) {
      this.lastGood = capturedAt; return { visible: true, message: 'Live picture preview — keep the confirmed region in view. Gate hides whenever matching is uncertain.' };
    }
    return { visible: false, message: now - this.lastGood < 1200
      ? 'Live picture preview — keep the confirmed region in view. Gate hides whenever matching is uncertain.'
      : now - this.began < 1200 ? 'Searching for your confirmed region. Move slowly and keep its details visible.'
      : 'Picture not matched — gate hidden. Hold still, improve lighting, or select a more detailed region.' };
  }
}
