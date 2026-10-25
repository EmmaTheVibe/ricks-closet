import { useEffect, useRef, useState } from "react";
import BagDrop from "./BagDrop";
import GarmentViews from "./GarmentViews";
import type { Capture, PullOff } from "./pullOff";
import SizePicker from "./SizePicker";
import { SIZES, type ShirtConfig } from "./shirts";

const FADE_MS = 300; // the dim and panel fading in and out
const ADDED_MS = 1600; // how long the button says "Added to bag"

type GarmentModalProps = { shirt: ShirtConfig; pullOff: PullOff; onAdd: (size: string) => void; onClose: () => void };

/**
 * Product view: still images of each side, sizes, price and Add to bag (the garment drops into a
 * Rick's Closet bag, on a layer of its own: see BagDrop.tsx). Not a native <dialog>: those
 * always draw above the page, and the View trick needs the 3D canvas (with the flying shirt)
 * stacked above this. So Escape and focus are handled here, and the scene makes the rest of the
 * page inert while it's open.
 *
 * The trick (see pullOff.ts): the dim and panel fade in under the flying shirt, which lands on the
 * large image's spot. The image stays hidden until the shirt rests, then takes over from it.
 * Closing runs it backwards: the shirt reappears over the image, then the modal fades out under it.
 */
export default function GarmentModal({ shirt, pullOff, onAdd, onClose }: GarmentModalProps) {
  const mainView = useRef<HTMLDivElement>(null);
  const captures = useRef<Capture[]>([]); // each view's canvas, drawn by the rack
  const [drawn, setDrawn] = useState<boolean[]>([]); // which views show the garment as lit on the rack
  const closeButton = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false); // briefly confirms "Added to bag"
  // The size going into the bag, and the front to drop (as lit on the rack, if it was captured).
  const [dropping, setDropping] = useState<{ size: string; source?: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [added]);
  const [shown, setShown] = useState(false); // the dim and panel
  const [imageShown, setImageShown] = useState(false); // the large image, under the 3D shirt
  const closing = useRef(false);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    if (mainView.current) {
      pullOff.flyTo(mainView.current.getBoundingClientRect(), captures.current, (views) => {
        setDrawn(views);
        setImageShown(true);
      });
    }
    // A frame at opacity 0 first, so the fade-in runs.
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [pullOff]);

  // The image is on screen (this runs after it's painted): the 3D shirt above it can go.
  useEffect(() => {
    if (imageShown) pullOff.hide();
  }, [imageShown, pullOff]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (mainView.current) pullOff.unhide(mainView.current.getBoundingClientRect());
    // Two frames, so the 3D shirt is drawn over the image again before the image goes.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setImageShown(false);
        setShown(false);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(onClose, reduced ? 0 : FADE_MS);
      }),
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape belongs to the bag drawer if it's open over this; and waits for a drop to finish.
      if (e.key === "Escape" && !dropping && !document.querySelector("dialog[open]")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="garment-name"
      // A click on the dim (outside the panel) closes it.
      onClick={(e) => e.target === e.currentTarget && close()}
      className={`fixed inset-0 grid place-items-center p-4 transition-colors duration-300 motion-reduce:transition-none ${shown ? "bg-stone-900/40" : "bg-transparent"}`}
    >
      {dropping && (
        <BagDrop
          source={dropping.source}
          src={shirt.texture}
          onDone={() => {
            onAdd(dropping.size);
            setDropping(null);
            setAdded(true);
          }}
        />
      )}
      <div
        className={`relative max-h-[calc(100dvh-2rem)] w-[min(52rem,100%)] overflow-y-auto rounded-3xl bg-white text-stone-900 shadow-2xl transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      >
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <GarmentViews
            shirt={shirt}
            mainRef={mainView}
            hideMain={!imageShown}
            onCaptureCanvas={(i, kind, canvas) => {
              if (canvas) captures.current[i] = { canvas, kind };
            }}
            drawn={drawn}
          />

          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="pr-10">
              <h2 id="garment-name" className="text-2xl font-bold tracking-wide">
                {shirt.name}
              </h2>
              <p className="mt-1 font-mono text-lg font-bold text-stone-600">{shirt.price}</p>
            </div>

            <SizePicker sizes={SIZES[shirt.kind ?? "shirt"]} soldOut={shirt.soldOut} value={size} onChange={setSize} />

            <div className="mt-auto">
              <button
                type="button"
                disabled={!size || dropping !== null}
                onClick={() => size && setDropping({ size, source: drawn[0] ? captures.current[0]?.canvas : undefined })}
                className="w-full rounded-full bg-stone-900 py-3 text-sm font-bold text-white transition hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25"
              >
                {added ? "Added to bag ✓" : "Add to bag"}
              </button>
              <p className="mt-2 h-4 text-center text-xs text-stone-500" aria-live="polite">
                {!size ? "Choose a size" : added ? `${shirt.name}, size ${size}, added to your bag` : ""}
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
