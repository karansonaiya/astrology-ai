// Generates PWA icon PNGs (192/512, regular + maskable), the Apple touch
// icon, and the browser-tab favicon from the Prerna AI mark's master source
// image — run with `npm run generate:icons` after `npm install` (needs
// sharp, a dev dependency already listed in package.json).
//
// The mark used to be a plain inline SVG (a simple sparkle) generated
// programmatically here. Replaced with a raster master asset
// (scripts/assets/logo-mark-source.png — a moon/face/zodiac-wheel emblem,
// background already made transparent) once the founder picked that design
// over the old sparkle — mirrors src/components/layout/logo.tsx's mark
// exactly (keep both pointed at the same source if this changes again).
//
// Found live: shipping the emblem on a fully transparent square looked
// broken in real use — a browser tab and a header can each sit on almost
// any background color/theme, and parts of the artwork (the dark hair, in
// particular) disappeared against a dark background with nothing behind
// it. The ORIGINAL sparkle mark already solved this correctly (see git
// history): a fixed, non-theme-driven dark badge color behind the mark, so
// it reads the same everywhere regardless of what's behind it. Restored
// that same idea here for every icon variant, not just maskable.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "icons");
const SOURCE_PATH = path.join(process.cwd(), "scripts", "assets", "logo-mark-source.png");
// Next.js App Router convention file — src/app/favicon.ico is served as the
// browser-tab favicon with HIGHER priority than the metadata.icons config in
// layout.tsx, so it has to be regenerated separately or the tab keeps
// showing the old mark even after public/icons/*.png are updated (found
// live: exactly this happened after the Jyoti AI → Prerna AI rebrand).
const FAVICON_PATH = path.join(process.cwd(), "src", "app", "favicon.ico");

// Same fixed badge color the original sparkle mark used — deliberately not
// theme-driven, so the logo reads identically in a light header, a dark
// header, and a browser tab of any color, exactly like every other real
// brand mark (nobody's app icon changes color with the OS theme).
const BADGE_BG = { r: 0x24, g: 0x1c, b: 0x15, alpha: 1 };

/** A solid circle of `background`, rasterized at `size`x`size` with fully transparent corners. */
async function circleBuffer(size, background) {
  const hex = `#${[background.r, background.g, background.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  const svg = `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${hex}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * `shape: "circle"` (the default, used everywhere except maskable icons):
 * emblem centered over a solid circular badge, transparent square corners —
 * looks right inline in a header next to text, and right as a rounded/
 * circular favicon, without a hard square edge either way.
 *
 * `shape: "square"` (maskable icons only): full-bleed solid square, no
 * transparent corners at all — required by the maskable-icon spec, since
 * Android's adaptive-icon system fills any transparent area of a maskable
 * icon with its own default backdrop, which can clash badly.
 */
async function squareBuffer(sourceBuffer, size, { padding = 0, shape = "circle", background = BADGE_BG } = {}) {
  const inner = Math.round(size - padding * 2);
  const resized = await sharp(sourceBuffer)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const base =
    shape === "square"
      ? sharp({ create: { width: size, height: size, channels: 4, background } })
      : sharp(await circleBuffer(size, background));

  return base.composite([{ input: resized, gravity: "center" }]).png().toBuffer();
}

async function render(sourceBuffer, size, filename, opts) {
  const buffer = await squareBuffer(sourceBuffer, size, opts);
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
  const source = await readFile(SOURCE_PATH);

  await render(source, 192, "icon-192.png");
  await render(source, 512, "icon-512.png");
  await render(source, 180, "apple-touch-icon.png");

  // Maskable icons need a safe-zone padding (~18%) and NO transparent corners — see squareBuffer's doc comment.
  await render(source, 192, "icon-maskable-192.png", { padding: 192 * 0.18, shape: "square" });
  await render(source, 512, "icon-maskable-512.png", { padding: 512 * 0.18, shape: "square" });

  await writeFile(path.join(OUT_DIR, "source.png"), await squareBuffer(source, 512));

  const icoSizes = [16, 32, 48];
  const icoPngs = await Promise.all(
    icoSizes.map(async (size) => ({ size, buffer: await squareBuffer(source, size) }))
  );
  await writeFile(FAVICON_PATH, buildIco(icoPngs));
  console.log(`Wrote ${FAVICON_PATH}`);

  console.log("Icon generation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
