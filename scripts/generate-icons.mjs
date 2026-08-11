#!/usr/bin/env node
/**
 * Rasterizes app/icon.svg into the binary icon assets.
 *
 * Run manually when the brand mark changes — NOT in CI. The outputs are checked
 * in, because a binary cannot carry a comment explaining where it came from and
 * a build step that needs network access to draw four small images is a bad
 * trade. This header is that explanation.
 *
 *   npm run icons
 *
 * Uses macOS `sips`, which rasterizes SVG from the vector at any size. That
 * means no image dependency in package.json — sharp would be a production dep
 * pulled in for four build-time assets, and next/og's ImageResponse would drag
 * a ~500KB wasm payload in to draw a 5KB icon (and Satori's limited SVG path
 * support would force redrawing the mark as rectangles anyway).
 *
 * If you are not on macOS, generate the same sizes with any rasterizer and keep
 * the filenames identical; app/manifest.test.js verifies every output exists at
 * the declared dimensions and that favicon.ico is a real ICO container.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "app", "icon.svg");
const MASKABLE_SRC = path.join(ROOT, "scripts", "icon-maskable.svg");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const TMP = path.join(ROOT, ".icon-tmp");

/** @param {string} src @param {number} size @param {string} out */
function raster(src, size, out) {
  execFileSync("sips", ["-s", "format", "png", "-Z", String(size), src, "--out", out], {
    stdio: "pipe",
  });
}

/**
 * Wraps a PNG in an ICO container.
 *
 * ICO has allowed embedded PNG payloads since Windows Vista, so this is a 22-byte
 * header plus the PNG bytes — no encoder needed. Width/height are stored as a
 * single byte where 0 means 256.
 * @param {Buffer} png @param {number} size
 */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size (0 = no palette)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // payload size
  entry.writeUInt32LE(header.length + entry.length, 12); // payload offset

  return Buffer.concat([header, entry, png]);
}

mkdirSync(ICONS_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

const outputs = [
  // Apple touch icon must be opaque — iOS composites transparency to black, and
  // icon.svg's plate already covers the canvas, so this is opaque by construction.
  { src: SRC, size: 180, out: path.join(ROOT, "app", "apple-icon.png") },
  { src: SRC, size: 192, out: path.join(ICONS_DIR, "icon-192.png") },
  { src: SRC, size: 512, out: path.join(ICONS_DIR, "icon-512.png") },
  { src: MASKABLE_SRC, size: 512, out: path.join(ICONS_DIR, "icon-maskable-512.png") },
];

for (const { src, size, out } of outputs) {
  raster(src, size, out);
  console.log(`  ${path.relative(ROOT, out)}  ${size}x${size}`);
}

// favicon.ico: 32px is what browsers actually request for the tab strip.
const icoPng = path.join(TMP, "favicon-32.png");
raster(SRC, 32, icoPng);
const icoPath = path.join(ROOT, "app", "favicon.ico");
writeFileSync(icoPath, pngToIco(readFileSync(icoPng), 32));
console.log(`  ${path.relative(ROOT, icoPath)}  32x32`);

rmSync(TMP, { recursive: true, force: true });
console.log("\nIcons regenerated from app/icon.svg.");
