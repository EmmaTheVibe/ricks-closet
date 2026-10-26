import Link from "next/link";

/** Back to the welcome page, top left of a room. */
export default function HomeLink() {
  return (
    <Link
      href="/"
      aria-label="Rick’s Closet home"
      className="absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] grid size-10 place-items-center rounded-full border border-stone-900/15 text-stone-800 transition hover:bg-stone-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v9h12v-9" />
      </svg>
    </Link>
  );
}
