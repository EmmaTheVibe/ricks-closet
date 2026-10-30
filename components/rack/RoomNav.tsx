import Link from "next/link";
import { ROOMS, type Room } from "../home/constants";
import { ROOM_ICONS, WIGGLE } from "../ui/hover";

const ITEM =
  "group flex h-8 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-900";

export default function RoomNav({ current }: { current: Room }) {
  return (
    <nav
      aria-label="Rooms"
      className="absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] flex items-center gap-1 rounded-full bg-[#f7f4ef]/85 p-1 text-stone-900 shadow-md ring-1 ring-stone-900/10 backdrop-blur-md"
    >
      <Link href="/" aria-label="Rick’s Closet home" className={`${ITEM} w-8 hover:bg-white`}>
        <svg viewBox="0 0 24 24" className={`size-[18px] ${WIGGLE}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v9h12v-9" />
        </svg>
      </Link>
      <span aria-hidden className="h-4 w-px bg-stone-900/15" />
      {(Object.keys(ROOMS) as Room[]).map((room) =>
        room === current ? (
          <Link
            key={room}
            href={ROOMS[room].href}
            aria-current="page"
            className={`${ITEM} gap-1.5 bg-linear-to-b from-[#fbe7ad] to-[#e7bf5f] px-3.5 text-xs font-bold text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_3px_rgba(190,140,40,0.4)]`}
          >
            {ROOM_ICONS[room]}
            <span className="max-[359px]:sr-only">{ROOMS[room].label}</span>
          </Link>
        ) : (
          <Link
            key={room}
            href={ROOMS[room].href}
            aria-label={ROOMS[room].label}
            title={ROOMS[room].label}
            className={`${ITEM} w-8 hover:bg-white`}
          >
            <span className={`grid ${WIGGLE}`}>{ROOM_ICONS[room]}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
