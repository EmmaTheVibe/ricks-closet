import {
  Box3,
  MathUtils,
  Quaternion,
  Vector3,
  type Group,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from "three";

const LIFT_TIME = 0.7;
const LIFT_UP = 0.05;
const VIEW_DISTANCE = 1.1;
const FILL = 0.8;
const TILT = 0.3;
const SPIN_AUTO = 0.35;
const SPIN_IDLE = 1.5;
const SPIN_FRICTION = 4;
const SPIN_PER_PX = 0.012;

export const SOLO_LAYER = 1;

const identity = new Quaternion();
const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), TILT);
const turn = new Quaternion();
const goalQuat = new Quaternion();
const ray = new Vector3();
const forward = new Vector3();
const lift = new Vector3();
const goalOrigin = new Vector3();
const halfUp = new Vector3();
const parentPos = new Vector3();

export class ShoeView {
  index = -1;
  private readonly groups = new Map<number, Group>();
  private group: Group | null = null;
  private readonly rest = { position: new Vector3(), height: 0, length: 0 };
  private progress = 0;
  private lifting = false;
  private box: DOMRect | null = null;
  private crop: { x: number; y: number; w: number; h: number; cw: number; ch: number } | null = null;
  private readonly goal = { centre: new Vector3(), quat: new Quaternion(), scale: 1 };
  private onArrive: ((capture: HTMLCanvasElement | null) => void) | null = null;
  private pendingFreeze = false;
  private snapshot: HTMLCanvasElement | null = null;
  private solo: { background: Scene["background"] } | null = null;
  private spin = 0;
  private spinSpeed = 0;
  private idle = SPIN_IDLE;
  private dragging = false;

  constructor(private readonly onLanded: () => void) {}

  register = (index: number, group: Group | null) => {
    if (group) this.groups.set(index, group);
    else this.groups.delete(index);
  };

  setSnapshot = (canvas: HTMLCanvasElement | null) => {
    this.snapshot = canvas;
  };

  lift(index: number) {
    const group = this.groups.get(index);
    if (!group) return false;
    this.index = index;
    this.group = group;
    this.rest.position.copy(group.position);
    const size = new Box3().setFromObject(group).getSize(new Vector3());
    this.rest.height = size.y;
    this.rest.length = size.x;
    this.progress = 0;
    this.lifting = true;
    this.pendingFreeze = true;
    this.spin = this.spinSpeed = 0;
    this.idle = SPIN_IDLE;
    return true;
  }

  flyTo = (box: DOMRect, onArrive: (capture: HTMLCanvasElement | null) => void) => {
    this.box = box;
    this.onArrive = onArrive;
  };

  follow = (box: DOMRect) => {
    this.box = box;
  };

  putBack = () => {
    this.lifting = false;
    this.onArrive = null;
    this.dragging = false;
    this.spin = MathUtils.euclideanModulo(this.spin + Math.PI, Math.PI * 2) - Math.PI;
  };

  beginSpin = () => {
    this.dragging = true;
    this.spinSpeed = 0;
  };

  spinBy = (dxPx: number) => {
    this.spin += dxPx * SPIN_PER_PX;
  };

  endSpin = (velocityPx: number) => {
    this.dragging = false;
    this.idle = 0;
    this.spinSpeed = velocityPx * SPIN_PER_PX;
  };

  update(dt: number, instant: boolean, gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    const group = this.group;
    if (this.index < 0 || !group) return;
    if (this.pendingFreeze) this.freeze(gl, scene, camera, group);
    if (this.solo) group.traverse((o) => o.layers.enable(SOLO_LAYER));
    if (this.box) {
      this.aim(this.box, camera, gl.domElement);
      this.box = null;
    }

    const step = instant ? 1 : dt / LIFT_TIME;
    this.progress = MathUtils.clamp(this.progress + (this.lifting ? step : -step), 0, 1);
    const arrived = this.lifting && this.progress === 1;
    if (arrived) this.turn(dt, instant);

    if (!this.lifting && this.progress === 0) {
      group.position.copy(this.rest.position);
      group.quaternion.identity();
      group.scale.setScalar(1);
      this.thaw(scene, camera, group);
      return;
    }
    this.place(group);

    if (arrived && this.onArrive) {
      const arrive = this.onArrive;
      this.onArrive = null;
      arrive(this.capture(gl, scene, camera));
    }
  }

  private turn(dt: number, instant: boolean) {
    if (this.dragging) return;
    this.idle += dt;
    this.spinSpeed *= Math.exp(-SPIN_FRICTION * dt);
    this.spin += this.spinSpeed * dt;
    if (!instant && this.idle >= SPIN_IDLE) this.spin += SPIN_AUTO * dt;
  }

  private place(group: Group) {
    const up = MathUtils.smoothstep(this.progress, 0, 0.3);
    const across = MathUtils.smoothstep(this.progress, 0.15, 1);
    group.parent?.getWorldPosition(parentPos);

    goalQuat.copy(this.goal.quat).multiply(tilt).multiply(turn.setFromAxisAngle(halfUp.set(0, 1, 0), this.spin));
    group.quaternion.slerpQuaternions(identity, goalQuat, across);
    group.scale.setScalar(MathUtils.lerp(1, this.goal.scale, across));

    halfUp.set(0, this.rest.height / 2, 0).applyQuaternion(goalQuat).multiplyScalar(this.goal.scale);
    goalOrigin.copy(this.goal.centre).sub(halfUp).sub(parentPos);
    lift.copy(this.rest.position).add(halfUp.set(0, LIFT_UP * up, 0));
    group.position.lerpVectors(lift, goalOrigin, across);
  }

  private aim(box: DOMRect, camera: PerspectiveCamera, canvas: HTMLElement) {
    const c = canvas.getBoundingClientRect();
    this.crop = { x: box.left - c.left, y: box.top - c.top, w: box.width, h: box.height, cw: c.width, ch: c.height };
    const x = box.left + box.width / 2 - c.left;
    const y = box.top + box.height / 2 - c.top;
    ray.set((x / c.width) * 2 - 1, 1 - (y / c.height) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    camera.getWorldDirection(forward);
    this.goal.centre.copy(camera.position).addScaledVector(ray, VIEW_DISTANCE / ray.dot(forward));
    const worldPerPx = (2 * VIEW_DISTANCE * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / c.height;
    this.goal.scale = (FILL * box.width * worldPerPx) / this.rest.length;
    this.goal.quat.copy(camera.quaternion);
  }

  private freeze(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, group: Group) {
    this.pendingFreeze = false;
    const still = this.snapshot;
    if (!still) return;
    group.visible = false;
    gl.render(scene, camera);
    still.width = gl.domElement.width;
    still.height = gl.domElement.height;
    still.getContext("2d")?.drawImage(gl.domElement, 0, 0);
    still.style.display = "block";
    group.visible = true;
    this.solo = { background: scene.background };
    scene.background = null;
    camera.layers.set(SOLO_LAYER);
  }

  private thaw(scene: Scene, camera: PerspectiveCamera, group: Group) {
    if (this.solo) {
      group.traverse((o) => o.layers.disable(SOLO_LAYER));
      scene.background = this.solo.background;
      camera.layers.set(0);
      this.solo = null;
    }
    if (this.snapshot) this.snapshot.style.display = "none";
    this.index = -1;
    this.group = null;
    this.onLanded();
  }

  private capture(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    const crop = this.crop;
    if (!crop || !this.solo) return null;
    gl.render(scene, camera);
    const sx = gl.domElement.width / crop.cw;
    const sy = gl.domElement.height / crop.ch;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(crop.w * sx);
    canvas.height = Math.round(crop.h * sy);
    canvas.getContext("2d")?.drawImage(gl.domElement, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
}
