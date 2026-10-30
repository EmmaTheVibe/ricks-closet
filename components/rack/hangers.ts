import { BoxGeometry, CatmullRomCurve3, TubeGeometry, Vector3, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AlphaMask } from "./cloth/buildConstraints";
import { HANGER_DROP, SHIRT_HEIGHT, SHIRT_WIDTH } from "./constants";
import type { GarmentKind } from "./shirts";

const WIRE_RADIUS = 0.0035;
const WOOD_RADIUS = 0.008;
const WAIST_BAND_ROWS = 3;

export type HangerGeometry = { wood: BufferGeometry | null; metal: BufferGeometry | null };

function wire(points: [number, number, number][], segments: number, radius = WIRE_RADIUS, closed = false) {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    closed,
    "centripetal",
  );
  return new TubeGeometry(curve, segments, radius, radius > WIRE_RADIUS ? 10 : 6, closed);
}

export const HOOK_POINTS: [number, number][] = [
  [-HANGER_DROP - 0.01, 0],
  [-0.06, 0],
  [-0.05, 0],
  [-0.025, 0.012],
  [0, 0.017],
  [0.017, 0],
  [0, -0.017],
  [-0.012, -0.014],
];
export const HOOK_RADIUS = WIRE_RADIUS;

export function buildHook() {
  return wire(
    HOOK_POINTS.map(([y, z]): [number, number, number] => [0, y, z]),
    24,
  );
}

function waistSpan(mask: AlphaMask) {
  const span = (py: number) => {
    let left = -1;
    let right = -1;
    for (let px = 0; px < mask.width; px++) {
      if (mask.data[py * mask.width + px] < 128) continue;
      if (left < 0) left = px;
      right = px;
    }
    return { left, right };
  };
  for (let py = 0; py < mask.height; py++) {
    if (span(py).left < 0) continue;
    let left = mask.width;
    let right = -1;
    for (let r = py; r < Math.min(mask.height, py + WAIST_BAND_ROWS); r++) {
      const s = span(r);
      if (s.left < 0) continue;
      left = Math.min(left, s.left);
      right = Math.max(right, s.right);
    }
    let topRow = py;
    for (let r = py; r < Math.min(mask.height, py + WAIST_BAND_ROWS); r++) {
      const s = span(r);
      if (s.left >= 0 && s.right - s.left >= 0.6 * (right - left)) {
        topRow = r;
        break;
      }
    }
    const toX = (px: number) => ((px + 0.5) / mask.width - 0.5) * SHIRT_WIDTH;
    return {
      left: toX(left),
      right: toX(right),
      top: -HANGER_DROP - (topRow / mask.height) * SHIRT_HEIGHT,
    };
  }
  return { left: -0.15, right: 0.15, top: -HANGER_DROP };
}

function buildClipHanger(mask: AlphaMask): HangerGeometry {
  const waist = waistSpan(mask);
  const barY = waist.top + 0.03;
  const clipX = [waist.left + 0.03, waist.right - 0.03];
  const wood = wire(
    [
      [waist.left - 0.015, barY, 0],
      [0, barY, 0],
      [waist.right + 0.015, barY, 0],
    ],
    24,
    WOOD_RADIUS * 0.85,
  );
  const parts = [
    wire(
      [
        [0, -0.05, 0],
        [0, -0.06, 0],
        [0, barY, 0],
      ],
      8,
    ),
    ...clipX.flatMap((x) => {
      const clip = new BoxGeometry(0.024, 0.04, 0.02);
      clip.translate(x, waist.top - 0.008, 0);
      return [
        wire(
          [
            [x, barY, 0],
            [x, (barY + waist.top) / 2, 0],
            [x, waist.top + 0.012, 0],
          ],
          4,
        ),
        clip,
      ];
    }),
  ];
  const metal = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
  parts.forEach((g) => g.dispose());
  return { wood, metal };
}

export function buildHangerBody(mask: AlphaMask, kind: GarmentKind): HangerGeometry {
  return kind === "pants" ? buildClipHanger(mask) : { wood: null, metal: null };
}
