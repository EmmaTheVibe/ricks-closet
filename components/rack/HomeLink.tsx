import Link from "next/link";
import { SPRING, WIGGLE } from "../ui/hover";

export default function HomeLink() {
  return (
    <Link
      href="/"
      aria-label="Rick’s Closet home"
      className={`absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] grid size-10 place-items-center rounded-full bg-[#f7f4ef]/85 text-stone-900 shadow-md ring-1 ring-stone-900/10 backdrop-blur-md ${SPRING} hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 ${WIGGLE}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v9h12v-9" />
      </svg>
    </Link>
  );
}
