import { SPRING, WIGGLE } from "../ui/hover";
type BagButtonProps = { count: number; onOpen: () => void };

export default function BagButton({ count, onOpen }: BagButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={count ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag, empty"}
      className={`absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] grid size-10 place-items-center rounded-full bg-[#f7f4ef]/85 text-stone-900 shadow-md ring-1 ring-stone-900/10 backdrop-blur-md ${SPRING} hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 ${WIGGLE}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 8h14l-1 12H6z" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </svg>
      {count > 0 && (
        <span
          key={count}
          aria-hidden
          className="absolute -top-1 -right-1 grid h-5 min-w-5 animate-[bag-pop_300ms_ease-out] place-items-center rounded-full bg-stone-900 px-1 font-mono text-[11px] font-bold text-white motion-reduce:animate-none"
        >
          {count}
        </span>
      )}
    </button>
  );
}
