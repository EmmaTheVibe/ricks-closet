import { useEffect, useState, type RefObject } from "react";
import { useDrag } from "@use-gesture/react";
import { MathUtils } from "three";
import { MAX_FLICK, MOMENTUM_TIME, RACK_MAX_ACCEL, RACK_MAX_SPEED, RACK_SETTLE_RATE } from "./constants";
import type { ShirtInteraction } from "./interaction";
import { wrapDistance } from "./layout";

const MOTION_DT = 1 / 240;
const BRAKE_MARGIN = 0.8; // plan braking at 80% of max deceleration so the rack never overshoots

/**
 * Rack position lives here, outside React state. `offset` is the continuous index of the
 * shirt in the center slot; the scene reads it every frame and calls `step`. The rack is a
 * loop, so `offset` and `target` are unbounded and only mean anything modulo `count`.
 */
export class RackController {
  offset: number;
  velocity = 0; // shirts per second
  target: number;
  private mode: "idle" | "drag" | "glide" = "idle";
  private dragStart = 0;
  reducedMotion = false;
  private pxToIndex = 0;

  constructor(
    readonly count: number,
    initialIndex: number,
    private onIndexChange: (index: number) => void,
  ) {
    this.offset = initialIndex;
    this.target = initialIndex;
  }

  setPxToIndex(value: number) {
    this.pxToIndex = value;
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  /** Glides to a position on the loop (unbounded; e.g. target + 1 is always the next shirt). */
  goTo(position: number) {
    const next = Math.round(position);
    if (next !== this.target) {
      this.target = next;
      this.onIndexChange(this.wrap(next));
    }
    this.mode = "glide";
  }

  /** Glides to shirt `index` the short way round. */
  goToShirt(index: number) {
    this.goTo(this.offset + wrapDistance(index - this.offset, this.count));
  }

  private wrap(position: number) {
    return ((position % this.count) + this.count) % this.count;
  }

  beginDrag() {
    this.mode = "drag";
    this.dragStart = this.offset;
    this.velocity = 0;
  }

  drag(movementPx: number) {
    this.offset = this.dragStart - movementPx * this.pxToIndex;
  }

  /** A tap, not a drag: resume whatever glide was in progress. */
  cancelDrag() {
    this.mode = "glide";
  }

  release(velocityPxPerMs: number) {
    const velocity = this.reducedMotion ? 0 : -velocityPxPerMs * 1000 * this.pxToIndex;
    this.velocity = MathUtils.clamp(velocity, -RACK_MAX_SPEED, RACK_MAX_SPEED);
    const projected = this.offset + this.velocity * MOMENTUM_TIME;
    this.goTo(MathUtils.clamp(projected, this.offset - MAX_FLICK, this.offset + MAX_FLICK));
  }

  /** Glides toward the target: capped acceleration and speed, then an eased final approach. */
  step(dt: number) {
    if (this.mode !== "glide") return;
    const total = Math.min(dt, 0.1);
    const steps = Math.ceil(total / MOTION_DT);
    const h = total / steps;
    for (let i = 0; i < steps; i++) {
      const gap = this.target - this.offset;
      const speed = Math.min(
        RACK_MAX_SPEED,
        Math.sqrt(2 * RACK_MAX_ACCEL * BRAKE_MARGIN * Math.abs(gap)),
        RACK_SETTLE_RATE * Math.abs(gap),
      );
      const change = Math.sign(gap) * speed - this.velocity;
      this.velocity += MathUtils.clamp(change, -RACK_MAX_ACCEL * h, RACK_MAX_ACCEL * h);
      this.offset += this.velocity * h;
    }
    if (Math.abs(this.target - this.offset) < 1e-4 && Math.abs(this.velocity) < 1e-3) {
      // Settled: fold back into [0, count) so the numbers don't grow with every lap.
      this.target = this.offset = this.wrap(this.target);
      this.velocity = 0;
      this.mode = "idle";
    }
  }
}

export function useRackControls(
  count: number,
  initialIndex: number,
  dragTarget: RefObject<HTMLElement | null>,
  interaction: ShirtInteraction,
  onIndexChange: (index: number) => void,
) {
  const [controls] = useState(() => new RackController(count, initialIndex, onIndexChange));

  // Dragging a shirt tugs it; dragging anywhere else slides the rack.
  useDrag(
    ({ first, last, tap, xy: [x, y], movement: [mx], velocity: [vx], direction: [dx], memo }) => {
      const mode: "grab" | "swipe" = first ? (interaction.startGrab(x, y) ? "grab" : "swipe") : memo;
      if (mode === "grab") {
        interaction.moveGrab(x, y);
        if (last) interaction.endGrab();
        return mode;
      }
      if (first) controls.beginDrag();
      if (!tap) controls.drag(mx);
      if (last) {
        if (tap) controls.cancelDrag();
        else controls.release(vx * dx);
      }
      return mode;
    },
    { target: dragTarget, filterTaps: true },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") controls.goTo(controls.target - 1);
      else if (e.key === "ArrowRight") controls.goTo(controls.target + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => controls.setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [controls]);

  return controls;
}
