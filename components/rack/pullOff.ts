import { MathUtils, Vector3, type Object3D, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import { HANGER_DROP, RAIL_Y, SHIRT_HEIGHT } from "./constants";
import { IMAGE_TOP_SHARE } from "./GarmentImage";
import type { ViewKind } from "./GarmentViews";

const LIFT_TIME = 0.8;
const LIFT_CLEAR = 0.06;
const FLY_Z = 0.8;
const CALM_SPEED = 0.05;
const CALM_FOR = 0.15;
const MAX_SETTLE = 1.5;

export const SOLO_LAYER = 1;

export type Placement = { x: number; y: number; z: number; scale: number };
export type Capture = { canvas: HTMLCanvasElement; kind: ViewKind };
export type Stage = (kind: ViewKind | null) => boolean;

const ray = new Vector3();

export class PullOff {
  index = -1;
  hidden = false;
  private pendingFreeze = false;
  private snapshot: HTMLCanvasElement | null = null;
  private solo: { shirt: Object3D; background: Scene["background"] } | null = null;
  private progress = 0;
  private lifting = false;
  private box: DOMRect | null = null;
  private readonly goal: Placement = { x: 0, y: RAIL_Y + LIFT_CLEAR, z: FLY_Z, scale: 1 };
  private onRest: ((drawn: boolean[]) => void) | null = null;
  private captures: Capture[] = [];
  private crop: { x: number; y: number; w: number; h: number; cw: number; ch: number } | null = null;
  private pendingCapture = false;
  private arrivedFor = 0;
  private calmFor = 0;

  constructor(readonly onLanded: () => void) {}

  setSnapshot = (canvas: HTMLCanvasElement | null) => {
    this.snapshot = canvas;
  };

  lift(index: number) {
    this.pendingCapture = false;
    this.index = index;
    this.progress = 0;
    this.lifting = true;
    this.hidden = false;
    this.pendingFreeze = true;
    this.arrivedFor = this.calmFor = 0;
  }

  flyTo = (box: DOMRect, captures: Capture[], onRest: (drawn: boolean[]) => void) => {
    this.box = box;
    this.captures = captures;
    this.onRest = onRest;
  };

  hide = () => {
    this.hidden = true;
  };

  unhide = (box: DOMRect) => {
    this.box = box;
    this.hidden = false;
    this.onRest = null;
  };

  putBack = () => {
    this.pendingCapture = false;
    this.lifting = false;
    this.hidden = false;
    this.onRest = null;
  };

  get wantsCapture() {
    return this.pendingCapture;
  }

  captureRest(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, stage: Stage) {
    this.pendingCapture = false;
    const crop = this.crop;
    const drawn = this.captures.map(({ canvas, kind }) => {
      if (!crop || !this.solo || !stage(kind)) return false;
      gl.render(scene, camera);
      const sx = gl.domElement.width / crop.cw;
      const sy = gl.domElement.height / crop.ch;
      canvas.width = Math.round(crop.w * sx);
      canvas.height = Math.round(crop.h * sy);
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(gl.domElement, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, 0, 0, canvas.width, canvas.height);
      return true;
    });
    stage(null);
    const rest = this.onRest;
    this.onRest = null;
    rest?.(drawn);
  }

  get wantsFreeze() {
    return this.pendingFreeze;
  }

  freeze(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, shirt: Object3D) {
    this.pendingFreeze = false;
    const still = this.snapshot;
    if (!still) return;
    shirt.visible = false;
    gl.render(scene, camera);
    still.width = gl.domElement.width;
    still.height = gl.domElement.height;
    still.getContext("2d")?.drawImage(gl.domElement, 0, 0);
    still.style.display = "block";
    shirt.visible = true;
    shirt.traverse((o) => o.layers.enable(SOLO_LAYER));
    this.solo = { shirt, background: scene.background };
    scene.background = null;
    camera.layers.set(SOLO_LAYER);
  }

  thawIfLanded(scene: Scene, camera: PerspectiveCamera) {
    if (!this.solo || this.index >= 0) return;
    this.solo.shirt.traverse((o) => o.layers.disable(SOLO_LAYER));
    scene.background = this.solo.background;
    camera.layers.set(0);
    if (this.snapshot) this.snapshot.style.display = "none";
    this.solo = null;
    this.onLanded();
  }

  get away() {
    return MathUtils.smoothstep(this.progress, 0.2, 1);
  }

  update(dt: number, instant: boolean, camera: PerspectiveCamera, canvas: HTMLElement, hemSpeed: number) {
    if (this.index < 0) return;
    if (this.box) {
      this.aim(this.box, camera, canvas);
      this.box = null;
    }
    const step = instant ? 1 : dt / LIFT_TIME;
    this.progress = MathUtils.clamp(this.progress + (this.lifting ? step : -step), 0, 1);

    if (this.lifting && this.progress === 1 && this.onRest) {
      this.arrivedFor += dt;
      this.calmFor = hemSpeed < CALM_SPEED ? this.calmFor + dt : 0;
      if (instant || this.calmFor >= CALM_FOR || this.arrivedFor >= MAX_SETTLE) this.pendingCapture = true;
    }
    if (!this.lifting && this.progress === 0) this.index = -1;
  }

  place(restX: number, out: Placement) {
    const up = MathUtils.smoothstep(this.progress, 0, 0.3);
    const across = this.away;
    out.x = MathUtils.lerp(restX, this.goal.x, across);
    out.y = MathUtils.lerp(RAIL_Y + LIFT_CLEAR * up, this.goal.y, across);
    out.z = MathUtils.lerp(0, this.goal.z, across);
    out.scale = MathUtils.lerp(1, this.goal.scale, across);
    return out;
  }

  private aim(box: DOMRect, camera: PerspectiveCamera, canvas: HTMLElement) {
    const c = canvas.getBoundingClientRect();
    this.crop = { x: box.left - c.left, y: box.top - c.top, w: box.width, h: box.height, cw: c.width, ch: c.height };
    const imageHeight = box.height * (1 - IMAGE_TOP_SHARE);
    const x = box.left + box.width / 2 - c.left;
    const y = box.top + box.height * IMAGE_TOP_SHARE + imageHeight / 2 - c.top;
    const depth = camera.position.z - FLY_Z;
    const worldPerPx = (2 * depth * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / c.height;
    const scale = (imageHeight * worldPerPx) / SHIRT_HEIGHT;
    ray.set((x / c.width) * 2 - 1, 1 - (y / c.height) * 2, 0.5).unproject(camera).sub(camera.position);
    const t = (FLY_Z - camera.position.z) / ray.z;
    this.goal.x = camera.position.x + ray.x * t;
    this.goal.y = camera.position.y + ray.y * t + scale * (HANGER_DROP + SHIRT_HEIGHT / 2);
    this.goal.z = FLY_Z;
    this.goal.scale = scale;
  }
}
