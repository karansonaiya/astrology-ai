// Generates PWA icon PNGs (192/512, regular + maskable) and the Apple touch
// icon from an original inline SVG mark — no external image assets. Run
// with `npm run generate:icons` after `npm install` (needs sharp, a dev
// dependency already listed in package.json).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");
// Next.js App Router convention file — src/app/favicon.ico is served as the
// browser-tab favicon with HIGHER priority than the metadata.icons config in
// layout.tsx, so it has to be regenerated separately or the tab keeps
// showing the old mark even after public/icons/*.png are updated (found
// live: exactly this happened after the Jyoti AI → Prerna AI rebrand).
const FAVICON_PATH = path.join(process.cwd(), "src", "app", "favicon.ico");

// The Prerna AI mark: a two-tone sparkle (saffron/gold gradient primary
// sparkle, warm-ivory companion sparkle) on a dark badge — "Prerna" means
// inspiration, and the twinkle motif doubles as a star (astrology). Mirrors
// src/components/layout/logo.tsx's mark exactly — keep both in sync if this
// changes. No external assets, built entirely from SVG primitives.
function markSvg({ size, padding = 0 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - padding;
  const s = (r * 2) / 32; // scale factor from the 32-unit design grid to this icon's radius

  const primarySparkle = `M${cx} ${cy - 12 * s}
    L${cx + 2.2 * s} ${cy - 2.2 * s}
    L${cx + 11 * s} ${cy}
    L${cx + 2.2 * s} ${cy + 2.2 * s}
    L${cx} ${cy + 12 * s}
    L${cx - 2.2 * s} ${cy + 2.2 * s}
    L${cx - 11 * s} ${cy}
    L${cx - 2.2 * s} ${cy - 2.2 * s} Z`;

  const companionSparkle = `M${cx + 7 * s} ${cy - 11 * s}
    L${cx + 7.8 * s} ${cy - 7.8 * s}
    L${cx + 11 * s} ${cy - 7 * s}
    L${cx + 7.8 * s} ${cy - 6.2 * s}
    L${cx + 7 * s} ${cy - 3 * s}
    L${cx + 6.2 * s} ${cy - 6.2 * s}
    L${cx + 3 * s} ${cy - 7 * s}
    L${cx + 6.2 * s} ${cy - 7.8 * s} Z`;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sparkle" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f6ce73" />
      <stop offset="55%" stop-color="#f0b429" />
      <stop offset="100%" stop-color="#e8600f" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#241c15" />
  <path d="${primarySparkle}" fill="url(#sparkle)" />
  <path d="${companionSparkle}" fill="#fbf3ea" opacity="0.92" />
</svg>`;
}

async function pngBuffer(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function render(svg, size, filename) {
  const buffer = await pngBuffer(svg, size);
  await sharp(buffer).toFile(path.join(OUT_DIR, filename));
  console.log(`Wrote ${filename}`);
}

/**
 * Packs PNG buffers into a valid multi-resolution .ico file. Since Windows
 * Vista, ICO entries may store PNG-compressed data directly (no need for
 * raw BMP/DIB encoding), so this is just the small ICONDIR/ICONDIRENTRY
 * header format wrapped around sharp's PNG output — no extra dependency
 * (e.g. to-ico) needed for one file.
 */
function buildIco(pngs) {
  const headerSize = 6 + 16 * pngs.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = headerSize;
  for (const [i, { size, buffer }] of pngs.entries()) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data from file start
    entry.copy(header, 6 + 16 * i);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...pngs.map((p) => p.buffer)]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await render(markSvg({ size: 192 }), 192, "icon-192.png");
  await render(markSvg({ size: 512 }), 512, "icon-512.png");
  await render(markSvg({ size: 180 }), 180, "apple-touch-icon.png");

  // Maskable icons need a safe-zone padding (~18%) since platforms may crop to a circle/rounded-square.
  await render(markSvg({ size: 192, padding: 192 * 0.18 }), 192, "icon-maskable-192.png");
  await render(markSvg({ size: 512, padding: 512 * 0.18 }), 512, "icon-maskable-512.png");

  await writeFile(path.join(OUT_DIR, "source.svg"), markSvg({ size: 512 }));

  const icoSizes = [16, 32, 48];
  const icoPngs = await Promise.all(
    icoSizes.map(async (size) => ({ size, buffer: await pngBuffer(markSvg({ size }), size) }))
  );
  await writeFile(FAVICON_PATH, buildIco(icoPngs));
  console.log(`Wrote ${FAVICON_PATH}`);

  console.log("Icon generation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
