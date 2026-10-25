type SizePickerProps = {
  sizes: string[];
  value: string | null;
  onChange: (size: string) => void;
};

/** Size buttons. Native radios underneath, so arrow keys and screen readers work as a group. */
export default function SizePicker({ sizes, value, onChange }: SizePickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Size</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <label
            key={size}
            className="grid h-11 min-w-12 cursor-pointer place-items-center rounded-full border border-stone-900/15 px-3 text-sm font-bold text-stone-800 transition hover:border-stone-900/50 has-checked:border-stone-900 has-checked:bg-stone-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stone-900"
          >
            <input
              type="radio"
              name="size"
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
              className="sr-only"
            />
            {size}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
