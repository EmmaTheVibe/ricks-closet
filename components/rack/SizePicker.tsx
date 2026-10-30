type SizePickerProps = {
  sizes: string[];
  soldOut?: string[];
  value: string | null;
  onChange: (size: string) => void;
};

export default function SizePicker({ sizes, soldOut = [], value, onChange }: SizePickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Size</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const out = soldOut.includes(size);
          return (
            <label
              key={size}
              className={`grid h-11 min-w-12 place-items-center rounded-full border px-3 text-sm font-bold transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stone-900 ${
                out
                  ? "cursor-not-allowed border-dashed border-stone-900/15 text-stone-400 line-through"
                  : "cursor-pointer border-stone-900/15 text-stone-800 hover:border-stone-900/50 has-checked:border-stone-900 has-checked:bg-stone-900 has-checked:text-white"
              }`}
            >
              <input
                type="radio"
                name="size"
                value={size}
                checked={value === size}
                disabled={out}
                onChange={() => onChange(size)}
                className="sr-only"
              />
              {size}
              {out && <span className="sr-only">, sold out</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
