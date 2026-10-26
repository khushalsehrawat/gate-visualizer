// Original flat raster placeholders; no product photos, 3D models or third-party art.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, crc]);
}
for (const [name, width, height, style] of [['gate-02', 640, 360, 'horizontal'], ['gate-03', 480, 360, 'vertical'], ['gate-04', 640, 360, 'minimal'], ['gate-05', 640, 360, 'laser'], ['gate-06', 640, 360, 'classic'], ['gate-07', 640, 360, 'luxury']]) {
  const pixels = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const frame = x < 12 || x >= width - 12 || y < 12 || y >= height - 12 || Math.abs(x - width / 2) < 5;
    const bar = style === 'vertical' ? x % 32 < 6 : style === 'horizontal' ? y % 40 < 9 : style === 'minimal' ? y > height * 0.42 && y < height * 0.49 : style === 'laser' ? Math.abs((x + y) % 64 - 32) < 5 || Math.abs((x - y + 1024) % 64 - 32) < 5 : style === 'classic' ? x % 40 < 7 || Math.abs(y - 75 - 35 * Math.sin(x / width * Math.PI)) < 5 : x % 100 < 8 || y > height - 60 || y < 50;
    if (frame || bar) pixels.set(style === 'luxury' ? [91, 80, 59, 255] : style === 'vertical' ? [67, 72, 76, 255] : [47, 53, 58, 255], y * (1 + width * 4) + 1 + x * 4);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  writeFileSync(new URL(`../public/gates/${name}.png`, import.meta.url), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]));
}
