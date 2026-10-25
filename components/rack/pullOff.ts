import { MathUtils, Vector3, type Object3D, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import { HANGER_DROP, RAIL_Y, SHIRT_HEIGHT } from "./constants";
import { IMAGE_TOP_SHARE } from "./GarmentImage";
import type { ViewKind } from "./GarmentViews";

const LIFT_TIME = 0.8; // seconds to take a shirt off the rail and fly it to the modal's spot (and back)
const LIFT_CLEAR = 0.06; // metres up first, so the hook clears the rail before it moves
const FLY_Z = 0.8; // metres in front of the rail: clear of every other garment on it
const CALM_SPEED = 0.05; // hem speed (m/s) below which the shirt has stopped swinging...
const CALM_FOR = 0.15; // ...for this long (seconds)
const MAX_SETTLE = 1.5; // seconds after arriving: hand over to the modal even if it's still swaying

/** The camera layer the flying shirt (and the light on it) is drawn on, alone, during View. */
export const SOLO_LAYER = 1;

export type Placement = { x: number; y: number; z: number; scale: number };
/** A modal view's canvas, for the rack to draw the garment into. */
export type Capture = { canvas: HTMLCanvasElement; kind: ViewKind };
/** Sets the lifted garment up to be drawn as `kind` (null: back to normal); false if it has no such view. */
export type Stage = (kind: ViewKind | null) => boolean;

const ray = new Vector3();

/**
 * The View trick. On View, the rack freezes into a still image (without the shirt), and the canvas,
 * stacked above the modal, draws only the shirt. The shirt comes off the rail and flies to exactly
 * where the modal shows its front image, at the same size on screen. Once it stops swinging it
 * disappears, revealing the modal's identical image under it. On close, the shirt reappears over
 * that image, the modal fades out beneath it, and the shirt flies back onto the rail, where the
 * live rack takes over from the still. The cloth follows the hanger like any other move.
 */
export class PullOff {
  index = -1; // the shirt off the rail, or -1
  hidden = false; // the modal's image has taken over from the 3D shirt
  private pendingFreeze = false; // the rack should freeze into the still on its next frame
  private snapshot: HTMLCanvasElement | null = null; // the still of the rack, under the modal
  private solo: { shirt: Object3D; background: Scene["background"] } | null = null;
  private progress = 0;
  private lifting = false;
  private box: DOMRect | null = null; // the modal image's box, until it's turned into `goal`
  private readonly goal: Placement = { x: 0, y: RAIL_Y + LIFT_CLEAR, z: FLY_Z, scale: 1 };
  private onRest: ((drawn: boolean[]) => void) | null = null;
  private captures: Capture[] = []; // the modal's views, drawn from the lit garment
  private crop: { x: number; y: number; w: number; h: number; cw: number; ch: number } | null = null;
  private pendingCapture = false;
  private arrivedFor = 0;
  private calmFor = 0;

  /** @param onLanded called once a shirt is back on the rail and the live rack has taken over. */
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

  /**
   * Where the modal shows the garment (its image box, viewport px). Once the shirt rests there, the
   * rack draws each of the modal's views into `captures`, lit exactly as on the rack, and calls
   * `onRest` with which were drawn: the image that takes over is the shirt itself, not a flat photo.
   */
  flyTo = (box: DOMRect, captures: Capture[], onRest: (drawn: boolean[]) => void) => {
    this.box = box;
    this.captures = captures;
    this.onRest = onRest;
  };

  /** The modal's image is showing: the 3D shirt over it can go. */
  hide = () => {
    this.hidden = true;
  };

  /** Closing: the 3D shirt reappears over the modal's image (re-aimed at `box`, in case it moved). */
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

  /** Whether the rack should call captureRest() this frame (after laying out the shirt). */
  get wantsCapture() {
    return this.pendingCapture;
  }

  /**
   * The shirt is at rest over the modal's image: for each of the modal's views, set the garment
   * up as that view (`stage`), render it alone on a clear background, and copy the image's box
   * into that view's canvas. Then hand over, with the garment back to normal.
   */
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
      // Same task as the render, so the drawing buffer still holds the frame.
      ctx.drawImage(gl.domElement, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, 0, 0, canvas.width, canvas.height);
      return true;
    });
    stage(null);
    const rest = this.onRest;
    this.onRest = null;
    rest?.(drawn);
  }

  /** Whether the rack should call freeze() this frame. */
  get wantsFreeze() {
    return this.pendingFreeze;
  }

  /**
   * Freezes the rack into the still: one frame rendered without `shirt`, copied to the snapshot
   * canvas under the modal. From then on the canvas draws only `shirt`, on a clear background.
   */
  freeze(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, shirt: Object3D) {
    this.pendingFreeze = false;
    const still = this.snapshot;
    if (!still) return;
    shirt.visible = false;
    gl.render(scene, camera);
    still.width = gl.domElement.width;
    still.height = gl.domElement.height;
    // Same task as the render, so the drawing buffer still holds the frame.
    still.getContext("2d")?.drawImage(gl.domElement, 0, 0);
    still.style.display = "block";
    shirt.visible = true;
    shirt.traverse((o) => o.layers.enable(SOLO_LAYER));
    this.solo = { shirt, background: scene.background };
    scene.background = null;
    camera.layers.set(SOLO_LAYER);
  }

  /** Once the shirt is back on the rail: the live rack takes over from the still, this frame. */
  thawIfLanded(scene: Scene, camera: PerspectiveCamera) {
    if (!this.solo || this.index >= 0) return;
    this.solo.shirt.traverse((o) => o.layers.disable(SOLO_LAYER));
    scene.background = this.solo.background;
    camera.layers.set(0);
    if (this.snapshot) this.snapshot.style.display = "none";
    this.solo = null;
    this.onLanded();
  }

  /** How far the shirt is from the rail, 0..1. */
  get away() {
    return MathUtils.smoothstep(this.progress, 0.2, 1);
  }

  /** Advances the flight; `instant` (reduced motion) jumps to the end. `hemSpeed`: the lifted shirt's swing. */
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

  /** The lifted slot's placement, for a rack position of `restX`: up off the rail, then across to the goal. */
  place(restX: number, out: Placement) {
    const up = MathUtils.smoothstep(this.progress, 0, 0.3);
    const across = this.away;
    out.x = MathUtils.lerp(restX, this.goal.x, across);
    out.y = MathUtils.lerp(RAIL_Y + LIFT_CLEAR * up, this.goal.y, across);
    out.z = MathUtils.lerp(0, this.goal.z, across);
    out.scale = MathUtils.lerp(1, this.goal.scale, across);
    return out;
  }

  /** Turns the modal image's box into a slot placement at FLY_Z that covers it exactly. */
  private aim(box: DOMRect, camera: PerspectiveCamera, canvas: HTMLElement) {
    const c = canvas.getBoundingClientRect();
    this.crop = { x: box.left - c.left, y: box.top - c.top, w: box.width, h: box.height, cw: c.width, ch: c.height };
    // The garment image fills the box below the hook's headroom (see GarmentImage).
    const imageHeight = box.height * (1 - IMAGE_TOP_SHARE);
    const x = box.left + box.width / 2 - c.left;
    const y = box.top + box.height * IMAGE_TOP_SHARE + imageHeight / 2 - c.top;
    // The camera is level (the rig shifts the lens rather than tilting), so size goes by depth alone.
    const depth = camera.position.z - FLY_Z;
    const worldPerPx = (2 * depth * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / c.height;
    const scale = (imageHeight * worldPerPx) / SHIRT_HEIGHT;
    ray.set((x / c.width) * 2 - 1, 1 - (y / c.height) * 2, 0.5).unproject(camera).sub(camera.position);
    const t = (FLY_Z - camera.position.z) / ray.z;
    this.goal.x = camera.position.x + ray.x * t;
    // That point is the image's centre; the slot (rail) sits above it by the hang, scaled.
    this.goal.y = camera.position.y + ray.y * t + scale * (HANGER_DROP + SHIRT_HEIGHT / 2);
    this.goal.z = FLY_Z;
    this.goal.scale = scale;
  }
}
