import {
  BEND_STIFFNESS,
  GHOST_STIFFNESS,
  HANGER_BAR_DROP,
  HEM_ROWS,
  HEM_WEIGHT,
  PIN_SPAN,
  SHEAR_STIFFNESS,
} from "../constants";
import type { GarmentKind } from "../shirts";

/** Downsampled alpha channel of the shirt texture, row 0 at the top. */
export type AlphaMask = { width: number; height: number; data: Uint8Array };

export type ClothSpec = {
  cols: number;
  rows: number;
  width: number;
  height: number;
  top: number; // distance from the hanger origin down to the top grid row
  kind: GarmentKind;
};

export type ClothTopology = {
  count: number;
  restLocal: Float32Array; // flat grid in hanger-local space, xyz per particle
  invMass: Float32Array; // 0 = pinned to the hanger
  gravityScale: Float32Array;
  a: Uint16Array;
  b: Uint16Array;
  rest: Float32Array;
  stiff: Float32Array;
  tetherAnchor: Int32Array; // nearest pinned particle, -1 for pinned particles
  tetherRest: Float32Array;
};

const ALPHA_CUTOFF = 0.5;

/** Alpha (0–1) at texture coordinates u, v, with v = 0 at the top of the image. */
export function sampleAlpha(mask: AlphaMask, u: number, v: number) {
  const x = Math.min(mask.width - 1, Math.floor(u * mask.width));
  const y = Math.min(mask.height - 1, Math.floor(v * mask.height));
  return mask.data[y * mask.width + x] / 255;
}

/**
 * Builds the particle grid for one shirt. The grid is rectangular but the shirt isn't: particles
 * outside the silhouette ("ghosts") feel no gravity, and links between ghosts are weak, so the
 * transparent corners don't tie the sleeves to the body.
 */
export function buildConstraints(spec: ClothSpec, mask: AlphaMask): ClothTopology {
  const { cols, rows, width, height, top } = spec;
  const count = cols * rows;
  const u = (i: number) => (i % cols) / (cols - 1);
  const v = (i: number) => Math.floor(i / cols) / (rows - 1);

  const restLocal = new Float32Array(count * 3);
  const inside = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    restLocal[i * 3] = (u(i) - 0.5) * width;
    restLocal[i * 3 + 1] = -top - v(i) * height;
    inside[i] = sampleAlpha(mask, u(i), v(i)) >= ALPHA_CUTOFF ? 1 : 0;
  }

  const invMass = new Float32Array(count).fill(1);
  if (spec.kind === "pants") {
    // Clip hanger: the whole waistband is held. Each column is pinned down to its first opaque
    // row, if that row is near the top (columns beside the waist stay free).
    const waistRows = Math.ceil(rows * 0.15);
    for (let c = 0; c < cols; c++) {
      let first = -1;
      for (let r = 0; r < waistRows && first < 0; r++) if (inside[r * cols + c]) first = r;
      for (let r = 0; r <= first; r++) invMass[r * cols + c] = 0;
    }
  }
  // Shirts: pin the middle columns down to the hanger's bottom bar (at least to the first opaque
  // row): the yoke rests on the hanger. Outer columns (shoulder tips, sleeves) stay free.
  const pinFrom = Math.round((cols - 1) * (0.5 - PIN_SPAN / 2));
  const pinTo = Math.round((cols - 1) * (0.5 + PIN_SPAN / 2));
  for (let c = pinFrom; c <= pinTo && spec.kind === "shirt"; c++) {
    for (let r = 0; r < rows; r++) {
      const i = r * cols + c;
      const aboveBar = restLocal[i * 3 + 1] >= -HANGER_BAR_DROP;
      const reachedCloth = r > 0 && inside[i - cols];
      if (!aboveBar && reachedCloth) break;
      invMass[i] = 0;
    }
  }

  // Ghosts float; the lowest opaque rows of each column (body and sleeve hems) are heavier.
  const gravityScale = new Float32Array(count);
  for (let c = 0; c < cols; c++) {
    let hemLeft = HEM_ROWS;
    for (let r = rows - 1; r >= 0; r--) {
      const i = r * cols + c;
      if (!inside[i]) continue;
      gravityScale[i] = hemLeft > 0 ? HEM_WEIGHT : 1;
      hemLeft--;
    }
  }

  const a: number[] = [];
  const b: number[] = [];
  const rest: number[] = [];
  const stiff: number[] = [];
  const link = (i: number, j: number, stiffness: number) => {
    if (invMass[i] === 0 && invMass[j] === 0) return;
    const ghost =
      !inside[i] && !inside[j] && sampleAlpha(mask, (u(i) + u(j)) / 2, (v(i) + v(j)) / 2) < ALPHA_CUTOFF;
    a.push(i);
    b.push(j);
    rest.push(
      Math.hypot(
        restLocal[j * 3] - restLocal[i * 3],
        restLocal[j * 3 + 1] - restLocal[i * 3 + 1],
        restLocal[j * 3 + 2] - restLocal[i * 3 + 2],
      ),
    );
    stiff.push(ghost ? stiffness * GHOST_STIFFNESS : stiffness);
  };

  // Top-down order lets each relaxation sweep carry corrections from the pins toward the hem.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c + 1 < cols) link(i, i + 1, 1);
      if (r + 1 < rows) link(i, i + cols, 1);
      if (c + 1 < cols && r + 1 < rows) {
        link(i, i + cols + 1, SHEAR_STIFFNESS);
        link(i + 1, i + cols, SHEAR_STIFFNESS);
      }
      if (c + 2 < cols) link(i, i + 2, BEND_STIFFNESS);
      if (r + 2 < rows) link(i, i + 2 * cols, BEND_STIFFNESS);
    }
  }

  // Tethers (long-range attachments) stop the hanging cloth from stretching under its own weight.
  const tetherAnchor = new Int32Array(count).fill(-1);
  const tetherRest = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    if (invMass[i] === 0) continue;
    let best = Infinity;
    for (let p = 0; p < count; p++) {
      if (invMass[p] !== 0) continue;
      const d = Math.hypot(restLocal[p * 3] - restLocal[i * 3], restLocal[p * 3 + 1] - restLocal[i * 3 + 1]);
      if (d < best) {
        best = d;
        tetherAnchor[i] = p;
      }
    }
    tetherRest[i] = best;
  }

  return {
    count,
    restLocal,
    invMass,
    gravityScale,
    a: Uint16Array.from(a),
    b: Uint16Array.from(b),
    rest: Float32Array.from(rest),
    stiff: Float32Array.from(stiff),
    tetherAnchor,
    tetherRest,
  };
}
