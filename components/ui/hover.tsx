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
      <path d="M9.6 5.4a2.4 2.4 0 1 1 2.4 2.4v2.8" />
      <path d="M12 10.6 2.5 18.5h19z" fill="currentColor" fillOpacity={0.16} />
    </svg>
  ),
  shoe: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M2.5 18.5V7H8l2.5 4 4.5 1.6c4 1.3 6.5 2.4 6.5 4.6v1.3z" fill="currentColor" fillOpacity={0.16} />
      <path d="M2.5 15.5h18.3M10.5 11l-1.6 2M13.5 12.2l-1.4 2" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden {...stroke}>
      <path d="M8.5 2.5h7l.7 4.2H7.8zM8.5 21.5h7l.7-4.2H7.8z" />
      <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity={0.16} />
      <path d="M12 8.8V12l2 1.5M18.2 12h1.3" />
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
