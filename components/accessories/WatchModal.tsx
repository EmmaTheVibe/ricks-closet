import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HoverIcon, ICONS, SPRING } from "../ui/hover";
import BagDrop from "../rack/BagDrop";
import { BACKGROUND } from "../rack/constants";
import { ARM, type WatchConfig } from "./watches";
import type { WatchView } from "./watchView";

const FADE_MS = 300;
const ADDED_MS = 1600;
const WATCH_DROP_W = 80;
const ARM_DELAY_MS = 0;
const ARM_FADE_MS = 200;
const MOBILE_LIFT = 5;

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

type WatchModalProps = {
  watch: WatchConfig;
  view: WatchView;
  onAdd: () => void;
  onClose: () => void;
};

export default function WatchModal({
  watch,
  view,
  onAdd,
  onClose,
}: WatchModalProps) {
  const picture = useRef<HTMLImageElement>(null);
  const armPicture = useRef<HTMLImageElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  const [onWrist, setOnWrist] = useState(false);
  const [armShown, setArmShown] = useState(false);
  const [capture, setCapture] = useState<HTMLCanvasElement | null>(null);
  const captureCanvas = useRef<HTMLCanvasElement>(null);
  const [added, setAdded] = useState(false);
  const [dropping, setDropping] = useState<{ aspect: number } | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    let cancelled = false;
    const img = picture.current;
    Promise.all(
      [img, armPicture.current].map((el) => el?.decode().catch(() => {})),
    ).then(() => {
      if (cancelled || !img) return;
      view.flyTo(() => img.getBoundingClientRect(), (settled) => {
        setCapture(settled);
        setOnWrist(true);
        setArmShown(true);
      });
    });
    closeButton.current?.getBoundingClientRect();
    const frame = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [view]);

  useEffect(() => {
    const target = captureCanvas.current;
    if (capture && target && capture.width > 0 && capture.height > 0) {
      target.width = capture.width;
      target.height = capture.height;
      target.getContext("2d")?.drawImage(capture, 0, 0);
    }
    if (onWrist) view.handOver();
  }, [onWrist, capture, view]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [added]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setArmShown(false);
    view.putBack(picture.current?.getBoundingClientRect() ?? null, () => {
      setOnWrist(false);
      setShown(false);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.setTimeout(onClose, reduced ? 0 : FADE_MS);
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !dropping &&
        !document.querySelector("dialog[open]")
      )
        close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const watchPx = (watch.width / ARM.wristMetres) * ARM.wristWidth;
  const { crop } = ARM;
  const watchBox = {
    left: pct(ARM.wrist.x, ARM.width),
    "--wrist-top": pct(ARM.wrist.y, ARM.height),
    "--wrist-top-sm": pct(ARM.wrist.y - MOBILE_LIFT, ARM.height),
    width: pct(watchPx, ARM.width),
    transform: "translate(-50%, -50%)",
  } as CSSProperties;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-name"
      onClick={(e) => e.target === e.currentTarget && close()}
      className={`fixed inset-0 grid place-items-center p-4 transition-colors duration-300 motion-reduce:transition-none ${shown ? "bg-stone-900/40" : "bg-transparent"}`}
    >
      {dropping && (
        <BagDrop
          src={watch.image}
          aspect={dropping.aspect}
          topShare={0}
          width={WATCH_DROP_W}
          onDone={() => {
            onAdd();
            setDropping(null);
            setAdded(true);
          }}
        />
      )}
      <div
        className={`relative max-h-[calc(100dvh-2rem)] w-[min(52rem,100%)] overflow-y-auto rounded-3xl bg-white text-stone-900 shadow-2xl transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: `${crop.width} / ${crop.height}`,
              background: BACKGROUND,
            }}
          >
            <div
              className="absolute"
              style={{
                width: pct(ARM.width, crop.width),
                height: pct(ARM.height, crop.height),
                left: `-${pct(crop.x, crop.width)}`,
                top: `-${pct(crop.y, crop.height)}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- positioned by percentages, and masked by itself */}
              <img
                ref={armPicture}
                src={ARM.image}
                alt=""
                className={`absolute inset-0 h-full w-full transition-opacity motion-reduce:transition-none ${armShown ? "opacity-100" : "opacity-0"}`}
                style={{
                  transitionDuration: `${ARM_FADE_MS}ms`,
                  transitionDelay: `${armShown ? ARM_DELAY_MS : 0}ms`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{ visibility: onWrist ? "visible" : "hidden" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- the same photo the 3D watch uses, so the hand-over matches */}
                <img
                  ref={picture}
                  src={watch.image}
                  crossOrigin="anonymous"
                  alt={`${watch.name}, on the wrist`}
                  className="absolute top-(--wrist-top-sm) max-w-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)] md:top-(--wrist-top)"
                  style={{
                    ...watchBox,
                    visibility: capture ? "hidden" : "inherit",
                  }}
                />
                <canvas
                  ref={captureCanvas}
                  aria-hidden
                  className="absolute top-(--wrist-top-sm) h-auto max-w-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)] md:top-(--wrist-top)"
                  style={{
                    ...watchBox,
                    visibility: capture ? "inherit" : "hidden",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="pr-10">
              <h2 id="watch-name" className="text-2xl font-bold tracking-wide">
                {watch.name}
              </h2>
              <p className="mt-1 font-mono text-lg font-bold text-stone-600">
                {watch.price}
              </p>
            </div>

            <div className="mt-auto">
              <button
                type="button"
                disabled={dropping !== null}
                onClick={() => {
                  const img = picture.current;
                  setDropping({
                    aspect:
                      img && img.naturalHeight
                        ? img.naturalWidth / img.naturalHeight
                        : 0.62,
                  });
                }}
                className={`flex w-full items-center justify-center rounded-full bg-stone-900 py-3 text-sm font-bold text-white ${SPRING} hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25`}
              >
                <HoverIcon>{ICONS.bagPlus}</HoverIcon>
                {added ? "Added to bag ✓" : "Add to bag"}
              </button>
              <p
                className="mt-2 h-4 text-center text-xs text-stone-500"
                aria-live="polite"
              >
                {added ? `${watch.name} added to your bag` : "One size"}
              </p>
            </div>
          </div>
        </div>

        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-10 place-items-center rounded-full text-xl text-stone-700 transition-[rotate,background-color] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:rotate-90 hover:bg-stone-900/5 motion-reduce:hover:rotate-0 focus-visible:outline-2 focus-visible:outline-stone-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
