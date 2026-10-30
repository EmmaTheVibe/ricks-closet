import { useEffect, useState, type RefObject } from "react";
import { useDrag } from "@use-gesture/react";
import { MathUtils } from "three";
import { FLICK_TIME, SCROLL_EASE, SHELF_STEP, WHEEL_SPEED } from "./constants";

export class WallScroll {
  y = 0;
  target = 0;
  private min = 0;
  private max = 0;
  private dragging = false;
  private dragStart = 0;
  private pxToMetres = 0;
  halfHeight = 0;
  private started = false;

  setBounds(min: number, max: number) {
    this.min = min;
    this.max = Math.max(min, max);
    if (!this.started) {
      this.started = true;
      this.y = this.target = this.max;
    }
    this.target = MathUtils.clamp(this.target, this.min, this.max);
  }

  get fitsWhole() {
    return this.max === this.min;
  }

  setHalfHeight(value: number) {
    this.halfHeight = value;
  }

  setPxToMetres(value: number) {
    this.pxToMetres = value;
  }

  scrollBy(metres: number) {
    this.target = MathUtils.clamp(this.target + metres, this.min, this.max);
  }

  beginDrag() {
    this.dragging = true;
    this.dragStart = this.y;
  }

  drag(movementPx: number) {
    this.y = this.target = MathUtils.clamp(this.dragStart + movementPx * this.pxToMetres, this.min, this.max);
  }

  release(velocityPx: number, reducedMotion: boolean) {
    this.dragging = false;
    if (!reducedMotion) this.scrollBy(velocityPx * 1000 * this.pxToMetres * FLICK_TIME);
  }

  step(dt: number) {
    if (this.dragging) return;
    this.y += (this.target - this.y) * (1 - Math.exp(-SCROLL_EASE * Math.min(dt, 0.1)));
  }
}

export function useWallScroll(area: RefObject<HTMLElement | null>) {
  const [scroll] = useState(() => new WallScroll());
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useDrag(
    ({ first, last, tap, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      if (first) scroll.beginDrag();
      if (!tap) scroll.drag(my);
      if (last) scroll.release(tap ? 0 : vy * dy, reduced());
    },
    { target: area, axis: "y", filterTaps: true },
  );

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      scroll.scrollBy(-e.deltaY * WHEEL_SPEED);
    };
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
      const by = { ArrowUp: SHELF_STEP / 2, ArrowDown: -SHELF_STEP / 2, PageUp: SHELF_STEP * 2, PageDown: -SHELF_STEP * 2 }[e.key];
      if (by === undefined) return;
      e.preventDefault();
      scroll.scrollBy(by);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [area, scroll]);

  return scroll;
}
