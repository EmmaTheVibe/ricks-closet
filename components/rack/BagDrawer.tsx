import { useEffect, useRef, useState } from "react";
import { HoverIcon, ICONS, SPRING } from "../ui/hover";
import { formatNaira, type Bag } from "./bag";
import BagItem from "./BagItem";
import { SIGN_INK, SIGN_PAPER } from "./constants";

const CONFIRM_MS = 3000;
const SLIDE_MS = 300;

type BagDrawerProps = { bag: Bag; onClose: () => void };

export default function BagDrawer({ bag, onClose }: BagDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const [shown, setShown] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!el.open) el.showModal();
    el.getBoundingClientRect();
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => dialog.current?.close(), reduced ? 0 : SLIDE_MS);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="bag-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      className={`my-0 mr-0 ml-auto h-dvh max-h-none w-[min(26rem,100%)] max-w-none bg-white p-0 text-stone-900 shadow-2xl transition-[translate] duration-300 backdrop:transition-colors backdrop:duration-300 motion-reduce:transition-none ${shown ? "translate-x-0 ease-out backdrop:bg-stone-900/40" : "translate-x-full ease-in backdrop:bg-transparent"}`}
    >
      <div className="flex h-full flex-col">
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
            onClick={close}
            aria-label="Close bag"
            className="grid size-10 place-items-center rounded-full text-xl transition-[rotate,background-color] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:rotate-90 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-current motion-reduce:hover:rotate-0"
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
                className={`flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${SPRING} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                  confirmClear
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-900/20 text-stone-700 hover:border-stone-900/50"
                }`}
              >
                <HoverIcon>{ICONS.trash}</HoverIcon>
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
            className={`mt-4 flex w-full items-center justify-center rounded-full bg-stone-900 py-3 text-sm font-bold text-white ${SPRING} hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-900/25`}
          >
            <HoverIcon>{ICONS.arrow}</HoverIcon>
            Checkout
          </button>
        </footer>
      </div>
    </dialog>
  );
}
