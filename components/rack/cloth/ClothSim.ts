import { MathUtils, type Texture } from "three";
import { HANGER_DROP, RELAX_TIME, SHIRT_HEIGHT, SHIRT_WIDTH } from "../constants";
import type { AlphaMask, ClothSpec } from "./buildConstraints";
import type { ShirtSurface } from "../shirtSurface";
import type { GarmentKind } from "../shirts";

export type HangerPose = { x: number; y: number; z: number; rotY: number };

type Vec3 = [number, number, number];

export type ClothPointer =
  | { kind: "hover"; id: number; point: Vec3; velocity: Vec3 }
  | { kind: "grab"; id: number; seq: number; anchor: Vec3; target: Vec3 };

export type WorkerRequest =
  | {
      type: "init";
      id: number;
      spec: ClothSpec;
      mask: AlphaMask;
      pose: HangerPose;
      positions: Float32Array;
    }
  | { type: "remove"; id: number }
  | {
      type: "step";
      dt: number;
      sims: { id: number; pose: HangerPose; buffer: Float32Array }[];
      pointer: ClothPointer | null;
    };

export type WorkerResponse = { type: "frame"; sims: { id: number; buffer: Float32Array; ready: boolean }[] };

const MASK_WIDTH = 64;
const MASK_HEIGHT = 80;
const masks = new WeakMap<Texture, AlphaMask>();

export function alphaMask(texture: Texture): AlphaMask {
  const cached = masks.get(texture);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(texture.image as CanvasImageSource, 0, 0, MASK_WIDTH, MASK_HEIGHT);
  const rgba = ctx.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
  const data = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3];
  const mask = { width: MASK_WIDTH, height: MASK_HEIGHT, data };
  masks.set(texture, mask);
  return mask;
}

type Entry = {
  surface: ShirtSurface;
  buffer: Float32Array | null;
};

type Relax = {
  surface: ShirtSurface;
  from: Float32Array;
  current: Float32Array;
  elapsed: number;
};

export class ClothSim {
  private worker = new Worker(new URL("./cloth.worker.ts", import.meta.url), { type: "module" });
  private entries = new Map<number, Entry>();
  private relaxing = new Map<number, Relax>();
  private inFlight = false;
  private pendingDt = 0;

  constructor(private grid: { cols: number; rows: number }) {
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.receive(e.data);
  }

  has(id: number) {
    return this.entries.has(id);
  }

  ids() {
    return [...this.entries.keys()];
  }

  add(id: number, surface: ShirtSurface, texture: Texture, pose: HangerPose, kind: GarmentKind) {
    this.relaxing.delete(id);
    const positions = surface.positions.slice();
    const request: WorkerRequest = {
      type: "init",
      id,
      spec: { ...this.grid, width: SHIRT_WIDTH, height: SHIRT_HEIGHT, top: HANGER_DROP, kind },
      mask: alphaMask(texture),
      pose: { ...pose },
      positions,
    };
    this.entries.set(id, { surface, buffer: new Float32Array(positions.length) });
    this.worker.postMessage(request, [positions.buffer]);
  }

  remove(id: number) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    this.worker.postMessage({ type: "remove", id } satisfies WorkerRequest);
    const from = entry.surface.positions.slice();
    this.relaxing.set(id, { surface: entry.surface, from, current: from.slice(), elapsed: 0 });
  }

  step(dt: number, poses: HangerPose[], pointer: ClothPointer | null) {
    this.relax(dt);
    this.pendingDt += dt;
    if (this.inFlight) return;

    const sims: { id: number; pose: HangerPose; buffer: Float32Array }[] = [];
    for (const [id, entry] of this.entries) {
      if (!entry.buffer) continue;
      sims.push({ id, pose: poses[id], buffer: entry.buffer });
      entry.buffer = null;
    }
    if (sims.length === 0) {
      this.pendingDt = 0;
      return;
    }

    const request: WorkerRequest = { type: "step", dt: this.pendingDt, sims, pointer };
    this.worker.postMessage(request, sims.map((s) => s.buffer.buffer));
    this.pendingDt = 0;
    this.inFlight = true;
  }

  private relax(dt: number) {
    for (const [id, r] of this.relaxing) {
      r.elapsed += dt;
      const t = MathUtils.smoothstep(r.elapsed / RELAX_TIME, 0, 1);
      const rest = r.surface.rest;
      for (let k = 0; k < r.current.length; k++) r.current[k] = r.from[k] + (rest[k] - r.from[k]) * t;
      r.surface.setPose(r.current);
      if (t >= 1) this.relaxing.delete(id);
    }
  }

  private receive({ sims }: WorkerResponse) {
    this.inFlight = false;
    for (const { id, buffer, ready } of sims) {
      const entry = this.entries.get(id);
      if (!entry) continue;
      entry.buffer = buffer;
      if (ready) entry.surface.setPose(buffer);
    }
  }

  dispose() {
    this.worker.terminate();
  }
}
