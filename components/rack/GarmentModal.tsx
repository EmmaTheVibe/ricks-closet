import { useEffect, useRef, useState } from "react";
import GarmentViews from "./GarmentViews";
import SizePicker from "./SizePicker";
import { SIZES, type ShirtConfig } from "./shirts";

type GarmentModalProps = { shirt: ShirtConfig; onClose: () => void };

/**
 * Product view: still images of each side, sizes, price and Buy. A native modal dialog, so focus
 * stays inside, Escape closes it and the rack behind can't be dragged. Mounted only while open.
 */
export default function GarmentModal({ shirt, onClose }: GarmentModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [size, setSize] = useState<string | null>(null);

  // No close() on cleanup: its async close event would close the remount in Strict Mode, and an
  // unmounted dialog leaves the top layer anyway.
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="garment-name"
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself; clicks inside land on its content.
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="pointer-events-auto m-auto max-h-[calc(100dvh-2rem)] w-[min(52rem,calc(100%-2rem))] overflow-y-auto rounded-3xl bg-white p-0 text-stone-900 shadow-2xl transition-[opacity,translate] duration-200 backdrop:bg-stone-900/40 starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none"
    >
      <div className="grid md:grid-cols-[1.15fr_1fr]">
        <GarmentViews shirt={shirt} />

        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="pr-10">
            <h2 id="garment-name" className="text-2xl font-bold tracking-wide">
              {shirt.name}
            </h2>
            <p className="mt-1 font-mono text-lg font-bold text-stone-600">{shirt.price}</p>
          </div>

          <SizePicker sizes={SIZES[shirt.kind ?? "shirt"]} value={size} onChange={setSize} />

          <div className="mt-auto">
            <button
              type="button"
              disabled={!size}
              className="w-full rounded-full bg-stone-900 py-3 text-sm font-bold text-white transition hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25"
            >
              Buy
            </button>
            <p className="mt-2 h-4 text-center text-xs text-stone-500" aria-live="polite">
              {size ? "" : "Choose a size"}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => dialog.current?.close()}
        aria-label="Close"
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full text-xl text-stone-700 transition hover:bg-stone-900/5 focus-visible:outline-2 focus-visible:outline-stone-900"
      >
        ×
      </button>
    </dialog>
  );
}
