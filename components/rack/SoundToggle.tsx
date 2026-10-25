import { useState } from "react";
import type { RackSound } from "./rackSound";

/** Mutes or unmutes the rack's sounds; the choice is remembered on this device. */
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
      className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] grid size-10 place-items-center rounded-full border border-stone-900/15 text-stone-800 transition hover:bg-stone-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
