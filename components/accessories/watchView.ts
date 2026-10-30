import {
  BufferAttribute,
  MathUtils,
  Matrix4,
  Quaternion,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from "three";

const LIFT_TIME = 0.75;
const VIEW_DISTANCE = 0.35;
const FADE_TIME = 0.15;

export const SOLO_LAYER = 1;

export type WatchShape = { position: Float32Array; shade: Float32Array };

export type WatchEntry = { mesh: Mesh; bent: WatchShape; flat: WatchShape; wrist: WatchShape };

const identity = new Quaternion();
const right = new Vector3();
const up = new Vector3();
const back = new Vector3();
const basis = new Matrix4();
const ray = new Vector3();
const forward = new Vector3();

export class WatchView {
  index = -1;
  private readonly entries = new Map<number, WatchEntry>();
  private entry: WatchEntry | null = null;
  private readonly rest = new Vector3();
  private progress = 0;
  private lifting = false;
  private opacity = 1;
  private fadeTo = 1;
  private onCovered: (() => void) | null = null;
  private box: DOMRect | null = null;
  private crop: { x: number; y: number; w: number; h: number; cw: number; ch: number } | null = null;
  private readonly goal = { position: new Vector3(), quat: new Quaternion(), scale: 1 };
  private onArrive: ((capture: HTMLCanvasElement | null) => void) | null = null;
  private pendingFreeze = false;
  private snapshot: HTMLCanvasElement | null = null;
  private solo: { background: Scene["background"] } | null = null;

  constructor(private readonly onLanded: () => void) {}

  register = (index: number, entry: WatchEntry | null) => {
    if (entry) this.entries.set(index, entry);
    else this.entries.delete(index);
  };

  setSnapshot = (canvas: HTMLCanvasElement | null) => {
    this.snapshot = canvas;
  };

  lift(index: number) {
    const entry = this.entries.get(index);
    if (!entry) return false;
    this.index = index;
    this.entry = entry;
    this.rest.copy(entry.mesh.position);
    this.progress = 0;
    this.lifting = true;
    this.opacity = this.fadeTo = 1;
    this.pendingFreeze = true;
    return true;
  }

  flyTo = (box: DOMRect, onArrive: (capture: HTMLCanvasElement | null) => void) => {
    this.box = box;
    this.onArrive = onArrive;
  };

  handOver = () => {
    this.fadeTo = 0;
  };

  putBack = (box: DOMRect | null, onCovered: () => void) => {
    if (box) this.box = box;
    this.fadeTo = 1;
    this.onCovered = onCovered;
    this.onArrive = null;
  };

  update(dt: number, instant: boolean, gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    const entry = this.entry;
    if (this.index < 0 || !entry) return;
    const { mesh } = entry;
    if (this.pendingFreeze) this.freeze(gl, scene, camera, mesh);
    if (this.box) {
      this.aim(this.box, camera, gl.domElement);
      this.box = null;
    }

    const fadeStep = instant ? 1 : dt / FADE_TIME;
    this.opacity = MathUtils.clamp(this.opacity + Math.sign(this.fadeTo - this.opacity) * fadeStep, 0, 1);
    (mesh.material as MeshBasicMaterial).opacity = this.opacity;
    if (this.onCovered && this.opacity === 1) {
      const covered = this.onCovered;
      this.onCovered = null;
      this.lifting = false;
      covered();
    }

    const step = instant ? 1 : dt / LIFT_TIME;
    this.progress = MathUtils.clamp(this.progress + (this.lifting ? step : -step), 0, 1);
    if (!this.lifting && !this.onCovered && this.progress === 0) {
      this.place(entry, 0);
      this.thaw(scene, camera, mesh);
      return;
    }
    this.place(entry, this.progress);
    if (this.lifting && this.progress === 1 && this.onArrive) {
      const arrive = this.onArrive;
      this.onArrive = null;
      arrive(this.capture(gl, scene, camera));
    }
  }

  private place({ mesh, bent, flat, wrist }: WatchEntry, progress: number) {
    const [from, to, mix] =
      progress < 0.35
        ? [bent, flat, MathUtils.smoothstep(progress, 0, 0.35)]
        : [flat, wrist, MathUtils.smoothstep(progress, 0.7, 1)];
    const blend = (attribute: BufferAttribute, a: Float32Array, b: Float32Array) => {
      const out = attribute.array as Float32Array;
      for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * mix;
      attribute.needsUpdate = true;
    };
    blend(mesh.geometry.getAttribute("position") as BufferAttribute, from.position, to.position);
    blend(mesh.geometry.getAttribute("color") as BufferAttribute, from.shade, to.shade);
    const across = MathUtils.smoothstep(progress, 0.15, 1);
    mesh.position.lerpVectors(this.rest, this.goal.position, across);
    mesh.quaternion.slerpQuaternions(identity, this.goal.quat, across);
    mesh.scale.setScalar(MathUtils.lerp(1, this.goal.scale, across));
  }

  private aim(box: DOMRect, camera: PerspectiveCamera, canvas: HTMLElement) {
    const c = canvas.getBoundingClientRect();
    this.crop = { x: box.left - c.left, y: box.top - c.top, w: box.width, h: box.height, cw: c.width, ch: c.height };
    const x = box.left + box.width / 2 - c.left;
    const y = box.top + box.height / 2 - c.top;
    ray.set((x / c.width) * 2 - 1, 1 - (y / c.height) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    camera.getWorldDirection(forward);
    this.goal.position.copy(camera.position).addScaledVector(ray, VIEW_DISTANCE / ray.dot(forward));
    const worldPerPx = (2 * VIEW_DISTANCE * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / c.height;
    const watchWidth = this.watchWidth();
    this.goal.scale = watchWidth ? (box.width * worldPerPx) / watchWidth : 1;
    camera.matrixWorld.extractBasis(right, up, back);
    basis.makeBasis(right, back, up.negate());
    this.goal.quat.setFromRotationMatrix(basis);
  }

  private watchWidth() {
    const shape = this.entry?.flat.position;
    if (!shape) return 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < shape.length; i += 3) {
      min = Math.min(min, shape[i]);
      max = Math.max(max, shape[i]);
    }
    return max - min;
  }

  private freeze(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, mesh: Mesh) {
    this.pendingFreeze = false;
    const still = this.snapshot;
    if (!still) return;
    mesh.visible = false;
    gl.render(scene, camera);
    still.width = gl.domElement.width;
    still.height = gl.domElement.height;
    still.getContext("2d")?.drawImage(gl.domElement, 0, 0);
    still.style.display = "block";
    mesh.visible = true;
    mesh.layers.enable(SOLO_LAYER);
    this.solo = { background: scene.background };
    scene.background = null;
    camera.layers.set(SOLO_LAYER);
  }

  private capture(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    const crop = this.crop;
    if (!crop || !this.solo || crop.w < 1 || crop.h < 1) return null;
    gl.render(scene, camera);
    const sx = gl.domElement.width / crop.cw;
    const sy = gl.domElement.height / crop.ch;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(crop.w * sx);
    canvas.height = Math.round(crop.h * sy);
    canvas.getContext("2d")?.drawImage(gl.domElement, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  private thaw(scene: Scene, camera: PerspectiveCamera, mesh: Mesh) {
    if (this.solo) {
      mesh.layers.disable(SOLO_LAYER);
      scene.background = this.solo.background;
      camera.layers.set(0);
      this.solo = null;
    }
    if (this.snapshot) this.snapshot.style.display = "none";
    this.index = -1;
    this.entry = null;
    this.onLanded();
  }
}
