import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { ROOMS, type Room } from "../home/constants";

export type Place = Room | "home";

const ORDER: Place[] = ["home", ...(Object.keys(ROOMS) as Room[])];
const ENTER_TIME = 0.9;
export const LEAVE_MS = 300;
const SIDE = 0.35;
const BACK = 0.25;

const motion = { visit: 0, room: null as Room | null, enterDir: 0, leaveDir: 0, leaving: false };
let pending: { to: Place; dir: number } | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    pending = null;
  });
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function enterRoom(room: Room) {
  const arrived = pending?.to === room;
  motion.visit++;
  motion.room = room;
  motion.enterDir = arrived ? pending!.dir : 0;
  motion.leaving = false;
  pending = null;
  return arrived;
}

export function leaveRoom(from: Room, to: Place) {
  const dir = to === "home" ? 0 : Math.sign(ORDER.indexOf(to) - ORDER.indexOf(from));
  motion.leaving = true;
  motion.leaveDir = dir;
  pending = { to, dir };
}

export function arriveFromHome(to: Room) {
  pending = { to, dir: 0 };
}

const right = new Vector3();
const back = new Vector3();

export function RoomPan({ room, ready }: { room: Room; ready: boolean }) {
  const [reduced] = useState(prefersReducedMotion);
  const pan = useRef({ visit: -1, entered: 0, left: 0, base: new Vector3(), placed: new Vector3(NaN, NaN, NaN) });

  useFrame(({ camera }, dt) => {
    if (reduced || motion.room !== room) return;
    const p = pan.current;
    if (p.visit !== motion.visit) {
      p.visit = motion.visit;
      p.entered = 0;
      p.left = 0;
    }
    if (!camera.position.equals(p.placed)) p.base.copy(camera.position);

    const step = Math.min(dt, 1 / 30);
    if (ready) p.entered += step;
    if (motion.leaving) p.left += step;
    const enter = (1 - MathUtils.clamp(p.entered / ENTER_TIME, 0, 1)) ** 3;
    const leave = MathUtils.clamp(p.left / (LEAVE_MS / 1000), 0, 1) ** 3;

    const focus = p.base.length();
    const side = (-motion.enterDir * enter + motion.leaveDir * leave * 0.5) * SIDE * focus;
    const away = ((motion.enterDir ? 0.4 : 1) * enter + (motion.leaveDir ? 0.2 : 1) * leave) * BACK * focus;

    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    back.set(0, 0, 1).applyQuaternion(camera.quaternion);
    camera.position.copy(p.base).addScaledVector(right, side).addScaledVector(back, away);
    p.placed.copy(camera.position);
  });

  return null;
}
