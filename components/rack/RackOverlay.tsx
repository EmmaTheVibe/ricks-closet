import { useEffect, useRef } from "react";
import { HoverIcon, ICONS, SPRING } from "../ui/hover";
import type { ShirtConfig } from "./shirts";

type RackOverlayProps = {
  shirt: ShirtConfig;
  onPrev: () => void;
  onNext: () => void;
  onView: () => void;
};

const DETAILS_IN: Keyframe[] = [
  { opacity: 0, transform: "translateY(4px)" },
  { opacity: 1, transform: "none" },
];

export default function RackOverlay({ shirt, onPrev, onNext, onView }: RackOverlayProps) {
  const button =
    "group grid size-11 shrink-0 place-items-center rounded-full bg-stone-900/5 text-stone-800 transition hover:bg-stone-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900";
  const nudge = (dir: -1 | 1) =>
    `inline-block transition-transform duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] motion-reduce:transition-none ${dir < 0 ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`;

  const details = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    details.current?.animate(DETAILS_IN, { duration: 320, easing: "ease-out" });
  }, [shirt.id]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(2rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="pointer-events-auto flex items-center gap-3 rounded-3xl bg-[#f7f4ef]/85 p-3 shadow-lg ring-1 ring-stone-900/5 backdrop-blur-md sm:gap-5 sm:px-4">
        <button type="button" className={button} onClick={onPrev} aria-label="Previous shirt">
          <span className={nudge(-1)}>←</span>
        </button>
        <div className="min-w-44 py-1 text-center sm:min-w-52" aria-live="polite">
          <div ref={details}>
            <p className="text-lg font-bold tracking-wide text-stone-900">{shirt.name}</p>
            <p className="font-mono text-base font-bold text-stone-600">{shirt.price}</p>
          </div>
          <button
            type="button"
            onClick={onView}
            aria-haspopup="dialog"
            className={`mx-auto mt-3 flex items-center rounded-full bg-stone-900 px-8 py-2.5 text-sm font-bold text-white ${SPRING} hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900`}
          >
            <HoverIcon>{ICONS.eye}</HoverIcon>
            View
          </button>
        </div>
        <button type="button" className={button} onClick={onNext} aria-label="Next shirt">
          <span className={nudge(1)}>→</span>
        </button>
      </div>
    </div>
  );
}
