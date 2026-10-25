import { useEffect, useRef, useState } from "react";
import GarmentModal from "./GarmentModal";
import type { ShirtConfig } from "./shirts";

type RackOverlayProps = {
  shirt: ShirtConfig;
  onPrev: () => void;
  onNext: () => void;
};

const DETAILS_IN: Keyframe[] = [
  { opacity: 0, transform: "translateY(4px)" },
  { opacity: 1, transform: "none" },
];

export default function RackOverlay({ shirt, onPrev, onNext }: RackOverlayProps) {
  const button =
    "grid size-11 place-items-center rounded-full border border-stone-900/15 text-stone-800 transition hover:bg-stone-900/5";

  // Name and price settle in each time a new shirt reaches the centre.
  const details = useRef<HTMLDivElement>(null);
  const [viewing, setViewing] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    details.current?.animate(DETAILS_IN, { duration: 320, easing: "ease-out" });
  }, [shirt.id]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(2rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="pointer-events-auto flex items-center gap-6">
        <button type="button" className={button} onClick={onPrev} aria-label="Previous shirt">
          ←
        </button>
        <div className="min-w-52 text-center" aria-live="polite">
          <div ref={details}>
            <p className="text-lg font-bold tracking-wide text-stone-900">{shirt.name}</p>
            <p className="font-mono text-base font-bold text-stone-600">{shirt.price}</p>
          </div>
          <button
            type="button"
            onClick={() => setViewing(true)}
            aria-haspopup="dialog"
            className="mt-3 rounded-full bg-stone-900 px-8 py-2.5 text-sm font-bold text-white transition hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            View
          </button>
        </div>
        <button type="button" className={button} onClick={onNext} aria-label="Next shirt">
          →
        </button>
      </div>
      {viewing && <GarmentModal shirt={shirt} onClose={() => setViewing(false)} />}
    </div>
  );
}
