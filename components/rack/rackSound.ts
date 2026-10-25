// The rack's sound, synthesised with Web Audio (no audio files): a steel hook sliding along the
// steel rail, like a curtain ring on a curtain pole. One continuous sound that follows the rack's
// speed, and only plays while the rack slides.
//
// It is made the way the real sound is: a hook doesn't glide silently, it skips along the rail in
// tiny contacts, and each contact makes the steel ring. So a stream of clicks (denser the faster
// the rack moves) strikes one ring's narrow resonances at metal's out-of-tune partials, with only
// a faint, smooth hiss of friction underneath.
import { useEffect, useState } from "react";

const VOLUME = 0.1; // level at full rack speed
const LOUDNESS_CURVE = 2; // <1: slow slides are still audible
// Below this share of full speed it is silent, so only a real slide sounds, not the rack's slow
// final ease into place. Above it the sound fades in from nothing.
const SILENT_BELOW = 0.04;
const CONTACTS_PER_SECOND = 180; // at playback rate 1: one hook, so sparse
const CONTACT_RATE = [0.45, 2]; // playback rate at the slowest .. fastest slide: ~80 .. 360 contacts/s
// The hook's ring: partials (Hz) and their levels. High and thin for a light, small piece of
// steel; out of tune with each other, as struck metal is. High Q = each contact rings clearly
// (about 30 ms at Q 370), which is what makes it sound like metal rather than grit.
// const PARTIALS: [number, number][] = [
//   [3200, 1],
//   [5090, 0.7],
//   [6850, 0.5],
//   [8770, 0.35],
//   [11300, 0.2],
// ];
const PARTIALS: [number, number][] = [
  [6110, 0.7],
  [8220, 0.5],
  [10520, 0.35],
  [13560, 0.2],
];
const RING_Q = 400;
const RING_GAIN = 11; // narrow resonances pass little energy: brings the ring up to a normal level
const HISS_GAIN = 0.012; // friction, kept well under the ring
const RESPONSE = 0.03; // seconds the sound takes to follow a change in speed
const WATCHDOG = 0.15; // seconds without an update (tab hidden, canvas paused) before it fades out
const STORAGE_KEY = "rack-sound-muted";

/**
 * Two seconds of one hook's contacts, looped: evenly spaced skips, all striking the same way with
 * about the same force, so the ring carries on as one object. Random timing, signs and strengths
 * would sound like several rings at once. Two seconds holds a whole number of gaps, so the loop
 * has no seam.
 */
function contactBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const gap = ctx.sampleRate / CONTACTS_PER_SECOND;
  for (let i = 0; i < data.length; i += gap) {
    data[Math.floor(i)] = 0.8 + 0.2 * Math.random();
  }
  return buffer;
}

function noiseBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class RackSound {
  private ctx: AudioContext | null = null;
  private level: GainNode | null = null;
  private contacts: AudioBufferSourceNode | null = null;
  muted: boolean;

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    this.muted = stored === "1";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {}
    if (muted) this.slide(0);
  }

  /** Browsers only allow audio after a user gesture: call from one (tap, click, key). */
  unlock() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.level = ctx.createGain();
      this.level.gain.value = 0;
      this.level.connect(ctx.destination);

      // The ring: each contact strikes every partial.
      this.contacts = Object.assign(ctx.createBufferSource(), {
        buffer: contactBuffer(ctx),
        loop: true,
      });
      const ring = ctx.createGain();
      ring.gain.value = RING_GAIN;
      ring.connect(this.level);
      for (const [freq, partialLevel] of PARTIALS) {
        const resonance = Object.assign(ctx.createBiquadFilter(), {
          type: "bandpass",
        });
        resonance.frequency.value = freq;
        resonance.Q.value = RING_Q;
        const partial = ctx.createGain();
        partial.gain.value = partialLevel;
        this.contacts.connect(resonance).connect(partial).connect(ring);
      }

      // The friction: a smooth, high hiss.
      const noise = Object.assign(ctx.createBufferSource(), {
        buffer: noiseBuffer(ctx),
        loop: true,
      });
      const hissBand = Object.assign(ctx.createBiquadFilter(), {
        type: "bandpass",
      });
      hissBand.frequency.value = 8000;
      hissBand.Q.value = 1;
      const hiss = ctx.createGain();
      hiss.gain.value = HISS_GAIN;
      noise.connect(hissBand).connect(hiss).connect(this.level);

      this.contacts.start();
      noise.start();
      this.ctx = ctx;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /**
   * Sets the slide for the rack's current speed (0 = at rest, 1 = full speed). Call every frame.
   * `loudness` scales the level only (the ring stays the same), e.g. for quieter jumps.
   */
  slide(speed: number, loudness = 1) {
    const { ctx, level, contacts } = this;
    if (!ctx || !level || !contacts) return;
    const s = this.muted
      ? 0
      : Math.min(1, Math.max(0, (speed - SILENT_BELOW) / (1 - SILENT_BELOW)));
    const t = ctx.currentTime;
    level.gain.cancelScheduledValues(t);
    level.gain.setTargetAtTime(VOLUME * loudness * s ** LOUDNESS_CURVE, t, RESPONSE);
    // If updates stop coming, let the sound die away rather than hang at the last level.
    level.gain.setTargetAtTime(0, t + WATCHDOG, RESPONSE);
    contacts.playbackRate.setTargetAtTime(
      CONTACT_RATE[0] + (CONTACT_RATE[1] - CONTACT_RATE[0]) * s,
      t,
      RESPONSE,
    );
  }
}

/** The page's rack sound, unlocked by the visitor's first tap, click or key press. */
export function useRackSound() {
  const [sound] = useState(() => new RackSound());
  useEffect(() => {
    // pointerup, not pointerdown: a touch only counts as a gesture for audio when it ends.
    const unlock = () => sound.unlock();
    const events = ["pointerup", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, [sound]);
  return sound;
}
