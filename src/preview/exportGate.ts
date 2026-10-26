import { gateLayout } from '../geometry/fitting';
import type { GateCalibration } from '../geometry/calibration';
import type { GateImage } from '../gates/loadImage';
import { adjustedChannel } from '../gates/presentation';
import type { GatePresentation } from '../gates/presentation';

// Browser 2D asset export only: this never reads an XR framebuffer/passthrough.
export async function exportGateOnly(gate: GateImage, calibration: GateCalibration, settings: GatePresentation): Promise<Blob> {
  const layout = gateLayout(calibration.width, calibration.height, gate.asset.widthPixels, gate.asset.heightPixels, settings.fitting, calibration.scale);
  const factor = 1024 / Math.max(layout.width, layout.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(layout.width * factor)); canvas.height = Math.max(1, Math.round(layout.height * factor));
  try {
    if (typeof canvas.toBlob !== 'function') throw new Error('Browser PNG encoding is unsupported. Use Android system screenshot controls if permitted; XR passthrough capture remains unverified.');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('PNG export is unavailable in this browser. Use the original image or Android system screenshot controls.');
    const { widthPixels: width, heightPixels: height } = gate.asset;
    // Image origin is top-left; texture UV origin is bottom-left.
    context.drawImage(gate.image, layout.offsetX * width, (1 - layout.offsetY - layout.repeatY) * height, layout.repeatX * width, layout.repeatY * height, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const lookup = Array.from({ length: 256 }, (_, value) => Math.round(adjustedChannel(value / 255, settings) * 255));
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = lookup[pixels.data[i]!]!; pixels.data[i + 1] = lookup[pixels.data[i + 1]!]!; pixels.data[i + 2] = lookup[pixels.data[i + 2]!]!;
      pixels.data[i + 3] = Math.round(pixels.data[i + 3]! * settings.opacity);
    }
    context.putImageData(pixels, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Browser PNG encoding failed. No AR screenshot was captured.')), 'image/png'));
  } finally { canvas.width = 0; canvas.height = 0; }
}
