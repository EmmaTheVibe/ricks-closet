import { useState } from "react";
import { SPRING, WIGGLE } from "../ui/hover";
import type { RackSound } from "./rackSound";

export default function SoundToggle({ sound }: { sound: RackSound }) {
  const [muted, setMuted] = useState(sound.muted);

  const toggle = () => {
    sound.setMuted(!muted);
    sound.unlock();
    setMuted(!muted);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label="Sound"
      className={`absolute top-[max(1rem,env(safe-area-inset-top))] right-[calc(max(1rem,env(safe-area-inset-right))+3rem)] grid size-10 place-items-center rounded-full bg-[#f7f4ef]/85 text-stone-900 shadow-md ring-1 ring-stone-900/10 backdrop-blur-md ${SPRING} hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 ${WIGGLE}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
        {muted ? (
          <path d="M16 9.5l5 5m0-5l-5 5" />
        ) : (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        )}
      </svg>
    </button>
  );
}
