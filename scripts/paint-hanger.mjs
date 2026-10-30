import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import sharp from "sharp";

const W = 1024;
const H = 1280;
const PX = 1280;
const AXIS = W / 2;
const HOOK_END = Math.round((0.09 - 0.08) * PX) - 3;
const NECK_HALF = 11;
const WOOD = [160, 104, 58];

const OPENINGS = {
  "bsa-pocket-shirt": {
    polygon: [
      [440, 22], [570, 22], [575, 60], [576, 110], [570, 160], [548, 205], [512, 222],
      [470, 210], [455, 180], [436, 130], [432, 90], [434, 50],
    ],
    barTop: 60,
    shoulder: 123,
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

const args = process.argv.slice(2);
const sideAt = args.indexOf("--side");
const sideFile = sideAt >= 0 ? args[sideAt + 1] : null;
const [id, revision = "HEAD"] = args.filter((a, i) => sideAt < 0 || (i !== sideAt && i !== sideAt + 1));
if (!OPENINGS[id]) throw new Error(`No collar opening traced for "${id}"; add it to OPENINGS.`);
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

const barTop = (x) => opening.barTop + opening.slope * (Math.hypot(x - AXIS, 15) - 15);

function neck(x, y) {
  const dx = Math.abs(x - AXIS);
  if (dx > NECK_HALF || y < HOOK_END || y > barTop(x) + 4) return null;
  const r = 5;
  if (y < HOOK_END + r && dx > NECK_HALF - r && Math.hypot(dx - (NECK_HALF - r), HOOK_END + r - y) > r) return null;
  const u = (x - AXIS) / NECK_HALF;
  const shade = 0.78 + 0.3 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.12 * u;
  const grain = 0.94 + 0.06 * Math.sin(x * 0.9 + 2.2 * Math.sin(y * 0.035));
  return shade * grain;
}

function bar(x, y) {
  const top = barTop(x);
  const v = (y - top) / opening.barHeight;
  if (v < 0 || v > 1) return null;
  const shade = 0.72 + 0.38 * smooth(0.0, 0.25, v) * (1 - smooth(0.25, 1, v)) + 0.1 * (1 - v);
  const grain = 0.94 + 0.06 * Math.sin(y * 0.8 + 2.5 * Math.sin(x * 0.02));
  return shade * grain;
}

const depthShade = (y) => 0.95 - 0.3 * smooth(opening.polygon[0][1], opening.barTop + opening.barHeight, y);

const woodRGB = (s) => WOOD.map((c) => Math.min(255, c * s));

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

async function load(path, fromDisk = false) {
  const file = fromDisk ? path : execFileSync("git", ["show", `${revision}:${path}`], { maxBuffer: 1 << 28 });
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

async function save(data, path) {
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(path);
  console.log("wrote", path);
}

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

      if (inOpening && alpha > 0.5) {
        let [cover, rgb] = sampleWood(x, y, bar);
        let [neckCover, neckRgb] = sampleWood(x, y, neck);
        const below = y - (barTop(x) + opening.barHeight);
        const shadow = below > -opening.barHeight / 2 ? 1 - 0.4 * Math.exp(-Math.max(0, below) / 9) : 1;
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
          data[i * 4 + 3] = Math.max(data[i * 4 + 3], Math.round(cover * 255));
        }
        continue;
      }

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

async function paintSide(path, fromDisk = false) {
  const data = await load(path, fromDisk);
  const painted = new Set();
  for (let y = 0; y < 120; y++) {
    for (let x = AXIS - NECK_HALF - 2; x <= AXIS + NECK_HALF + 2; x++) {
      const i = y * W + x;
      if (data[i * 4 + 3] >= 128) {
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

if (sideFile) {
  await paintSide(sideFile, true);
} else {
  await paintFront();
  await paintSide(`public/shirts/${id}-side.webp`);
  if (existsSync(`public/shirts/${id}-side-left.webp`)) await paintSide(`public/shirts/${id}-side-left.webp`);
}
