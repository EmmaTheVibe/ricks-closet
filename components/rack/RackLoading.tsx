import { BACKGROUND } from "./constants";

const PLEATS =
  "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05)), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(255,255,255,0.06) 22px, rgba(0,0,0,0.05) 44px)";
const EASE = "ease-[cubic-bezier(0.65,0,0.35,1)]";
const LABEL = "Opening closet…";

function Curtain({ side, open }: { side: -1 | 1; open: boolean }) {
  const left = side < 0;
  return (
    <div
      className={`absolute inset-y-0 w-1/2 transition-[translate,scale,opacity] duration-[900ms] ${EASE} motion-reduce:transition-opacity motion-reduce:duration-500 ${
        left ? "left-0 origin-left" : "right-0 origin-right"
      } ${
        open
          ? `${left ? "-translate-x-full" : "translate-x-full"} scale-x-75 motion-reduce:translate-x-0 motion-reduce:scale-x-100 motion-reduce:opacity-0`
          : "translate-x-0 scale-x-100"
      }`}
      style={{
        backgroundColor: BACKGROUND,
        backgroundImage: PLEATS,
        boxShadow: `inset ${left ? -18 : 18}px 0 24px -16px rgba(0,0,0,0.18)`,
      }}
    />
  );
}

export default function RackLoading({ visible = true }: { visible?: boolean }) {
  return (
    <div aria-hidden={!visible} className="pointer-events-none absolute inset-0 overflow-hidden">
      <Curtain side={-1} open={!visible} />
      <Curtain side={1} open={!visible} />
      <div
        className={`absolute inset-0 grid place-items-center transition-[opacity,translate] duration-500 ${EASE} motion-reduce:transition-opacity ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        <div className="relative flex items-center gap-2.5 overflow-hidden rounded-full bg-stone-900 py-2.5 pr-5 pl-4 text-white shadow-xl ring-1 ring-white/10">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent motion-safe:animate-[pill-sheen_2s_ease-in-out_infinite] motion-reduce:hidden"
          />
          <svg
            viewBox="0 0 24 24"
            className="relative size-5 origin-top motion-safe:animate-[hanger-swing_1.6s_ease-in-out_infinite]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10.4 6.2a1.6 1.6 0 1 1 1.6 1.6v1.4" />
            <path d="M12 9.2 3.5 15.5h17z" />
          </svg>
          <p role="status" className="relative text-sm font-bold tracking-wide">
            <span className="sr-only">Opening closet…</span>
            <span aria-hidden className="flex whitespace-pre">
              {[...LABEL].map((ch, i) => (
                <span
                  key={i}
                  className="inline-block motion-safe:animate-[letter-wave_1.6s_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {ch}
                </span>
              ))}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
