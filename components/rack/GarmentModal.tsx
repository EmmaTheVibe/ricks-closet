import { useEffect, useRef, useState } from "react";
import { HoverIcon, ICONS, SPRING } from "../ui/hover";
import BagDrop from "./BagDrop";
import GarmentViews from "./GarmentViews";
import type { Capture, PullOff } from "./pullOff";
import SizeGuide from "./SizeGuide";
import SizePicker from "./SizePicker";
import { SIZES, type ShirtConfig } from "./shirts";

const FADE_MS = 300;
const ADDED_MS = 1600;

type GarmentModalProps = { shirt: ShirtConfig; pullOff: PullOff; onAdd: (size: string) => void; onClose: () => void };

export default function GarmentModal({ shirt, pullOff, onAdd, onClose }: GarmentModalProps) {
  const mainView = useRef<HTMLDivElement>(null);
  const captures = useRef<Capture[]>([]);
  const [drawn, setDrawn] = useState<boolean[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [dropping, setDropping] = useState<{ size: string; source?: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [added]);
  const [shown, setShown] = useState(false);
  const [imageShown, setImageShown] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    if (mainView.current) {
      pullOff.flyTo(mainView.current.getBoundingClientRect(), captures.current, (views) => {
        setDrawn(views);
        setImageShown(true);
      });
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [pullOff]);

  useEffect(() => {
    if (imageShown) pullOff.hide();
  }, [imageShown, pullOff]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (mainView.current) pullOff.unhide(mainView.current.getBoundingClientRect());
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
        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
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

            <div className="relative">
              <SizePicker sizes={SIZES[shirt.kind ?? "shirt"]} soldOut={shirt.soldOut} value={size} onChange={setSize} />
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
                  <SizeGuide id="size-guide" kind={shirt.kind ?? "shirt"} selected={size} />
                </div>
              )}
            </div>

            <div className="mt-auto">
              <button
                type="button"
                disabled={!size || dropping !== null}
                onClick={() => size && setDropping({ size, source: drawn[0] ? captures.current[0]?.canvas : undefined })}
                className={`flex w-full items-center justify-center rounded-full bg-stone-900 py-3 text-sm font-bold text-white ${SPRING} hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25`}
              >
                <HoverIcon>{ICONS.bagPlus}</HoverIcon>
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
          className="absolute top-4 right-4 grid size-10 place-items-center rounded-full text-xl text-stone-700 transition-[rotate,background-color] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:rotate-90 hover:bg-stone-900/5 motion-reduce:hover:rotate-0 focus-visible:outline-2 focus-visible:outline-stone-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
