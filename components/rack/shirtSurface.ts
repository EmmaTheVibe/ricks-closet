import { DynamicDrawUsage, PlaneGeometry, Sphere, Vector3, type BufferAttribute } from "three";
import { sampleAlpha, type AlphaMask } from "./cloth/buildConstraints";
import { EDGE_ROUNDING, HANGER_DROP, SHIRT_HEIGHT, SHIRT_THICKNESS, SHIRT_WIDTH } from "./constants";

function createPanel(cols: number, rows: number) {
  const geometry = new PlaneGeometry(SHIRT_WIDTH, SHIRT_HEIGHT, cols - 1, rows - 1);
  const centerY = -HANGER_DROP - SHIRT_HEIGHT / 2;
  geometry.translate(0, centerY, 0);
  (geometry.getAttribute("position") as BufferAttribute).setUsage(DynamicDrawUsage);
  // The cloth stays near its rest plane, so a generous fixed bound avoids recomputing it per frame.
  geometry.boundingSphere = new Sphere(new Vector3(0, centerY, 0), Math.hypot(SHIRT_WIDTH, SHIRT_HEIGHT) / 2 + 0.3);
  return geometry;
}

/**
 * Half the front-to-back gap at each grid vertex. Every vertex of a grid cell that the outline
 * passes through gets zero, so wherever the shirt's edge is drawn the two panels are the same
 * surface and can't come apart however the cloth bends. Further in, the gap rounds up with the
 * distance to the outline, and thins toward the hem.
 */
function panelOffsets(cols: number, rows: number, mask: AlphaMask) {
  // Transparent pixels touching opaque ones: just outside the outline.
  const outline: number[] = [];
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < mask.width && y < mask.height && mask.data[y * mask.width + x] >= 128;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        outline.push(((x + 0.5) / mask.width) * SHIRT_WIDTH, ((y + 0.5) / mask.height) * SHIRT_HEIGHT);
      }
    }
  }

  const inside = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < cols && r < rows && sampleAlpha(mask, c / (cols - 1), r / (rows - 1)) >= 0.5;
  const onRim = (c: number, r: number) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!inside(c + dc, r + dr)) return true;
    return false;
  };

  const offsets = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (onRim(c, r)) continue;
      const px = (c / (cols - 1)) * SHIRT_WIDTH;
      const py = (r / (rows - 1)) * SHIRT_HEIGHT;
      let dist = Infinity;
      for (let e = 0; e < outline.length; e += 2) dist = Math.min(dist, Math.hypot(outline[e] - px, outline[e + 1] - py));
      const round = Math.sin((Math.min(1, dist / EDGE_ROUNDING) * Math.PI) / 2);
      offsets[r * cols + c] = 0.5 * SHIRT_THICKNESS * round * (1 - (0.5 * r) / (rows - 1));
    }
  }
  return offsets;
}

/**
 * One shirt's surfaces. The cloth sim drives `mid`, a single sheet that is never drawn; the
 * visible `front` and `back` panels are pushed apart from it along its normals so the shirt has
 * volume and closes up at its outline.
 */
export class ShirtSurface {
  readonly mid: PlaneGeometry;
  readonly front: PlaneGeometry;
  readonly back: PlaneGeometry;
  readonly rest: Float32Array; // flat mid-sheet pose
  private offsets: Float32Array;
  private hem: number[]; // fabric vertices in the lower part of the shirt
  readonly hemShift = { x: 0, z: 0 }; // how far the hem has swung from rest, hanger-local
  private hemEdge: number[]; // lowest fabric vertex in each column: the hem line itself
  readonly hemTip = { x: 0, z: 0 }; // how far the hem line itself has swung (moves more than hemShift)

  constructor(cols: number, rows: number, mask: AlphaMask) {
    this.mid = createPanel(cols, rows);
    this.front = createPanel(cols, rows);
    this.back = createPanel(cols, rows);
    this.rest = Float32Array.from(this.mid.getAttribute("position").array);
    this.offsets = panelOffsets(cols, rows, mask);
    this.hem = [];
    for (let i = Math.floor(rows * 0.65) * cols; i < rows * cols; i++) if (this.offsets[i] > 0) this.hem.push(i);
    this.hemEdge = [];
    for (let c = 0; c < cols; c++) {
      for (let r = rows - 1; r >= 0; r--) {
        if (this.offsets[r * cols + c] > 0) {
          this.hemEdge.push(r * cols + c);
          break;
        }
      }
    }
    this.inflate();
  }

  /** Current mid-sheet pose, hanger-local. */
  get positions() {
    return this.mid.getAttribute("position").array as Float32Array;
  }

  setPose(positions: ArrayLike<number>) {
    this.positions.set(positions);
    this.inflate();
  }

  private inflate() {
    this.mid.computeVertexNormals();
    const p = this.positions;
    const n = this.mid.getAttribute("normal").array;
    const frontPos = this.front.getAttribute("position") as BufferAttribute;
    const backPos = this.back.getAttribute("position") as BufferAttribute;
    const f = frontPos.array as Float32Array;
    const b = backPos.array as Float32Array;
    for (let i = 0; i < this.offsets.length; i++) {
      const h = this.offsets[i];
      for (let k = i * 3; k < i * 3 + 3; k++) {
        f[k] = p[k] + n[k] * h;
        b[k] = p[k] - n[k] * h;
      }
    }
    frontPos.needsUpdate = true;
    backPos.needsUpdate = true;

    let dx = 0;
    let dz = 0;
    for (const i of this.hem) {
      dx += p[i * 3] - this.rest[i * 3];
      dz += p[i * 3 + 2] - this.rest[i * 3 + 2];
    }
    const count = Math.max(1, this.hem.length);
    this.hemShift.x = dx / count;
    this.hemShift.z = dz / count;

    let tx = 0;
    let tz = 0;
    for (const i of this.hemEdge) {
      tx += p[i * 3] - this.rest[i * 3];
      tz += p[i * 3 + 2] - this.rest[i * 3 + 2];
    }
    const edges = Math.max(1, this.hemEdge.length);
    this.hemTip.x = tx / edges;
    this.hemTip.z = tz / edges;
    this.front.computeVertexNormals();
    this.back.computeVertexNormals();
  }

  dispose() {
    this.mid.dispose();
    this.front.dispose();
    this.back.dispose();
  }
}
