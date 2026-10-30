import { useEffect, type RefObject } from "react";
import { Vector3 } from "three";
import type { ClothPointer } from "./cloth/ClothSim";

export type ShirtHit = { id: number; local: Vector3 };

const LABEL_OFFSET_PX = 14;

export class ShirtInteraction {
  clientX = 0;
  clientY = 0;
  private inside = false;
  private mouse = true;
  private pick: ((clientX: number, clientY: number) => ShirtHit | null) | null = null;
  private hover: ShirtHit | null = null;
  private hoverVelocity = new Vector3();
  private grabbing: { id: number; anchor: Vector3; target: Vector3; seq: number } | null = null;
  private grabSeq = 0;
  private container: HTMLElement | null = null;
  private label: HTMLElement | null = null;
  private cursor = "";

  setPicker(pick: ((clientX: number, clientY: number) => ShirtHit | null) | null) {
    this.pick = pick;
  }

  setLabel(el: HTMLElement | null) {
    this.label = el;
  }

  setContainer(el: HTMLElement | null) {
    this.container = el;
  }

  pointerMoved(e: PointerEvent) {
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.inside = true;
    this.mouse = e.pointerType !== "touch";
  }

  pointerLeft() {
    this.inside = false;
  }

  startGrab(clientX: number, clientY: number) {
    this.clientX = clientX;
    this.clientY = clientY;
    const hit = this.pick?.(clientX, clientY);
    if (!hit) return false;
    this.grabbing = { id: hit.id, anchor: hit.local.clone(), target: hit.local.clone(), seq: ++this.grabSeq };
    return true;
  }

  moveGrab(clientX: number, clientY: number) {
    this.clientX = clientX;
    this.clientY = clientY;
  }

  endGrab() {
    this.grabbing = null;
  }

  get grab() {
    return this.grabbing;
  }

  updateHover(dt: number) {
    const prev = this.hover;
    this.hover = this.inside && this.mouse && !this.grabbing ? (this.pick?.(this.clientX, this.clientY) ?? null) : null;
    if (this.hover && prev && prev.id === this.hover.id && dt > 0) {
      this.hoverVelocity.subVectors(this.hover.local, prev.local).divideScalar(dt);
    } else {
      this.hoverVelocity.set(0, 0, 0);
    }
  }

  clothPointer(): ClothPointer | null {
    if (this.grabbing) {
      const { id, seq, anchor, target } = this.grabbing;
      return { kind: "grab", id, seq, anchor: anchor.toArray(), target: target.toArray() };
    }
    if (this.hover) {
      return { kind: "hover", id: this.hover.id, point: this.hover.local.toArray(), velocity: this.hoverVelocity.toArray() };
    }
    return null;
  }

  updateCursor() {
    const cursor = this.grabbing ? "grabbing" : this.hover ? "grab" : "";
    if (this.container && cursor !== this.cursor) {
      this.container.style.cursor = cursor;
      this.cursor = cursor;
    }
    if (!this.label || !this.container) return;
    const show = Boolean(this.hover) && !this.grabbing;
    this.label.style.opacity = show ? "1" : "0";
    if (show) {
      const rect = this.container.getBoundingClientRect();
      const x = this.clientX - rect.left + LABEL_OFFSET_PX;
      const y = this.clientY - rect.top + LABEL_OFFSET_PX;
      this.label.style.transform = `translate(${x}px, ${y}px)`;
    }
  }
}

export function usePointerTracking(interaction: ShirtInteraction, target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    interaction.setContainer(el);
    const move = (e: PointerEvent) => interaction.pointerMoved(e);
    const leave = () => interaction.pointerLeft();
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      interaction.setContainer(null);
    };
  }, [interaction, target]);
}
