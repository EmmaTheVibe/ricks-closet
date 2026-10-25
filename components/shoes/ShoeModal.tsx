import { useEffect, useRef, useState, type PointerEvent } from "react";
import BagDrop from "../rack/BagDrop";
import SizeGuide from "../rack/SizeGuide";
import SizePicker from "../rack/SizePicker";
import { SIZES } from "../rack/shirts";
import { WALL_COLOR } from "./constants";
import type { ShoeConfig } from "./shoes";
import type { ShoeView } from "./shoeView";

const FADE_MS = 300; // the dim and panel fading in and out
const ADDED_MS = 1600; // how long the button says "Added to bag"
const THUMB_WIDTH = 240; // the bag's thumbnail of the shoe, px

type ShoeModalProps = {
  shoe: ShoeConfig;
  view: ShoeView;
  onAdd: (size: string, thumbnail?: string) => void;
  onClose: () => void;
};

/** A small copy of the capture for the bag, as a data URL (kept with the bag in the browser). */
function thumbnail(capture: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_WIDTH;
  canvas.height = Math.round((THUMB_WIDTH * capture.height) / capture.width);
  canvas.getContext("2d")?.drawImage(capture, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.85);
}

/**
 * Shoe view: the shoe on a turntable, sizes, price and Add to bag. Like the clothes' modal, it's
 * not a native <dialog> (those always draw above the page): the 3D canvas, stacked above this,
 * draws the shoe itself on the turntable, so it stays live 3D. Drag the turntable to spin it.
 */
export default function ShoeModal({ shoe, view, onAdd, onClose }: ShoeModalProps) {
  const turntable = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  const [capture, setCapture] = useState<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [dropping, setDropping] = useState<{ size: string; source: HTMLCanvasElement } | null>(null);
  const closing = useRef(false);
  const drag = useRef<{ x: number; t: number; speed: number } | null>(null);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    if (turntable.current) view.flyTo(turntable.current.getBoundingClientRect(), setCapture);
    const frame = requestAnimationFrame(() => setShown(true)); // a frame at opacity 0, so it fades in
    return () => cancelAnimationFrame(frame);
  }, [view]);

  // Keep the 3D shoe on the turntable if it moves: the panel scrolls on small screens.
  const follow = () => {
    if (turntable.current && !closing.current) view.follow(turntable.current.getBoundingClientRect());
  };
  useEffect(() => {
    window.addEventListener("resize", follow);
    return () => window.removeEventListener("resize", follow);
  });

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [added]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onClose, reduced ? 0 : FADE_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dropping && !document.querySelector("dialog[open]")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Dragging the turntable spins the shoe (the canvas above it lets pointer events through).
  const spinStart = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, t: e.timeStamp, speed: 0 };
    view.beginSpin();
  };
  const spinMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dt = Math.max(1, e.timeStamp - d.t) / 1000;
    d.speed = dx / dt;
    d.x = e.clientX;
    d.t = e.timeStamp;
    view.spinBy(dx);
  };
  const spinEnd = () => {
    if (!drag.current) return;
    view.endSpin(drag.current.speed);
    drag.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shoe-name"
      onClick={(e) => e.target === e.currentTarget && close()}
      className={`fixed inset-0 grid place-items-center p-4 transition-colors duration-300 motion-reduce:transition-none ${shown ? "bg-stone-900/40" : "bg-transparent"}`}
    >
      {dropping && (
        <BagDrop
          source={dropping.source}
          src=""
          aspect={dropping.source.width / dropping.source.height}
          topShare={0}
          onDone={() => {
            onAdd(dropping.size, thumbnail(dropping.source));
            setDropping(null);
            setAdded(true);
          }}
        />
      )}
      <div
        onScroll={follow}
        className={`relative max-h-[calc(100dvh-2rem)] w-[min(52rem,100%)] overflow-y-auto rounded-3xl bg-white text-stone-900 shadow-2xl transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5" style={{ background: WALL_COLOR }}>
            {/* The turntable: the canvas above draws the shoe here. */}
            <div
              ref={turntable}
              role="img"
              aria-label={`${shoe.name}, drag to turn it`}
              onPointerDown={spinStart}
              onPointerMove={spinMove}
              onPointerUp={spinEnd}
              onPointerCancel={spinEnd}
              className="aspect-[4/3] w-full max-w-[28rem] cursor-grab touch-none active:cursor-grabbing"
            />
            <p className="text-xs font-bold tracking-[0.2em] text-stone-900/60 uppercase">Drag to turn</p>
          </div>

          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="pr-10">
              <h2 id="shoe-name" className="text-2xl font-bold tracking-wide">
                {shoe.name}
              </h2>
              <p className="mt-1 font-mono text-lg font-bold text-stone-600">{shoe.price}</p>
            </div>

            <div className="relative">
              <SizePicker sizes={SIZES.shoes} soldOut={shoe.soldOut} value={size} onChange={setSize} />
              <button
                type="button"
                aria-expanded={guideOpen}
                aria-controls="size-guide"
                onClick={() => setGuideOpen((open) => !open)}
                className="absolute top-0 right-0 text-xs font-bold text-stone-700 underline underline-offset-2 hover:text-stone-900"
              >
                Size guide
              </button>
              {guideOpen && (
                <div className="mt-4">
                  <SizeGuide id="size-guide" kind="shoes" selected={size} />
                </div>
              )}
            </div>

            <div className="mt-auto">
              <button
                type="button"
                disabled={!size || dropping !== null}
                onClick={() => {
                  if (!size) return;
                  if (capture) setDropping({ size, source: capture });
                  else {
                    onAdd(size);
                    setAdded(true);
                  }
                }}
                className="w-full rounded-full bg-stone-900 py-3 text-sm font-bold text-white transition hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25"
              >
                {added ? "Added to bag ✓" : "Add to bag"}
              </button>
              <p className="mt-2 h-4 text-center text-xs text-stone-500" aria-live="polite">
                {!size ? "Choose a size" : added ? `${shoe.name}, size ${size}, added to your bag` : ""}
              </p>
            </div>
          </div>
        </div>

        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-10 place-items-center rounded-full text-xl text-stone-700 transition hover:bg-stone-900/5 focus-visible:outline-2 focus-visible:outline-stone-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
