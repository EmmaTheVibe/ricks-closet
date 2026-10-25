import { useEffect, useRef } from "react";
import { SIGN_INK, SIGN_PAPER } from "./constants";
import { IMAGE_TOP_SHARE } from "./GarmentImage";

// The bag's back panel and the rope handle: a shade darker than the kraft front.
const BAG_BACK = "#a8875d";
const ROPE = "#7a5c3c";

const BAG_W = 220;
const BAG_H = 240;
// Fits inside the bag below the front's rim (only the hook peeks over), so it disappears into it.
const GARMENT_W = 150;
const GARMENT_H = Math.round(GARMENT_W * (1415 / 1024)); // the modal image's box: garment plus hook headroom

type BagDropProps = {
  /** The front, as lit on the rack (the View capture), if there is one... */
  source?: HTMLCanvasElement;
  /** ...else the flat front photo. */
  src: string;
  /** Called when the garment is in the bag and the layer has gone. */
  onDone: () => void;
};

/**
 * Add to bag: a layer of its own over the product modal. A Rick's Closet shopping bag appears,
 * the garment's front drops into it, the bag takes the weight, and the layer fades away. Always
 * the front, whatever view the modal shows, so it reads the same for shirts and trousers.
 */
export default function BagDrop({ source, src, onDone }: BagDropProps) {
  const layer = useRef<HTMLDivElement>(null);
  const bag = useRef<HTMLDivElement>(null);
  const garment = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (source && copy.current) {
      copy.current.width = source.width;
      copy.current.height = source.height;
      copy.current.getContext("2d")?.drawImage(source, 0, 0);
    }
    // Only a run that wasn't cleaned up may finish: React runs effects twice in development, and
    // finishing twice would add the garment to the bag twice.
    let cancelled = false;
    const running: Animation[] = [];
    const finish = () => {
      if (!cancelled) done.current();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(finish, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    const els = { layer: layer.current, bag: bag.current, garment: garment.current };
    if (!els.layer || !els.bag || !els.garment) return;
    const play = (el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = el.animate(keyframes, options);
      running.push(animation);
      return animation.finished;
    };

    const run = async () => {
      const ease = "cubic-bezier(0.2, 0.8, 0.2, 1)";
      play(els.layer!, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "forwards" });
      // The bag rises into place...
      await play(
        els.bag!,
        [
          { transform: "translateY(40px) scale(0.92)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 280, easing: ease, fill: "forwards" },
      );
      // ...the garment drops in from above, gathering speed like it's falling...
      await play(
        els.garment!,
        [
          { transform: `translateY(${-BAG_H - GARMENT_H}px)`, opacity: 1 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 420, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" },
      );
      // ...and the bag takes its weight, then settles.
      await play(
        els.bag!,
        [
          { transform: "none" },
          { transform: "translateY(6px) scale(1.04, 0.95)", offset: 0.35 },
          { transform: "translateY(-2px) scale(0.99, 1.01)", offset: 0.7 },
          { transform: "none" },
        ],
        { duration: 300, easing: "ease-out" },
      );
      await play(els.layer!, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 260, fill: "forwards" });
    };
    // A cancelled animation rejects; that's cleanup, not a failure to report as done.
    run().then(finish, finish);
    return () => {
      cancelled = true;
      running.forEach((a) => a.cancel());
    };
  }, [source]);

  return (
    <div
      ref={layer}
      aria-hidden
      className="fixed inset-0 z-60 grid place-items-center bg-stone-900/15 opacity-0 motion-reduce:hidden"
    >
      <div ref={bag} className="relative opacity-0" style={{ width: BAG_W, height: BAG_H, transformOrigin: "50% 100%" }}>
        {/* Back: the rope handle and the inside of the bag, behind the garment. */}
        <svg className="absolute -top-16 left-1/2 -translate-x-1/2" width={120} height={80} viewBox="0 0 120 80" fill="none">
          <path d="M20 78 C20 10, 100 10, 100 78" stroke={ROPE} strokeWidth={6} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 rounded-b-md" style={{ background: BAG_BACK }} />

        {/* The garment, dropping into the gap between back and front. Its resting place keeps
            the garment (below its hook's headroom) inside the bag, behind the front panel. */}
        <div
          ref={garment}
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: GARMENT_W,
            height: GARMENT_H,
            top: BAG_H * 0.18 - GARMENT_H * IMAGE_TOP_SHARE,
            transform: `translateY(${-BAG_H - GARMENT_H}px)`,
          }}
        >
          {source ? (
            <canvas ref={copy} className="h-full w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a prepared, already-small WebP
            <img src={src} alt="" className="h-full w-full object-contain object-bottom" style={{ paddingTop: `${IMAGE_TOP_SHARE * 100}%` }} />
          )}
        </div>

        {/* Front: kraft, lettered like the sign, with a folded rim at the top. */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center rounded-b-md shadow-lg"
          style={{
            top: BAG_H * 0.18,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0) 10%), ${SIGN_PAPER}`,
            color: SIGN_INK,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small logo */}
          <img src="/logo/hanger.png" alt="" className="mb-2 size-12" />
          <span className="text-[11px] font-extrabold tracking-[0.32em]">RICK’S</span>
          <span className="font-serif text-3xl leading-tight font-bold italic">Closet</span>
        </div>
      </div>
    </div>
  );
}
