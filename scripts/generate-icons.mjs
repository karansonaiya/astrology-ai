// Generates PWA icon PNGs (192/512, regular + maskable) and the Apple touch
// icon from an original inline SVG mark — no external image assets. Run
// with `npm run generate:icons` after `npm install` (needs sharp, a dev
// dependency already listed in package.json).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

// The Jyoti AI mark: a two-tone flame (saffron/gold gradient outer flame,
// warm ivory core) on a dark badge — "Jyoti" means light/flame. No external
// assets, built entirely from SVG primitives.
function markSvg({ size, padding = 0 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - padding;
  const s = (r * 2) / 32; // scale factor from the 32-unit design grid to this icon's radius

  const outerFlame = `M${cx} ${cy - 11.5 * s}
    C${cx - 2.5 * s} ${cy - 8.5 * s} ${cx - 3.7 * s} ${cy - 6.5 * s} ${cx - 2.7 * s} ${cy - 4.5 * s}
    C${cx - 1.9 * s} ${cy - 3 * s} ${cx - 0.4 * s} ${cy - 2.6 * s} ${cx + 0.7 * s} ${cy - 3.4 * s}
    C${cx - 0.3 * s} ${cy - 5.4 * s} ${cx + 0.4 * s} ${cy - 7.7 * s} ${cx + 2.5 * s} ${cy - 9.5 * s}
    C${cx + 4.9 * s} ${cy - 6 * s} ${cx + 8.6 * s} ${cy - 0.5 * s} ${cx + 8.6 * s} ${cy + 3.8 * s}
    C${cx + 8.6 * s} ${cy + 9 * s} ${cx + 4.9 * s} ${cy + 12.5 * s} ${cx} ${cy + 12.5 * s}
    C${cx - 4.9 * s} ${cy + 12.5 * s} ${cx - 8.6 * s} ${cy + 9 * s} ${cx - 8.6 * s} ${cy + 3.8 * s}
    C${cx - 8.6 * s} ${cy - 0.7 * s} ${cx - 5.2 * s} ${cy - 5 * s} ${cx} ${cy - 11.5 * s} Z`;

  const innerFlame = `M${cx} ${cy - 0.5 * s}
    C${cx - 1.4 * s} ${cy + 1.4 * s} ${cx - 2.1 * s} ${cy + 2.9 * s} ${cx - 1.4 * s} ${cy + 4.2 * s}
    C${cx - 0.9 * s} ${cy + 5.1 * s} ${cx} ${cy + 5.3 * s} ${cx + 0.7 * s} ${cy + 4.7 * s}
    C${cx + 0.1 * s} ${cy + 3.5 * s} ${cx + 0.5 * s} ${cy + 2.2 * s} ${cx + 1.7 * s} ${cy + 1.1 * s}
    C${cx + 3.3 * s} ${cy + 3 * s} ${cx + 5.2 * s} ${cy + 6.1 * s} ${cx + 5.2 * s} ${cy + 8.3 * s}
    C${cx + 5.2 * s} ${cy + 11.3 * s} ${cx + 3.1 * s} ${cy + 13.3 * s} ${cx} ${cy + 13.3 * s}
    C${cx - 3.1 * s} ${cy + 13.3 * s} ${cx - 5.2 * s} ${cy + 11.3 * s} ${cx - 5.2 * s} ${cy + 8.3 * s}
    C${cx - 5.2 * s} ${cy + 5.6 * s} ${cx - 3.1 * s} ${cy + 3 * s} ${cx} ${cy - 0.5 * s} Z`;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flame" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f6ce73" />
      <stop offset="55%" stop-color="#f0b429" />
      <stop offset="100%" stop-color="#e8600f" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#241c15" />
  <path d="${outerFlame}" fill="url(#flame)" />
  <path d="${innerFlame}" fill="#fbf3ea" opacity="0.92" />
</svg>`;
}

async function render(svg, size, filename) {
  const buffer = Buffer.from(svg);
  await sharp(buffer).resize(size, size).png().toFile(path.join(OUT_DIR, filename));
  console.log(`Wrote ${filename}`);
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
  console.log("Icon generation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
