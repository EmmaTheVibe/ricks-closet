// Fits a cut-out shirt photo into the rack's 1024×1280 transparent frame: trims the empty border,
// scales the sleeve span to the frame width, and puts the shoulders at the top edge.
// Usage: npm run prepare-shirt -- <input.png> <output-name> [--remove-hanger]
//   (writes public/shirts/<output-name>.webp)
// --remove-hanger: for photos taken on a wooden hanger. Clears warm-tinted (wood) pixels in the top
// quarter of the shirt, then keeps only the largest connected piece, which also drops the hook.
// It won't recognise white, black or clear plastic hangers.
// --match <front-name>: for a side view. Scales and places it so its height and top line up with
// public/shirts/<front-name>.webp, so the rack can crossfade between the two without a jump.
import path from "node:path";
import sharp from "sharp";

const W = 1024;
const H = 1280;
const SIDE_MARGIN = 20; // matches the placeholder shirts
const TOP_MARGIN = 24;
const RIM_TOLERANCE = 45; // max brightness gap between an edge pixel and the fabric just inside it

const args = process.argv.slice(2);
const removeHanger = args.includes("--remove-hanger");
const matchAt = args.indexOf("--match");
const matchName = matchAt >= 0 ? args[matchAt + 1] : null;
const [input, name] = args.filter((a, i) => !a.startsWith("--") && (matchAt < 0 || i !== matchAt + 1));
if (!input || !name) {
  console.error("Usage: npm run prepare-shirt -- <input.png> <output-name> [--remove-hanger]");
  process.exit(1);
}

const source = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (!(await sharp(input).metadata()).hasAlpha) {
  console.error(`${input} has no transparency. Remove the background first.`);
  process.exit(1);
}
if (removeHanger) removeWoodenHanger(source.data, source.info.width, source.info.height);

function removeWoodenHanger(px, width, height) {
  const n = width * height;
  let top = height;
  let bottom = 0;
  for (let i = 0; i < n; i++) {
    if (px[i * 4 + 3] < 128) continue;
    const y = Math.floor(i / width);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  const limit = top + (bottom - top) * 0.25;
  let wood = 0;
  for (let i = 0; i < n && Math.floor(i / width) < limit; i++) {
    const [r, g, b, a] = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2], px[i * 4 + 3]];
    if (a > 0 && r - b > 15 && r - g > 8) {
      px[i * 4 + 3] = 0;
      wood++;
    }
  }

  // Keep the largest 4-connected opaque piece (the shirt); drop hooks and leftover specks.
  const label = new Int32Array(n).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let s = 0, id = 0; s < n; s++) {
    if (px[s * 4 + 3] < 128 || label[s] >= 0) continue;
    const stack = [s];
    label[s] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % width;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (q >= 0 && q < n && label[q] < 0 && px[q * 4 + 3] >= 128) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) [best, bestSize] = [id, size];
    id++;
  }
  // Soft edge pixels count as part of the shirt when they touch it.
  const nearShirt = (i) => [i - 1, i + 1, i - width, i + width].some((q) => q >= 0 && q < n && label[q] === best);
  let dropped = 0;
  for (let i = 0; i < n; i++) {
    if (px[i * 4 + 3] === 0 || label[i] === best || (px[i * 4 + 3] < 128 && nearShirt(i))) continue;
    px[i * 4 + 3] = 0;
    dropped++;
  }
  console.log(`removed hanger: ${wood} wood pixels, ${dropped} detached pixels`);
}

cleanOutline(source.data, source.info.width, source.info.height);

/** Square-window erosion/dilation of a 0/1 mask (separable). */
function morph(mask, width, height, r, dilate) {
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = dilate ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const s = mask[y * width + Math.min(width - 1, Math.max(0, x + d))];
        v = dilate ? v | s : v & s;
      }
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = dilate ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const s = tmp[Math.min(height - 1, Math.max(0, y + d)) * width + x];
        v = dilate ? v | s : v & s;
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/** Keeps only the largest 8-connected piece of a 0/1 mask, in place. */
function keepLargest(mask, width, height) {
  const label = new Int32Array(mask.length).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let s = 0, id = 0; s < mask.length; s++) {
    if (!mask[s] || label[s] >= 0) continue;
    const stack = [s];
    label[s] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % width;
      const y = Math.floor(p / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const q = yy * width + xx;
          if (mask[q] && label[q] < 0) {
            label[q] = id;
            stack.push(q);
          }
        }
      }
    }
    if (size > bestSize) [best, bestSize] = [id, size];
    id++;
  }
  for (let i = 0; i < mask.length; i++) if (label[i] !== best) mask[i] = 0;
}

/** City-block distance (capped) from each opaque pixel to the nearest transparent one. */
function edgeDistance(mask, width, cap) {
  const dist = new Uint8Array(mask.length).fill(cap);
  let frontier = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) {
      dist[i] = 0;
      frontier.push(i);
    }
  }
  for (let d = 1; d < cap && frontier.length; d++) {
    const next = [];
    for (const p of frontier) {
      const x = p % width;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (q >= 0 && q < mask.length && dist[q] > d) {
          dist[q] = d;
          next.push(q);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/**
 * Cleans the outline left by background removal: drops specks and thin spurs, and drops edge
 * pixels whose brightness doesn't match the fabric just inside them (leftover background or
 * shadow, which shows as a pale or grey rim on the rack).
 */
function cleanOutline(px, width, height) {
  const lum = (i) => (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
  let mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] >= 128 ? 1 : 0;
  mask = morph(morph(mask, width, height, 2, false), width, height, 2, true);
  keepLargest(mask, width, height);

  let rim = 0;
  for (let pass = 0; pass < 3; pass++) {
    const dist = edgeDistance(mask, width, 8);
    const drop = [];
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || dist[i] > 2) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      // Kept if it matches any fabric just inside it, so a trim colour (a cream collar on a
      // black body) survives; leftover shadow or specks match nothing nearby.
      let closest = Infinity;
      for (let dy = -7; dy <= 7; dy++) {
        for (let dx = -7; dx <= 7; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const q = yy * width + xx;
          if (dist[q] >= 4) closest = Math.min(closest, Math.abs(lum(i) - lum(q)));
        }
      }
      if (closest !== Infinity && closest > RIM_TOLERANCE) drop.push(i);
    }
    for (const i of drop) mask[i] = 0;
    rim += drop.length;
    if (!drop.length) break;
  }
  keepLargest(mask, width, height);

  for (let i = 0; i < mask.length; i++) px[i * 4 + 3] = mask[i] ? 255 : 0;
  console.log(`cleaned outline: ${rim} mismatched rim pixels removed`);
}

/**
 * Copies edge colours outward into transparent pixels (alpha stays 0), so texture filtering on
 * the GPU never blends the garment's edge with black and draws a dark or light halo.
 */
function bleedColour(px, width, height, passes) {
  const filled = new Uint8Array(width * height);
  for (let i = 0; i < filled.length; i++) filled[i] = px[i * 4 + 3] >= 128 ? 1 : 0;
  for (let pass = 0; pass < passes; pass++) {
    const next = [];
    for (let i = 0; i < filled.length; i++) {
      if (filled[i]) continue;
      const x = i % width;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (const q of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (q < 0 || q >= filled.length || !filled[q]) continue;
        r += px[q * 4];
        g += px[q * 4 + 1];
        b += px[q * 4 + 2];
        n++;
      }
      if (n) next.push([i, r / n, g / n, b / n]);
    }
    for (const [i, r, g, b] of next) {
      px[i * 4] = r;
      px[i * 4 + 1] = g;
      px[i * 4 + 2] = b;
      filled[i] = 1;
    }
  }
}

const trimmed = await sharp(source.data, { raw: source.info })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer({ resolveWithObject: true });
const { width: tw, height: th } = trimmed.info;
/**
 * Opaque bounding box (top and height) of an already-prepared garment image. Rows narrower than
 * MIN_ROW don't count toward the top, so a hanger neck painted above the collar
 * (paint-hanger.mjs) doesn't move it.
 */
async function opaqueExtent(file) {
  const MIN_ROW = 40;
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let top = info.height;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    let count = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] >= 128) count++;
    if (!count) continue;
    if (count >= MIN_ROW) top = Math.min(top, y);
    bottom = y;
  }
  return { top, height: bottom - top + 1 };
}

const match = matchName ? await opaqueExtent(path.join(process.cwd(), "public", "shirts", `${matchName}.webp`)) : null;
const scale = match ? match.height / th : Math.min((W - 2 * SIDE_MARGIN) / tw, (H - TOP_MARGIN) / th);
const sw = Math.round(tw * scale);
const sh = Math.round(th * scale);
const resized = await sharp(trimmed.data).resize(sw, sh, { kernel: "lanczos3" }).toBuffer();

const out = path.join(process.cwd(), "public", "shirts", `${name}.webp`);
const framed = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: resized, left: Math.round((W - sw) / 2), top: match ? match.top : TOP_MARGIN }])
  .raw()
  .toBuffer();
bleedColour(framed, W, H, 12);
// WebP is ~14× smaller than PNG here. `exact` keeps the colour bled under transparent pixels.
await sharp(framed, { raw: { width: W, height: H, channels: 4 } })
  .webp({ quality: 90, alphaQuality: 100, exact: true, effort: 5 })
  .toFile(out);

console.log(`wrote public/shirts/${name}.webp — shirt ${tw}×${th}px scaled ×${scale.toFixed(2)} to ${sw}×${sh}px`);
if (scale > 1.5) console.warn(`warning: upscaled ×${scale.toFixed(1)}; it will look soft. A larger source image would be sharper.`);
