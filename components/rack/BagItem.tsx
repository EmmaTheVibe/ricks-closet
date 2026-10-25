import { formatNaira, garmentOf, MAX_QUANTITY, priceValue, type BagLine } from "./bag";
import { BACKGROUND } from "./constants";

type BagItemProps = { line: BagLine; onQuantity: (quantity: number) => void };

/** One line in the bag: picture, name, size, quantity and line total. */
export default function BagItem({ line, onQuantity }: BagItemProps) {
  const garment = garmentOf(line);
  if (!garment) return null;
  const stepper =
    "grid size-8 place-items-center rounded-full text-stone-700 transition hover:bg-stone-900/5 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-stone-900";

  return (
    <li className="flex gap-4 py-4">
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl p-1" style={{ background: BACKGROUND }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a prepared, already-small WebP */}
        <img src={garment.texture} alt="" className="h-full w-full object-contain" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{garment.name}</p>
            <p className="text-sm text-stone-500">Size {line.size}</p>
          </div>
          <p className="font-mono text-sm font-bold">{formatNaira(priceValue(garment.price) * line.quantity)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-full border border-stone-900/15" role="group" aria-label={`Quantity of ${garment.name}, size ${line.size}`}>
            <button type="button" className={stepper} onClick={() => onQuantity(line.quantity - 1)} aria-label="One fewer">
              −
            </button>
            <span className="w-5 text-center font-mono text-sm font-bold" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              className={stepper}
              onClick={() => onQuantity(line.quantity + 1)}
              disabled={line.quantity >= MAX_QUANTITY}
              aria-label="One more"
            >
              +
            </button>
          </div>
          <button type="button" onClick={() => onQuantity(0)} className="text-xs font-bold text-stone-500 underline-offset-2 hover:underline">
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
