import { useLayoutEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROOMS, type Room } from "../home/constants";
import { ROOM_ICONS, WIGGLE } from "../ui/hover";
import { BACKGROUND } from "./constants";
import { enterRoom, LEAVE_MS, leaveRoom, prefersReducedMotion, type Place } from "./roomPan";

const ITEM =
  "group flex h-9 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-900";

export default function RoomNav({ current }: { current: Room }) {
  const router = useRouter();
  const veil = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  useLayoutEffect(() => {
    const el = veil.current;
    if (enterRoom(current)) el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-out" });
    return () => {
      clearTimeout(timer.current);
      timer.current = 0;
      el?.getAnimations().forEach((animation) => animation.cancel());
      if (el) el.style.pointerEvents = "none";
    };
  }, [current]);

  const leave = (e: MouseEvent<HTMLAnchorElement>, to: Place, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || prefersReducedMotion()) return;
    e.preventDefault();
    if (timer.current) return;
    leaveRoom(current, to);
    const el = veil.current;
    if (el) {
      el.style.pointerEvents = "auto";
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LEAVE_MS, easing: "ease-in", fill: "forwards" });
    }
    timer.current = window.setTimeout(() => router.push(href), LEAVE_MS);
  };

  return (
    <>
      <nav
        aria-label="Rooms"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] flex items-center gap-1 rounded-full bg-[#f7f4ef]/85 p-0.5 text-stone-900 shadow-md ring-1 ring-stone-900/10 backdrop-blur-md [&_svg]:size-[22px]"
      >
        <Link
          href="/"
          aria-label="Rick’s Closet home"
          onClick={(e) => leave(e, "home", "/")}
          className={`${ITEM} w-9 hover:bg-white`}
        >
          <svg viewBox="0 0 24 24" className={WIGGLE} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9.3 12 4l6 5.3V19H6z" fill="currentColor" fillOpacity={0.16} stroke="none" />
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9h12v-9" />
          </svg>
        </Link>
        <span aria-hidden className="h-5 w-px bg-stone-900/15" />
        {(Object.keys(ROOMS) as Room[]).map((room) =>
          room === current ? (
            <Link
              key={room}
              href={ROOMS[room].href}
              aria-current="page"
              className={`${ITEM} gap-1.5 bg-linear-to-b from-[#fbe7ad] to-[#e7bf5f] pr-3.5 pl-2.5 text-xs font-bold text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_3px_rgba(190,140,40,0.4)]`}
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
              onClick={(e) => leave(e, room, ROOMS[room].href)}
              className={`${ITEM} w-9 hover:bg-white`}
            >
              <span className={`grid ${WIGGLE}`}>{ROOM_ICONS[room]}</span>
            </Link>
          ),
        )}
      </nav>
      <div
        ref={veil}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 opacity-0"
        style={{ background: BACKGROUND }}
      />
    </>
  );
}
