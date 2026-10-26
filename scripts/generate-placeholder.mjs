// Original local raster placeholder; no downloaded or third-party imagery.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const width = 640, height = 360;
const pixels = Buffer.alloc(height * (1 + width * 4));
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const frame = x >= 32 && x <= 608 && y >= 36 && y <= 324;
    const ink = frame && (x < 44 || x > 596 || y < 49 || y > 311 || Math.abs(x - 320) < 7 || (x % 36 < 7) || (y > 238 && y < 250));
    if (ink) pixels.set([39, 57, 66, 255], y * (1 + width * 4) + 1 + x * 4);
  }
}
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
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
writeFileSync(new URL('../public/gates/gate-placeholder.png', import.meta.url), Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
]));
