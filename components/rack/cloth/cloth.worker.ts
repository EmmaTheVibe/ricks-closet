// Verlet cloth solver. Simulates in world space so moving the hanger gives inertia, and returns
// positions in hanger-local space so the mesh can stay parented to the hanger.
import {
  CLOTH_INERTIA,
  DAMPING,
  DT,
  GRAB_RADIUS,
  GRAB_STIFFNESS,
  GRAVITY,
  HANGER_BAR_DROP,
  ITERATIONS,
  POINTER_MAX_SPEED,
  PUSH_DRAG,
  PUSH_RADIUS,
  PUSH_STRENGTH,
  SHAPE_STIFFNESS,
  SUBSTEPS_MAX,
  TETHER_SLACK,
  WARMUP_STEPS,
  WIND_STRENGTH,
} from "../constants";
import { buildConstraints, type ClothTopology } from "./buildConstraints";
import type { ClothPointer, HangerPose, WorkerRequest, WorkerResponse } from "./ClothSim";

const WARMUP_DAMPING = 0.9; // heavy damping so the warm-up settles fully before the first frame
const WARMUP_STEPS_PER_FRAME = 20; // spread warm-up so a new shirt never stalls the others
const WIND_FADE = 0.5; // metres below the hanger bar over which the wind fades in

type Grab = { seq: number; particles: Int32Array; weights: Float32Array; offsets: Float32Array };

type Sim = {
  topo: ClothTopology;
  pos: Float32Array;
  prev: Float32Array;
  pose: HangerPose; // pose at the end of the last substep
  acc: number;
  warmupLeft: number;
  time: number;
  windMask: Float32Array; // 0 at the hanger, 1 toward the hem
  grab: Grab | null;
};

const sims = new Map<number, Sim>();
const fromPose: HangerPose = { x: 0, y: 0, z: 0, rotY: 0 };
const substepPose: HangerPose = { x: 0, y: 0, z: 0, rotY: 0 };

/** 1 at the centre, easing to 0 at `radius`. */
function falloff(dist: number, radius: number) {
  const t = Math.min(1, dist / radius);
  return 1 - t * t * (3 - 2 * t);
}

/** Picks the particles near the grab point, with their offsets so the patch keeps its shape. */
function selectGrab(sim: Sim, seq: number, anchor: [number, number, number]): Grab {
  const { pos, pose } = sim;
  const { invMass, count } = sim.topo;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);
  const particles: number[] = [];
  const weights: number[] = [];
  const offsets: number[] = [];
  for (let i = 0; i < count; i++) {
    if (invMass[i] === 0) continue;
    const k = i * 3;
    const dx = pos[k] - pose.x;
    const dz = pos[k + 2] - pose.z;
    const ox = dx * cos - dz * sin - anchor[0];
    const oy = pos[k + 1] - pose.y - anchor[1];
    const oz = dx * sin + dz * cos - anchor[2];
    const dist = Math.hypot(ox, oy, oz);
    if (dist >= GRAB_RADIUS) continue;
    particles.push(i);
    weights.push(falloff(dist, GRAB_RADIUS));
    offsets.push(ox, oy, oz);
  }
  return {
    seq,
    particles: Int32Array.from(particles),
    weights: Float32Array.from(weights),
    offsets: Float32Array.from(offsets),
  };
}

/** Pointer forces: grabbed cloth is pulled to the pointer; hovered cloth is pushed back and dragged. */
function applyPointer(sim: Sim, pose: HangerPose, pointer: ClothPointer) {
  const { pos } = sim;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);

  if (pointer.kind === "grab") {
    const grab = sim.grab;
    if (!grab) return;
    const [tx, ty, tz] = pointer.target;
    for (let j = 0; j < grab.particles.length; j++) {
      const k = grab.particles[j] * 3;
      const lx = tx + grab.offsets[j * 3];
      const ly = ty + grab.offsets[j * 3 + 1];
      const lz = tz + grab.offsets[j * 3 + 2];
      const pull = grab.weights[j] * GRAB_STIFFNESS;
      pos[k] += (pose.x + lx * cos + lz * sin - pos[k]) * pull;
      pos[k + 1] += (pose.y + ly - pos[k + 1]) * pull;
      pos[k + 2] += (pose.z - lx * sin + lz * cos - pos[k + 2]) * pull;
    }
    return;
  }

  const [px, py, pz] = pointer.point;
  const wx = pose.x + px * cos + pz * sin;
  const wy = pose.y + py;
  const wz = pose.z - px * sin + pz * cos;
  let [vx, vy, vz] = pointer.velocity;
  const speed = Math.hypot(vx, vy, vz);
  if (speed > POINTER_MAX_SPEED) {
    const s = POINTER_MAX_SPEED / speed;
    vx *= s;
    vy *= s;
    vz *= s;
  }
  // Pointer velocity to world space (rotation only).
  const wvx = vx * cos + vz * sin;
  const wvz = -vx * sin + vz * cos;
  const { invMass, count } = sim.topo;
  for (let i = 0; i < count; i++) {
    if (invMass[i] === 0) continue;
    const k = i * 3;
    const dist = Math.hypot(pos[k] - wx, pos[k + 1] - wy, pos[k + 2] - wz);
    if (dist >= PUSH_RADIUS) continue;
    const f = falloff(dist, PUSH_RADIUS) * DT * DT;
    pos[k] += wvx * PUSH_DRAG * f;
    pos[k + 1] += vy * PUSH_DRAG * f;
    pos[k + 2] += (wvz * PUSH_DRAG - PUSH_STRENGTH) * f; // pushed away from the camera
  }
}

/** A slow travelling wave through the shirt's face, strongest at the hem. */
function applyWind(sim: Sim, pose: HangerPose) {
  const { pos, time, windMask } = sim;
  const { restLocal, invMass, count } = sim.topo;
  const gust = WIND_STRENGTH * (0.6 + 0.4 * Math.sin(time * 0.37) * Math.sin(time * 0.23 + 1.3));
  const nx = Math.sin(pose.rotY); // shirt's facing direction in world space
  const nz = Math.cos(pose.rotY);
  for (let i = 0; i < count; i++) {
    if (invMass[i] === 0 || windMask[i] === 0) continue;
    const k = i * 3;
    const wave = Math.sin(time * 1.7 + restLocal[k + 1] * 4 + restLocal[k] * 2);
    const a = gust * windMask[i] * wave * DT * DT;
    pos[k] += nx * a;
    pos[k + 2] += nz * a;
  }
}

/**
 * Moves the free particles rigidly along with `amount` of the hanger's motion from `from` to `to`.
 * Both pos and prev move, so no velocity is added: the cloth only swings in response to the
 * remaining (1 - amount) of the motion. This is what keeps the shirts heavy and calm.
 */
function carry(sim: Sim, from: HangerPose, to: HangerPose, amount: number) {
  const turn = (to.rotY - from.rotY) * amount;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const tx = (to.x - from.x) * amount;
  const ty = (to.y - from.y) * amount;
  const tz = (to.z - from.z) * amount;
  const { invMass, count } = sim.topo;
  for (const p of [sim.pos, sim.prev]) {
    for (let i = 0; i < count; i++) {
      if (invMass[i] === 0) continue;
      const k = i * 3;
      const dx = p[k] - from.x;
      const dz = p[k + 2] - from.z;
      p[k] = from.x + tx + dx * cos + dz * sin;
      p[k + 1] += ty;
      p[k + 2] = from.z + tz - dx * sin + dz * cos;
    }
  }
}

function placePins(sim: Sim, pose: HangerPose) {
  const { restLocal, invMass, count } = sim.topo;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);
  for (let i = 0; i < count; i++) {
    if (invMass[i] !== 0) continue;
    const k = i * 3;
    const lx = restLocal[k];
    const lz = restLocal[k + 2];
    sim.pos[k] = sim.prev[k] = pose.x + lx * cos + lz * sin;
    sim.pos[k + 1] = sim.prev[k + 1] = pose.y + restLocal[k + 1];
    sim.pos[k + 2] = sim.prev[k + 2] = pose.z - lx * sin + lz * cos;
  }
}

/** One solver step. `pointer` and wind only apply once the shirt is live (not during warm-up). */
function step(sim: Sim, pose: HangerPose, damping: number, live = false, pointer: ClothPointer | null = null) {
  const { pos, prev } = sim;
  const { count, invMass, gravityScale, a, b, rest, stiff, tetherAnchor, tetherRest } = sim.topo;

  placePins(sim, pose);

  const gravity = -GRAVITY * DT * DT;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);
  for (let i = 0; i < count; i++) {
    if (invMass[i] === 0) continue;
    const k = i * 3;
    for (let j = k; j < k + 3; j++) {
      const v = (pos[j] - prev[j]) * damping;
      prev[j] = pos[j];
      pos[j] += v;
    }
    pos[k + 1] += gravity * gravityScale[i];

    // Gentle horizontal pull toward the rest shape on the hanger; vertical is left to gravity.
    const lx = sim.topo.restLocal[k];
    const lz = sim.topo.restLocal[k + 2];
    pos[k] += (pose.x + lx * cos + lz * sin - pos[k]) * SHAPE_STIFFNESS;
    pos[k + 2] += (pose.z - lx * sin + lz * cos - pos[k + 2]) * SHAPE_STIFFNESS;
  }

  if (live) {
    sim.time += DT;
    applyWind(sim, pose);
    if (pointer) applyPointer(sim, pose, pointer);
  }

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Alternate sweep direction so the sequential solve doesn't bias the cloth to one side.
    const forward = iter % 2 === 0;
    for (let n = 0; n < a.length; n++) {
      const c = forward ? n : a.length - 1 - n;
      const wa = invMass[a[c]];
      const wb = invMass[b[c]];
      const ia = a[c] * 3;
      const ib = b[c] * 3;
      const dx = pos[ib] - pos[ia];
      const dy = pos[ib + 1] - pos[ia + 1];
      const dz = pos[ib + 2] - pos[ia + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 1e-9) continue;
      // Equal masses: each end moves halfway to the rest length, scaled by stiffness.
      const s = (stiff[c] * (dist - rest[c])) / (dist * (wa + wb));
      pos[ia] += dx * s * wa;
      pos[ia + 1] += dy * s * wa;
      pos[ia + 2] += dz * s * wa;
      pos[ib] -= dx * s * wb;
      pos[ib + 1] -= dy * s * wb;
      pos[ib + 2] -= dz * s * wb;
    }

    for (let i = 0; i < count; i++) {
      const anchor = tetherAnchor[i];
      if (anchor < 0) continue;
      const k = i * 3;
      const ka = anchor * 3;
      const dx = pos[k] - pos[ka];
      const dy = pos[k + 1] - pos[ka + 1];
      const dz = pos[k + 2] - pos[ka + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const max = tetherRest[i] * TETHER_SLACK;
      if (dist <= max) continue;
      const f = max / dist;
      pos[k] = pos[ka] + dx * f;
      pos[k + 1] = pos[ka + 1] + dy * f;
      pos[k + 2] = pos[ka + 2] + dz * f;
    }
  }
}

/** Advances the sim by one frame; returns false while it is still warming up. */
function advance(sim: Sim, dt: number, to: HangerPose, pointer: ClothPointer | null) {
  if (pointer?.kind === "grab") {
    if (sim.grab?.seq !== pointer.seq) sim.grab = selectGrab(sim, pointer.seq, pointer.anchor);
  } else {
    sim.grab = null;
  }

  if (sim.warmupLeft > 0) {
    carry(sim, sim.pose, to, 1);
    const n = Math.min(sim.warmupLeft, WARMUP_STEPS_PER_FRAME);
    for (let i = 0; i < n; i++) step(sim, to, WARMUP_DAMPING);
    sim.warmupLeft -= n;
    sim.pose = { ...to };
    return sim.warmupLeft === 0;
  }

  sim.acc += dt;
  let n = Math.floor(sim.acc / DT);
  if (n > SUBSTEPS_MAX) {
    // Too far behind (long frame, hidden tab): drop the backlog instead of spiralling.
    n = SUBSTEPS_MAX;
    sim.acc = 0;
  } else {
    sim.acc -= n * DT;
  }
  if (n === 0) return true;

  // Spread the hanger's motion across substeps so fast swipes don't jerk the pins.
  Object.assign(fromPose, sim.pose);
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    substepPose.x = fromPose.x + (to.x - fromPose.x) * t;
    substepPose.y = fromPose.y + (to.y - fromPose.y) * t;
    substepPose.z = fromPose.z + (to.z - fromPose.z) * t;
    substepPose.rotY = fromPose.rotY + (to.rotY - fromPose.rotY) * t;
    carry(sim, sim.pose, substepPose, 1 - CLOTH_INERTIA);
    step(sim, substepPose, DAMPING, true, pointer);
    Object.assign(sim.pose, substepPose);
  }
  return true;
}

function writeLocal(sim: Sim, out: Float32Array) {
  const { pos, pose } = sim;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);
  for (let k = 0; k < pos.length; k += 3) {
    const dx = pos[k] - pose.x;
    const dz = pos[k + 2] - pose.z;
    out[k] = dx * cos - dz * sin;
    out[k + 1] = pos[k + 1] - pose.y;
    out[k + 2] = dx * sin + dz * cos;
  }
}

function init(msg: Extract<WorkerRequest, { type: "init" }>) {
  const topo = buildConstraints(msg.spec, msg.mask);
  const { pose, positions } = msg;
  const cos = Math.cos(pose.rotY);
  const sin = Math.sin(pose.rotY);

  // Start from the shirt's current local pose (flat, or wherever it was easing back to rest).
  const pos = new Float32Array(topo.count * 3);
  for (let k = 0; k < pos.length; k += 3) {
    pos[k] = pose.x + positions[k] * cos + positions[k + 2] * sin;
    pos[k + 1] = pose.y + positions[k + 1];
    pos[k + 2] = pose.z - positions[k] * sin + positions[k + 2] * cos;
  }

  const windMask = new Float32Array(topo.count);
  for (let i = 0; i < topo.count; i++) {
    const belowBar = -topo.restLocal[i * 3 + 1] - HANGER_BAR_DROP;
    const t = Math.min(1, Math.max(0, belowBar / WIND_FADE));
    windMask[i] = t * t * (3 - 2 * t);
  }

  sims.set(msg.id, {
    topo,
    pos,
    prev: pos.slice(),
    pose: { ...pose },
    acc: 0,
    warmupLeft: WARMUP_STEPS,
    time: Math.random() * 100, // desynchronise the breeze between shirts
    windMask,
    grab: null,
  });
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "init") init(msg);
  else if (msg.type === "remove") sims.delete(msg.id);
  else {
    // Hand every buffer back so the main thread can reuse it; `ready` says whether it holds a pose.
    const response: WorkerResponse = { type: "frame", sims: [] };
    for (const { id, pose, buffer } of msg.sims) {
      const sim = sims.get(id);
      const pointer = msg.pointer?.id === id ? msg.pointer : null;
      const ready = sim ? advance(sim, msg.dt, pose, pointer) : false;
      if (sim && ready) writeLocal(sim, buffer);
      response.sims.push({ id, buffer, ready });
    }
    self.postMessage(response, { transfer: msg.sims.map((s) => s.buffer.buffer) });
  }
};
