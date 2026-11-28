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

function renderMdPadIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  if (maskable) {
    // Full-bleed solid cobalt background for Android adaptive/maskable safe zone (15% padding)
    for (let i = 0; i < size * size * 4; i += 4) {
      buf[i] = 11;
      buf[i + 1] = 92;
      buf[i + 2] = 171;
      buf[i + 3] = 255;
    }
  }

  const inset = maskable ? size * 0.14 : 0;
  const innerSize = size - inset * 2;
  const s = innerSize / 256;
  const ox = inset;
  const oy = inset;

  const rx = (v) => ox + v * s;
  const ry = (v) => oy + v * s;

  // Soft drop shadow
  drawRoundedRect(buf, size, rx(32), ry(26), rx(224), ry(238), 28 * s, [15, 23, 42, 42]);

  // Crisp white Windows 11 Notepad page
  drawRoundedRect(buf, size, rx(30), ry(22), rx(226), ry(232), 26 * s, [248, 250, 252, 255]);

  // Subtle border
  drawRoundedRect(buf, size, rx(30), ry(22), rx(226), ry(232), 26 * s, [203, 213, 225, 95]);
  drawRoundedRect(buf, size, rx(33), ry(25), rx(223), ry(229), 23 * s, [255, 255, 255, 255]);

  // Cobalt Windows Notepad header binding strip
  drawRoundedRect(buf, size, rx(30), ry(22), rx(226), ry(80), 24 * s, [11, 92, 171, 255]);
  drawRoundedRect(buf, size, rx(30), ry(54), rx(226), ry(82), 0, [11, 92, 171, 255]);

  // Subtle top highlight
  drawRoundedRect(buf, size, rx(34), ry(26), rx(222), ry(46), 18 * s, [37, 131, 219, 120]);

  // Spiral binding notches
  for (let i = 0; i < 4; i++) {
    const cx = 66 + i * 41;
    drawRoundedRect(buf, size, rx(cx - 7), ry(12), rx(cx + 7), ry(40), 7 * s, [15, 62, 117, 255]);
    drawRoundedRect(buf, size, rx(cx - 4), ry(14), rx(cx + 4), ry(36), 4 * s, [147, 197, 253, 255]);
  }

  // Document lines
  drawRoundedRect(buf, size, rx(54), ry(102), rx(198), ry(112), 5 * s, [203, 213, 225, 255]);
  drawRoundedRect(buf, size, rx(54), ry(126), rx(162), ry(136), 5 * s, [226, 232, 240, 255]);

  // Crisp Markdown badge
  drawRoundedRect(buf, size, rx(52), ry(152), rx(204), ry(212), 14 * s, [15, 118, 110, 255]);

  // Letter "M" inside badge
  const stroke = Math.max(2, 10 * s);
  const white = [255, 255, 255, 255];
  drawLineSegment(buf, size, rx(74), ry(197), rx(74), ry(167), stroke, white);
  drawLineSegment(buf, size, rx(74), ry(167), rx(94), ry(188), stroke, white);
  drawLineSegment(buf, size, rx(94), ry(188), rx(114), ry(167), stroke, white);
  drawLineSegment(buf, size, rx(114), ry(167), rx(114), ry(197), stroke, white);

  // Downward Markdown arrow
  drawLineSegment(buf, size, rx(158), ry(166), rx(158), ry(195), stroke, white);
  drawLineSegment(buf, size, rx(142), ry(181), rx(158), ry(197), stroke, white);
  drawLineSegment(buf, size, rx(174), ry(181), rx(158), ry(197), stroke, white);

  return encodePng(size, size, buf);
}

function buildIcoFromPngs(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = header.length;
  for (let i = 0; i < count; i++) {
    const { size, png } = entries[i];
    const base = 6 + i * 16;
    header[base] = size >= 256 ? 0 : size;
    header[base + 1] = size >= 256 ? 0 : size;
    header[base + 2] = 0;
    header[base + 3] = 0;
    header.writeUInt16LE(1, base + 4);
    header.writeUInt16LE(32, base + 6);
    header.writeUInt32LE(png.length, base + 8);
    header.writeUInt32LE(offset, base + 12);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries.map((e) => e.png)]);
}

async function main() {
  const root = process.cwd();
  const desktopDir = path.join(root, 'desktop', 'assets');
  const nativeAssetsDir = path.join(root, 'native', 'assets');
  const nativeDocsDir = path.join(root, 'native', 'docs');
  const tauriIconsDir = path.join(root, 'src-tauri', 'icons');
  const publicDir = path.join(root, 'public');
  const androidResDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

  for (const dir of [desktopDir, nativeAssetsDir, nativeDocsDir, tauriIconsDir, publicDir]) {
    await fs.mkdir(dir, { recursive: true });
  }

  const sizes = [256, 128, 64, 48, 32, 16];
  const rendered = sizes.map((size) => ({ size, png: renderMdPadIcon(size) }));
  const bySize = Object.fromEntries(rendered.map((r) => [r.size, r.png]));

  const ico = buildIcoFromPngs([256, 64, 48, 32, 16].map((size) => ({ size, png: bySize[size] })));

  // Desktop / Native / Tauri icons
  await fs.writeFile(path.join(desktopDir, 'icon.png'), bySize[256]);
  await fs.writeFile(path.join(desktopDir, 'icon.ico'), ico);
  await fs.writeFile(path.join(nativeAssetsDir, 'MDPad.ico'), ico);
  await fs.writeFile(path.join(nativeDocsDir, 'icon.png'), bySize[256]);

  await fs.writeFile(path.join(tauriIconsDir, '32x32.png'), bySize[32]);
  await fs.writeFile(path.join(tauriIconsDir, '128x128.png'), bySize[128]);
  await fs.writeFile(path.join(tauriIconsDir, '128x128@2x.png'), bySize[256]);
  await fs.writeFile(path.join(tauriIconsDir, 'icon.png'), bySize[256]);
  await fs.writeFile(path.join(tauriIconsDir, 'icon.ico'), ico);

  // PWA icons (192x192, 512x512, maskable 512x512 with 14% safe zone, 180x180 apple-touch-icon, favicon.ico)
  const pwa192 = renderMdPadIcon(192);
  const pwa512 = renderMdPadIcon(512);
  const pwaMaskable512 = renderMdPadIcon(512, { maskable: true });
  const apple180 = renderMdPadIcon(180);

  await fs.writeFile(path.join(publicDir, 'pwa-192x192.png'), pwa192);
  await fs.writeFile(path.join(publicDir, 'pwa-512x512.png'), pwa512);
  await fs.writeFile(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable512);
  await fs.writeFile(path.join(publicDir, 'apple-touch-icon.png'), apple180);
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), ico);

  // Android mipmap launcher icons
  const androidDensities = [
    ['mipmap-mdpi', 48],
    ['mipmap-hdpi', 72],
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192],
  ];
  for (const [folder, px] of androidDensities) {
    const dir = path.join(androidResDir, folder);
    await fs.mkdir(dir, { recursive: true });
    const icon = renderMdPadIcon(px, { maskable: true });
    await fs.writeFile(path.join(dir, 'ic_launcher.png'), icon);
    await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), icon);
  }

  console.log('Generated all Desktop, Tauri, PWA, and Android icons for MDPad.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
