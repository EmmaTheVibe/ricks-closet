// Paints the wooden hanger into a shirt's images, so the 3D hanger is only the steel hook.
//   front: the hanger's shoulders across the collar opening, and its neck rising to the hook
//   side:  the neck above the collar, going into the shirt
//
//   node scripts/paint-hanger.mjs <id> [git revision, default HEAD]
//
// Reads the images as committed at that revision, so it can be re-run while tuning. Once painted
// images are committed, pass a revision from before they were, or the hanger is painted twice.
// Each shirt needs its collar opening traced in OPENINGS (front-texture pixels, 1024x1280), since
// only that shows wood.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import sharp from "sharp";

const W = 1024;
const H = 1280;
const PX = 1280; // texture pixels per metre (SHIRT_HEIGHT 1.0)
const AXIS = W / 2; // the hook and turning axis
const HOOK_END = Math.round((0.09 - 0.08) * PX) - 3; // hook bottom (buildHook), with a little overlap
const NECK_HALF = 11; // neck block half-width
const WOOD = [160, 104, 58]; // HANGER_WOOD_COLOR #a0683a

// Collar openings: where the inside of the shirt shows, so the hanger can be seen.
const OPENINGS = {
  "bsa-pocket-shirt": {
    polygon: [
      [440, 22], [570, 22], [575, 60], [576, 110], [570, 160], [548, 205], [512, 222],
      [470, 210], [455, 180], [436, 130], [432, 90], [434, 50],
    ],
    barTop: 60, // hanger top edge at the neck
    shoulder: 123, // ...and SHOULDER_DX out, at the shoulders
  },
  "race-knit-polo": {
    polygon: [[417, 22], [613, 22], [613, 81], [598, 124], [583, 184], [516, 232], [448, 184], [424, 124], [417, 81]],
    barTop: 79,
    shoulder: 86,
  },
  "race-car-tee": {
    polygon: [[398, 22], [634, 22], [621, 60], [587, 90], [549, 107], [501, 111], [456, 107], [418, 77], [405, 55]],
    barHeight: 20,
    barTop: 62,
    shoulder: 70,
  },
  "mask-linen-shirt": {
    polygon: [[446, 22], [579, 22], [572, 75], [566, 124], [549, 161], [512, 168], [478, 161], [463, 124], [452, 75]],
    barTop: 63,
    shoulder: 108,
  },
  "line-face-shirt": {
    polygon: [
      [399, 22], [621, 22], [621, 112], [609, 169], [572, 210], [531, 292], [486, 262], [426, 195], [403, 157],
      [399, 94],
    ],
    barTop: 68,
    shoulder: 95,
  },
  "giraffe-shirt": {
    polygon: [
      [420, 22], [600, 22], [602, 38], [590, 90], [572, 150], [538, 180], [531, 225], [523, 296], [501, 296],
      [474, 225], [463, 188], [441, 158], [425, 100], [420, 68],
    ],
    barTop: 68,
    shoulder: 93,
  },
  "utility-camp-shirt": {
    polygon: [
      [414, 22], [598, 22], [594, 94], [579, 150], [557, 195], [527, 262], [508, 296], [474, 244], [452, 195],
      [437, 150], [424, 94],
    ],
    barTop: 65,
    shoulder: 101,
  },
  "game-football-jersey": {
    polygon: [[410, 22], [618, 22], [617, 84], [598, 158], [512, 221], [444, 158], [413, 84]],
    barTop: 77,
    shoulder: 86,
  },
  "focus-polo": {
    polygon: [
      [422, 22], [598, 22], [594, 75], [583, 124], [561, 154], [534, 188], [514, 218], [497, 188], [471, 158],
      [444, 124], [428, 82],
    ],
    barTop: 70,
    shoulder: 101,
  },
};

const [id, revision = "HEAD"] = process.argv.slice(2);
if (!OPENINGS[id]) throw new Error(`No collar opening traced for "${id}"; add it to OPENINGS.`);
// barHeight: the hanger's face height at the neck. shoulder: the hanger's top edge SHOULDER_DX
// out from the neck, so the arms line up with the shirt's shoulders (just under their outline).
const SHOULDER_DX = 180;
const opening = { barHeight: 24, ...OPENINGS[id] };
opening.slope = (opening.shoulder - opening.barTop) / (Math.hypot(SHOULDER_DX, 15) - 15);

function insidePolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const smooth = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** Top edge of the hanger's shoulders at x: sloped, rounded off at the neck. */
const barTop = (x) => opening.barTop + opening.slope * (Math.hypot(x - AXIS, 15) - 15);

/** Neck block coverage (0..1) and shade at a point; rounded top where the hook screws in. */
function neck(x, y) {
  const dx = Math.abs(x - AXIS);
  // It runs into the top of the shoulder bar.
  if (dx > NECK_HALF || y < HOOK_END || y > barTop(x) + 4) return null;
  const r = 5;
  if (y < HOOK_END + r && dx > NECK_HALF - r && Math.hypot(dx - (NECK_HALF - r), HOOK_END + r - y) > r) return null;
  // Round in section, lit from the upper left like the scene's key light.
  const u = (x - AXIS) / NECK_HALF;
  const shade = 0.78 + 0.3 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.12 * u;
  const grain = 0.94 + 0.06 * Math.sin(x * 0.9 + 2.2 * Math.sin(y * 0.035));
  return shade * grain;
}

/** Shoulder bar shade at a point, or null outside it. */
function bar(x, y) {
  const top = barTop(x);
  const v = (y - top) / opening.barHeight;
  if (v < 0 || v > 1) return null;
  // Rounded top edge catching the light, falling off underneath.
  const shade = 0.72 + 0.38 * smooth(0.0, 0.25, v) * (1 - smooth(0.25, 1, v)) + 0.1 * (1 - v);
  const grain = 0.94 + 0.06 * Math.sin(y * 0.8 + 2.5 * Math.sin(x * 0.02));
  return shade * grain;
}

/** Light on the wood: full in the open above the collar, darker deeper inside the shirt. */
const depthShade = (y) => 0.95 - 0.3 * smooth(opening.polygon[0][1], opening.barTop + opening.barHeight, y);

const woodRGB = (s) => WOOD.map((c) => Math.min(255, c * s));

/** Supersampled wood over a pixel: [coverage, rgb]. */
function sampleWood(px, py, fn) {
  const N = 4;
  let cover = 0;
  const rgb = [0, 0, 0];
  for (let sy = 0; sy < N; sy++) {
    for (let sx = 0; sx < N; sx++) {
      const s = fn(px + (sx + 0.5) / N, py + (sy + 0.5) / N);
      if (s == null) continue;
      cover++;
      woodRGB(s).forEach((c, k) => (rgb[k] += c));
    }
  }
  if (!cover) return [0, rgb];
  return [cover / (N * N), rgb.map((c) => c / cover)];
}

async function load(path) {
  const file = execFileSync("git", ["show", `${revision}:${path}`], { maxBuffer: 1 << 28 });
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

async function save(data, path) {
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(path);
  console.log("wrote", path);
}

/** Wood colour into transparent pixels around painted wood, so filtering doesn't fringe it. */
function bleed(data, painted) {
  for (let pass = 0; pass < 3; pass++) {
    const next = new Set();
    for (const i of painted) {
      const x = i % W;
      const y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (y + dy) * W + x + dx;
        if (painted.has(j) || data[j * 4 + 3] > 0) continue;
        for (let k = 0; k < 3; k++) data[j * 4 + k] = data[i * 4 + k];
        next.add(j);
      }
    }
    next.forEach((j) => painted.add(j));
  }
}

async function paintFront() {
  const path = `public/shirts/${id}.webp`;
  const data = await load(path);
  const painted = new Set();
  for (let y = 0; y < 260; y++) {
    for (let x = AXIS - 150; x < AXIS + 150; x++) {
      const i = y * W + x;
      const alpha = data[i * 4 + 3] / 255;
      const inOpening = insidePolygon(opening.polygon, x + 0.5, y + 0.5);

      // Inside the opening the hanger sits in the shirt's shade; the bar shadows the back below it.
      if (inOpening && alpha > 0.5) {
        let [cover, rgb] = sampleWood(x, y, bar);
        let [neckCover, neckRgb] = sampleWood(x, y, neck);
        // Under the bar's lower half (and below it), so partly covered edge pixels are shaded too.
        const below = y - (barTop(x) + opening.barHeight);
        const shadow = below > -opening.barHeight / 2 ? 1 - 0.4 * Math.exp(-Math.max(0, below) / 9) : 1;
        // The neck stands about 1 cm in front of the back collar: its shadow falls down and right.
        // Soft-edged, so it doesn't show as a grey strip on light fabric.
        const fromShadow = Math.abs(x - 6 - AXIS);
        const neckShadow =
          !neckCover && y < barTop(x) ? 1 - 0.15 * (1 - smooth(NECK_HALF - 3, NECK_HALF + 6, fromShadow)) : 1;
        for (let k = 0; k < 3; k++) data[i * 4 + k] *= shadow * neckShadow;
        if (neckCover > 0) {
          cover = 1 - (1 - cover) * (1 - neckCover);
          rgb = neckRgb.map((c, k) => (cover ? c : rgb[k]));
        }
        if (cover > 0) {
          for (let k = 0; k < 3; k++) data[i * 4 + k] = data[i * 4 + k] * (1 - cover) + rgb[k] * depthShade(y) * cover;
          // Wood over the fabric's soft outline is solid, not see-through.
          data[i * 4 + 3] = Math.max(data[i * 4 + 3], Math.round(cover * 255));
        }
        continue;
      }

      // Above the collar the neck stands in the open, up to the hook.
      if (alpha < 0.5 && y < 60) {
        const [cover, rgb] = sampleWood(x, y, neck);
        if (cover <= 0) continue;
        for (let k = 0; k < 3; k++) data[i * 4 + k] = rgb[k] * depthShade(y);
        data[i * 4 + 3] = Math.max(data[i * 4 + 3], Math.round(cover * 255));
        painted.add(i);
      }
    }
  }
  bleed(data, painted);
  await save(data, path);
}

async function paintSide(path) {
  const data = await load(path);
  const painted = new Set();
  for (let y = 0; y < 120; y++) {
    for (let x = AXIS - NECK_HALF - 2; x <= AXIS + NECK_HALF + 2; x++) {
      const i = y * W + x;
      if (data[i * 4 + 3] >= 128) {
        // The neck goes into the collar: a soft contact shadow where it enters.
        const above = data[(y - 3) * W * 4 + x * 4 + 3] < 128 && Math.abs(x - AXIS) <= NECK_HALF;
        if (above) for (let k = 0; k < 3; k++) data[i * 4 + k] *= 0.8;
        continue;
      }
      const [cover, rgb] = sampleWood(x, y, neck);
      if (cover <= 0) continue;
      for (let k = 0; k < 3; k++) data[i * 4 + k] = rgb[k] * 0.95;
      data[i * 4 + 3] = Math.round(cover * 255);
      painted.add(i);
    }
  }
  bleed(data, painted);
  await save(data, path);
}

await paintFront();
await paintSide(`public/shirts/${id}-side.webp`);
// Only asymmetric garments have their own left-side photo.
if (existsSync(`public/shirts/${id}-side-left.webp`)) await paintSide(`public/shirts/${id}-side-left.webp`);
