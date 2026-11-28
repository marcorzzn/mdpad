import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function blendPixel(buf, width, height, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= width || y >= height || a <= 0) return;
  const idx = (y * width + x) * 4;
  const srcA = a / 255;
  const dstA = buf[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  buf[idx] = Math.round((r * srcA + buf[idx] * dstA * (1 - srcA)) / outA);
  buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA);
  buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA);
  buf[idx + 3] = Math.round(outA * 255);
}

function roundedRectCoverage(px, py, x0, y0, x1, y1, radius) {
  const cx = Math.max(x0 + radius, Math.min(px, x1 - radius));
  const cy = Math.max(y0 + radius, Math.min(py, y1 - radius));
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy) - radius;
  return Math.max(0, Math.min(1, 0.5 - dist));
}

function drawRoundedRect(buf, size, x0, y0, x1, y1, radius, color) {
  const [r, g, b, a = 255] = color;
  const minX = Math.max(0, Math.floor(x0 - 1));
  const maxX = Math.min(size - 1, Math.ceil(x1 + 1));
  const minY = Math.max(0, Math.floor(y0 - 1));
  const maxY = Math.min(size - 1, Math.ceil(y1 + 1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cov = roundedRectCoverage(x + 0.5, y + 0.5, x0, y0, x1, y1, radius);
      if (cov > 0) {
        blendPixel(buf, size, size, x, y, r, g, b, Math.round(a * cov));
      }
    }
  }
}

function drawLineSegment(buf, size, x0, y0, x1, y1, thickness, color) {
  const [r, g, b, a = 255] = color;
  const half = thickness / 2;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 2));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + half + 2));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 2));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + half + 2));
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy || 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
      const projX = x0 + t * dx;
      const projY = y0 + t * dy;
      const dist = Math.hypot(px - projX, py - projY) - half;
      const cov = Math.max(0, Math.min(1, 0.5 - dist));
      if (cov > 0) {
        blendPixel(buf, size, size, x, y, r, g, b, Math.round(a * cov));
      }
    }
  }
}

function renderMdPadIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const s = size / 256;

  // Soft drop shadow
  drawRoundedRect(buf, size, 32 * s, 26 * s, 224 * s, 238 * s, 28 * s, [15, 23, 42, 42]);

  // Crisp white Windows 11 Notepad page
  drawRoundedRect(buf, size, 30 * s, 22 * s, 226 * s, 232 * s, 26 * s, [248, 250, 252, 255]);

  // Subtle 1px slate border
  drawRoundedRect(buf, size, 30 * s, 22 * s, 226 * s, 232 * s, 26 * s, [203, 213, 225, 95]);
  drawRoundedRect(buf, size, 33 * s, 25 * s, 223 * s, 229 * s, 23 * s, [255, 255, 255, 255]);

  // Cobalt Windows Notepad header binding strip (rounded top, flat bottom)
  drawRoundedRect(buf, size, 30 * s, 22 * s, 226 * s, 80 * s, 24 * s, [11, 92, 171, 255]);
  drawRoundedRect(buf, size, 30 * s, 54 * s, 226 * s, 82 * s, 0, [11, 92, 171, 255]);

  // Subtle top highlight on binding strip
  drawRoundedRect(buf, size, 34 * s, 26 * s, 222 * s, 46 * s, 18 * s, [37, 131, 219, 120]);

  // Spiral binding notches (clean minimalist)
  for (let i = 0; i < 4; i++) {
    const cx = (66 + i * 41) * s;
    drawRoundedRect(buf, size, cx - 7 * s, 12 * s, cx + 7 * s, 40 * s, 7 * s, [15, 62, 117, 255]);
    drawRoundedRect(buf, size, cx - 4 * s, 14 * s, cx + 4 * s, 36 * s, 4 * s, [147, 197, 253, 255]);
  }

  // Subtle document lines on page
  drawRoundedRect(buf, size, 54 * s, 102 * s, 198 * s, 112 * s, 5 * s, [203, 213, 225, 255]);
  drawRoundedRect(buf, size, 54 * s, 126 * s, 162 * s, 136 * s, 5 * s, [226, 232, 240, 255]);

  // Crisp Markdown badge at bottom of page
  drawRoundedRect(buf, size, 52 * s, 152 * s, 204 * s, 212 * s, 14 * s, [15, 118, 110, 255]);

  // Letter "M" inside badge
  const stroke = Math.max(2, 10 * s);
  const white = [255, 255, 255, 255];
  drawLineSegment(buf, size, 74 * s, 197 * s, 74 * s, 167 * s, stroke, white);
  drawLineSegment(buf, size, 74 * s, 167 * s, 94 * s, 188 * s, stroke, white);
  drawLineSegment(buf, size, 94 * s, 188 * s, 114 * s, 167 * s, stroke, white);
  drawLineSegment(buf, size, 114 * s, 167 * s, 114 * s, 197 * s, stroke, white);

  // Downward Markdown arrow next to "M"
  drawLineSegment(buf, size, 158 * s, 166 * s, 158 * s, 195 * s, stroke, white);
  drawLineSegment(buf, size, 142 * s, 181 * s, 158 * s, 197 * s, stroke, white);
  drawLineSegment(buf, size, 174 * s, 181 * s, 158 * s, 197 * s, stroke, white);

  return encodePng(size, size, buf);
}

function buildIcoFromPngs(entries) {
  // entries: Array<{ size: number, png: Buffer }>
  const count = entries.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4);

  let offset = header.length;
  for (let i = 0; i < count; i++) {
    const { size, png } = entries[i];
    const base = 6 + i * 16;
    header[base] = size >= 256 ? 0 : size;
    header[base + 1] = size >= 256 ? 0 : size;
    header[base + 2] = 0; // palette
    header[base + 3] = 0; // reserved
    header.writeUInt16LE(1, base + 4); // planes
    header.writeUInt16LE(32, base + 6); // bpp
    header.writeUInt32LE(png.length, base + 8);
    header.writeUInt32LE(offset, base + 12);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries.map((e) => e.png)]);
}

async function main() {
  const outDir = path.join(process.cwd(), 'desktop', 'assets');
  await fs.mkdir(outDir, { recursive: true });

  const sizes = [256, 64, 48, 32, 16];
  const rendered = sizes.map((size) => ({ size, png: renderMdPadIcon(size) }));

  const png256 = rendered[0].png;
  const ico = buildIcoFromPngs(rendered);

  await fs.writeFile(path.join(outDir, 'icon.png'), png256);
  await fs.writeFile(path.join(outDir, 'icon.ico'), ico);
  console.log(
    `Generated desktop/assets/icon.png (${png256.length} B) and desktop/assets/icon.ico (${ico.length} B)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
