// Builds a turn flipbook for one side of a garment from video frames (front -> side, in order).
// Cuts each frame out of its plain light background, lines it up with the garment's front image,
// estimates each frame's turn angle from its width, picks TILES frames spread over the rack's
// turn, and packs them into one 4×3 sheet.
//
// Usage: node scripts/prepare-turn.mjs <frames-dir> <front-name> <out-name> [--reverse] [--flip] [--front]
//   frames-dir: frames from scripts/extract-frames.swift covering one quarter-turn
//   --reverse:  the frames run side -> front (e.g. the end of a full spin)
//   --flip:     mirror horizontally (left-of-rack sheets are stored facing left, like side photos)
//   --front:    also replace public/shirts/<front-name>.webp with the clip's front frame, at the
//               same size and position, so the 3D front matches the turn exactly at the switch
// Writes public/shirts/<out-name>.webp and prints the angles to paste into shirts.ts.
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const W = 1024;
const H = 1280;
const COLS = 4;
const ROWS = 3;
const TILES = COLS * ROWS;
const TILE_W = 512;
const TILE_H = 640;
const MIN_ANGLE = 5; // degrees; below this the rack shows the 3D cloth front
const MAX_ANGLE = 70; // the rack's side turn (SIDE_ROTATION_DEG)
const BG_MIN = 150; // background pixels: neutral, between these brightnesses (white prints stay)
const BG_MAX = 250; // Hailuo backgrounds run from light grey up to near white

const args = process.argv.slice(2);
const reverse = args.includes("--reverse");
const flip = args.includes("--flip");
const replaceFront = args.includes("--front");
const [framesDir, frontName, outName] = args.filter((a) => !a.startsWith("--"));
if (!framesDir || !frontName || !outName) {
  console.error("Usage: node scripts/prepare-turn.mjs <frames-dir> <front-name> <out-name> [--reverse] [--flip] [--front]");
  process.exit(1);
}

/** Opaque mask of a frame: flood the light, neutral background in from the border. */
async function cutout(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const n = width * height;
  const isBg = (i) => {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    return Math.min(r, g, b) >= BG_MIN && Math.max(r, g, b) <= BG_MAX && Math.max(r, g, b) - Math.min(r, g, b) <= 14;
  };
  const bg = new Uint8Array(n);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !isBg(p)) continue;
    bg[p] = 1;
    const x = p % width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (p >= width) stack.push(p - width);
    if (p < n - width) stack.push(p + width);
  }
  let mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = bg[i] ? 0 : 1;
  // Closing seals pinholes where a print's soft edge meets the outline; opening then drops thin
  // lines (a stray hanger hook) and specks. Keep the garment only.
  mask = morph(morph(mask, width, height, 3, true), width, height, 3, false);
  mask = morph(morph(mask, width, height, 2, false), width, height, 2, true);
  keepLargest(mask, width, height);
  let top = height, bottom = -1, left = width, right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = mask[i] ? 255 : 0;
  }
  return { rgba, width, height, top, bottom, left, right };
}

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
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (q >= 0 && q < mask.length && mask[q] && label[q] < 0) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) [best, bestSize] = [id, size];
    id++;
  }
  for (let i = 0; i < mask.length; i++) if (label[i] !== best) mask[i] = 0;
}

/**
 * Scale and position that lay the first frame over the prepared front image: the best outline
 * overlap, searched at quarter resolution, then refined. Matching outlines rather than bounding
 * boxes keeps a hanger or hook running off the top of the video from throwing it off.
 * Returns the frame-to-front scale, the frame x on the turning axis, and the frame y at the
 * front image's top edge.
 */
async function fitToFront(frame, file) {
  const alphaAt = async (input, raw, width, height) => {
    const { data } = await sharp(input, raw).ensureAlpha().resize(width, height).raw().toBuffer({ resolveWithObject: true });
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  };
  const raw = { raw: { width: frame.width, height: frame.height, channels: 4 } };
  let best = { iou: -1 };
  const search = async (q, scales, centre, reach) => {
    const target = await alphaAt(file, undefined, W / q, H / q);
    for (const s of scales) {
      const fw = Math.round((frame.width * s) / q);
      const fh = Math.round((frame.height * s) / q);
      const mask = await alphaAt(frame.rgba, raw, fw, fh);
      const [cx, cy] = centre(s);
      for (let oy = Math.round(cy / q) - reach; oy <= Math.round(cy / q) + reach; oy++) {
        for (let ox = Math.round(cx / q) - reach; ox <= Math.round(cx / q) + reach; ox++) {
          let both = 0;
          let either = 0;
          for (let y = 0; y < H / q; y++) {
            const fy = y - oy;
            for (let x = 0; x < W / q; x++) {
              const fx = x - ox;
              const a = target[y * (W / q) + x];
              const b = fx >= 0 && fy >= 0 && fx < fw && fy < fh ? mask[fy * fw + fx] : 0;
              both += a & b;
              either += a | b;
            }
          }
          const iou = both / either;
          if (iou > best.iou) best = { iou, s, ox: ox * q, oy: oy * q };
        }
      }
    }
  };
  // Coarse: bottoms and centres lined up for each scale, then searched around that.
  const coarse = Array.from({ length: 31 }, (_, k) => 0.8 + k * 0.025);
  const front = await alphaAt(file, undefined, W, H);
  let frontBottom = 0;
  for (let i = 0; i < front.length; i++) if (front[i]) frontBottom = Math.floor(i / W);
  await search(
    4,
    coarse,
    (s) => [W / 2 - ((frame.left + frame.right) / 2) * s, frontBottom - frame.bottom * s],
    12,
  );
  const fine = Array.from({ length: 9 }, (_, k) => best.s - 0.02 + k * 0.005);
  const { ox, oy } = best;
  await search(1, fine, (s) => [ox + ((best.s - s) * frame.width) / 2, oy + ((best.s - s) * frame.height) / 2], 4);
  console.log(`front fit: scale ${best.s.toFixed(3)}, overlap ${(best.iou * 100).toFixed(1)}%`);
  return { scale: best.s, axis: (W / 2 - best.ox) / best.s, top: -best.oy / best.s };
}

const files = readdirSync(framesDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
if (reverse) files.reverse();
console.log(`cutting out ${files.length} frames…`);
const frames = [];
for (const f of files) frames.push({ file: f, ...(await cutout(path.join(framesDir, f))) });

// The first frame is the front view: it sets the scale and position for the whole sequence, so
// frames keep their relative size and the turn stays smooth.
const frontFile = path.join(process.cwd(), "public", "shirts", `${frontName}.webp`);
const ref = frames[0];
const { scale, axis, top: refTop } = await fitToFront(ref, frontFile);
const refWidth = ref.right - ref.left;
for (const fr of frames) {
  const ratio = Math.min(1, (fr.right - fr.left) / refWidth);
  fr.angle = (Math.acos(ratio) * 180) / Math.PI;
}
// The narrowest frame is the side profile. A shirt with depth never reaches zero width, so its
// estimated angle falls short of 90°: end the sheet there and show it at the rack's full turn,
// like the side photos (a 90° profile at SIDE_ROTATION_DEG). Later frames turn on toward the back.
let profile = 0;
for (let j = 1; j < frames.length; j++) if (frames[j].angle > frames[profile].angle) profile = j;
console.log(`side profile: ${frames[profile].file}`);
frames.length = profile + 1;
const toRack = MAX_ANGLE / frames[profile].angle;
for (const fr of frames) fr.angle *= toRack;

// Pick frames closest to evenly spaced target angles, keeping them in order.
const picks = [];
let from = 0;
for (let k = 0; k < TILES; k++) {
  const target = MIN_ANGLE + ((MAX_ANGLE - MIN_ANGLE) * k) / (TILES - 1);
  let best = from;
  for (let j = from; j < frames.length; j++) {
    if (Math.abs(frames[j].angle - target) < Math.abs(frames[best].angle - target)) best = j;
  }
  picks.push(best);
  from = Math.min(frames.length - 1, best + 1);
}

/** A frame scaled and placed on the garment's 1024×1280 canvas (cropping anything outside it). */
async function placeFrame(fr) {
  const sw = Math.round(fr.width * scale);
  const sh = Math.round(fr.height * scale);
  const scaled = await sharp(fr.rgba, { raw: { width: fr.width, height: fr.height, channels: 4 } })
    .resize(sw, sh)
    .png()
    .toBuffer();
  const left = Math.round(W / 2 - axis * scale);
  const top = Math.round(-refTop * scale);
  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const cropW = Math.min(sw - srcLeft, W - Math.max(0, left));
  const cropH = Math.min(sh - srcTop, H - Math.max(0, top));
  const piece = await sharp(scaled).extract({ left: srcLeft, top: srcTop, width: cropW, height: cropH }).toBuffer();
  return canvas.composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }]).png().toBuffer();
}

/**
 * Copies edge colours outward into transparent pixels (alpha stays 0), so texture filtering on
 * the GPU never blends the garment's edge with black and draws a halo (as in prepare-shirt.mjs).
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

if (replaceFront) {
  // The front frame, cut 1px tighter: its outer pixels are blended with the light background
  // and would show as a pale rim around the shirt.
  const fr = frames[0];
  const mask = new Uint8Array(fr.width * fr.height);
  for (let i = 0; i < mask.length; i++) mask[i] = fr.rgba[i * 4 + 3] ? 1 : 0;
  const inner = morph(mask, fr.width, fr.height, 1, false);
  const rgba = Buffer.from(fr.rgba);
  for (let i = 0; i < inner.length; i++) rgba[i * 4 + 3] = inner[i] ? 255 : 0;
  const { data } = await sharp(await placeFrame({ ...fr, rgba }))
    .raw()
    .toBuffer({ resolveWithObject: true });
  bleedColour(data, W, H, 12);
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, exact: true, effort: 5 })
    .toFile(frontFile);
  console.log(`wrote public/shirts/${frontName}.webp from ${fr.file}`);
}

const tiles = [];
for (const [k, j] of picks.entries()) {
  const fr = frames[j];
  let buf = await placeFrame(fr);
  if (flip) buf = await sharp(buf).flop().png().toBuffer();
  tiles.push({
    input: await sharp(buf).resize(TILE_W, TILE_H).png().toBuffer(),
    left: (k % COLS) * TILE_W,
    top: Math.floor(k / COLS) * TILE_H,
  });
  console.log(`tile ${k}: ${fr.file} ≈ ${fr.angle.toFixed(1)}°`);
}

const out = path.join(process.cwd(), "public", "shirts", `${outName}.webp`);
await sharp({ create: { width: COLS * TILE_W, height: ROWS * TILE_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(tiles)
  .webp({ quality: 88, alphaQuality: 100, effort: 5 })
  .toFile(out);
const angles = picks.map((j) => Math.round(frames[j].angle * 10) / 10);
console.log(`wrote public/shirts/${outName}.webp`);
console.log(`angles: [${angles.join(", ")}]`);
