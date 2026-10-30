import { useEffect, useState } from "react";

const VOLUME = 0.1;
const LOUDNESS_CURVE = 2;
const SILENT_BELOW = 0.04;
const CONTACTS_PER_SECOND = 180;
const CONTACT_RATE = [0.45, 2];
const PARTIALS: [number, number][] = [
  [6110, 0.7],
  [8220, 0.5],
  [10520, 0.35],
  [13560, 0.2],
];
const RING_Q = 400;
const RING_GAIN = 11;
const HISS_GAIN = 0.012;
const RESPONSE = 0.03;
const WATCHDOG = 0.15;
const STORAGE_KEY = "rack-sound-muted";

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

  unlock() {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.level = ctx.createGain();
      this.level.gain.value = 0;
      this.level.connect(ctx.destination);

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

  slide(speed: number, loudness = 1) {
    const { ctx, level, contacts } = this;
    if (!ctx || !level || !contacts) return;
    const s = this.muted
      ? 0
      : Math.min(1, Math.max(0, (speed - SILENT_BELOW) / (1 - SILENT_BELOW)));
    const t = ctx.currentTime;
    level.gain.cancelScheduledValues(t);
    level.gain.setTargetAtTime(VOLUME * loudness * s ** LOUDNESS_CURVE, t, RESPONSE);
    level.gain.setTargetAtTime(0, t + WATCHDOG, RESPONSE);
    contacts.playbackRate.setTargetAtTime(
      CONTACT_RATE[0] + (CONTACT_RATE[1] - CONTACT_RATE[0]) * s,
      t,
      RESPONSE,
    );
  }
}

export function useRackSound() {
  const [sound] = useState(() => new RackSound());
  useEffect(() => {
    const unlock = () => sound.unlock();
    const events = ["pointerup", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, [sound]);
  return sound;
}
