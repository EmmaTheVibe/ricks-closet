import { useEffect, useRef, useState } from "react";
import { formatNaira, type Bag } from "./bag";
import BagItem from "./BagItem";
import { SIGN_INK, SIGN_PAPER } from "./constants";

const CONFIRM_MS = 3000; // how long "Tap again to clear" waits for the second tap

type BagDrawerProps = { bag: Bag; onClose: () => void };

/**
 * The bag, sliding in from the right: a kraft header in the sign's lettering, the items, the
 * subtotal and Checkout (not wired to anything yet). A native modal dialog: focus stays inside,
 * Escape closes it, and the rack behind can't be dragged. Mounted only while open.
 */
export default function BagDrawer({ bag, onClose }: BagDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Clearing takes a second tap, so one slip doesn't empty the bag.
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  // No close() on cleanup: its async close event would close the remount in Strict Mode, and an
  // unmounted dialog leaves the top layer anyway.
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="bag-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      // A modal dialog is centred by default: pin it to the right edge, full height.
      className="my-0 mr-0 ml-auto h-dvh max-h-none w-[min(26rem,100%)] max-w-none bg-white p-0 text-stone-900 shadow-2xl transition-[translate] duration-300 ease-out backdrop:bg-stone-900/40 backdrop:transition-colors backdrop:duration-300 starting:translate-x-full starting:backdrop:bg-transparent motion-reduce:transition-none"
    >
      <div className="flex h-full flex-col">
        {/* The sign, as a header: "RICK'S" tracked out, "Closet" in italic serif, on kraft. */}
        <header
          className="flex items-center gap-3 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5"
          style={{ background: SIGN_PAPER, color: SIGN_INK }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small logo */}
          <img src="/logo/hanger.png" alt="" className="size-9" />
          <div id="bag-title" className="leading-none">
            <span className="block text-[11px] font-extrabold tracking-[0.32em]">RICK’S</span>
            <span className="font-serif text-2xl font-bold italic">Closet</span>
            <span className="sr-only">, your bag</span>
          </div>
          <span className="ml-auto text-xs font-bold tracking-[0.2em] uppercase opacity-70">Bag</span>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close bag"
            className="grid size-10 place-items-center rounded-full text-xl transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-current"
          >
            ×
          </button>
        </header>

        {bag.lines.length === 0 ? (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <p className="font-bold">Your bag is empty.</p>
              <p className="mt-1 text-sm text-stone-500">Pick something off the rack.</p>
            </div>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-stone-900/10 overflow-y-auto px-6">
            {bag.lines.map((line) => (
              <BagItem key={`${line.id}-${line.size}`} line={line} onQuantity={(q) => bag.setQuantity(line, q)} />
            ))}
          </ul>
        )}

        <footer className="border-t border-stone-900/10 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {bag.lines.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!confirmClear) return setConfirmClear(true);
                  bag.clear();
                  setConfirmClear(false);
                }}
                // A pill like the bag's other controls; armed, it fills in like a picked size.
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                  confirmClear
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-900/20 text-stone-700 hover:border-stone-900/50"
                }`}
              >
                {confirmClear ? "Tap again to clear" : "Clear bag"}
              </button>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-stone-500">Subtotal</span>
            <span className="font-mono text-lg font-bold">{formatNaira(bag.subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={bag.lines.length === 0}
            className="mt-4 w-full rounded-full bg-stone-900 py-3 text-sm font-bold text-white transition hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25"
          >
            Checkout
          </button>
        </footer>
      </div>
    </dialog>
  );
}
