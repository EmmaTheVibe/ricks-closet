import type { ReactNode } from "react";
import type { Room } from "../home/constants";

const EASE = "ease-[cubic-bezier(0.34,1.2,0.64,1)]";

export const SPRING = `group transition-[translate,scale,rotate,background-color,color,box-shadow,border-color] duration-300 ${EASE} not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-lg not-disabled:active:scale-95 motion-reduce:transition-colors motion-reduce:hover:translate-y-0`;

export const WIGGLE = "group-hover:animate-[icon-wiggle_0.5s_ease-out] motion-reduce:group-hover:animate-none";

export function HoverIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className={`grid w-0 place-items-center overflow-hidden opacity-0 transition-[width,margin,opacity] duration-300 ${EASE} group-hover:mr-1.5 group-hover:w-4 group-hover:opacity-100 group-focus-visible:mr-1.5 group-focus-visible:w-4 group-focus-visible:opacity-100 group-disabled:hidden motion-reduce:transition-none`}
    >
      <span className="grid group-hover:animate-[pill-wiggle_0.5s_ease-out] motion-reduce:group-hover:animate-none">{children}</span>
    </span>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ICONS = {
  hanger: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <g transform="translate(0 2)">
        <path d="M10.4 6.2a1.6 1.6 0 1 1 1.6 1.6v1.4" />
        <path d="M12 9.2 3.5 15.5h17z" />
      </g>
    </svg>
  ),
  shoe: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <g transform="translate(0 -1.5)">
        <path d="M3 15.5V9.5h4.5l2.5 3 4 1.2c3.5.9 7 1.6 7 3.3v.5H3z" />
        <path d="M9.5 12.5 8 14M12 13.2l-1 1.4" />
      </g>
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M9 3.5h6l.5 3.5h-7zM9 20.5h6l.5-3.5h-7z" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 9.5V12l1.6 1.2" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  ),
  bagPlus: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      <path d="M12 12.5v5M9.5 15h5" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  ),
};

export const ROOM_ICONS: Record<Room, ReactNode> = { clothes: ICONS.hanger, shoes: ICONS.shoe, watches: ICONS.watch };
