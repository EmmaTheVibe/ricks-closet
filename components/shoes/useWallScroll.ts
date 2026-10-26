import { useEffect, useState, type RefObject } from "react";
import { useDrag } from "@use-gesture/react";
import { MathUtils } from "three";
import { FLICK_TIME, SCROLL_EASE, SHELF_STEP, WHEEL_SPEED } from "./constants";

/**
 * Where the camera is on the wall, outside React state: `y` is the height it looks at, easing
 * toward `target`. Bounds come from the scene (they depend on how much of the wall fits on screen).
 */
export class WallScroll {
  y = 0;
  target = 0;
  private min = 0;
  private max = 0;
  private dragging = false;
  private dragStart = 0;
  private pxToMetres = 0;
  /** Half the height the view shows at the wall, in metres (set by the camera rig). */
  halfHeight = 0;
  private started = false;

  /** The lowest and highest heights the camera may look at; starts at the top of the wall. */
  setBounds(min: number, max: number) {
    this.min = min;
    this.max = Math.max(min, max);
    if (!this.started) {
      this.started = true;
      this.y = this.target = this.max;
    }
    this.target = MathUtils.clamp(this.target, this.min, this.max);
  }

  /** The whole wall fits on screen, so it doesn't scroll (phones). */
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

  /** `movementPx` down the screen: the wall follows the finger, so the camera moves up. */
  drag(movementPx: number) {
    this.y = this.target = MathUtils.clamp(this.dragStart + movementPx * this.pxToMetres, this.min, this.max);
  }

  /** Lets go; `velocityPx` (px/ms, down positive) carries on for a moment, then eases to a stop. */
  release(velocityPx: number, reducedMotion: boolean) {
    this.dragging = false;
    if (!reducedMotion) this.scrollBy(velocityPx * 1000 * this.pxToMetres * FLICK_TIME);
  }

  step(dt: number) {
    if (this.dragging) return;
    this.y += (this.target - this.y) * (1 - Math.exp(-SCROLL_EASE * Math.min(dt, 0.1)));
  }
}

/** Drag (touch or mouse), wheel and keys scroll the wall. */
export function useWallScroll(area: RefObject<HTMLElement | null>) {
  const [scroll] = useState(() => new WallScroll());
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useDrag(
    ({ first, last, tap, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      if (first) scroll.beginDrag();
      // A tap (a click, or a touch that barely moves) isn't a scroll: no movement, and no flick
      // from the jitter of the press, which would otherwise carry the wall on.
      if (!tap) scroll.drag(my);
      if (last) scroll.release(tap ? 0 : vy * dy, reduced());
    },
    { target: area, axis: "y", filterTaps: true },
  );

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Ctrl/Cmd + wheel, and trackpad pinches (sent as Ctrl + wheel), zoom the page: leave those to the browser.
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      // Wheel down goes down the wall.
      scroll.scrollBy(-e.deltaY * WHEEL_SPEED);
    };
    const onKey = (e: KeyboardEvent) => {
      // Keys belong to an open modal or drawer (e.g. the size buttons in the shoe view).
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
