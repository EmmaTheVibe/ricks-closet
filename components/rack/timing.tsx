import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";

const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
export const TIMING = params?.has("timing") ?? false;
export const NO_SHADOWS = params?.has("noshadows") ?? false;
export const SHADOWS = NO_SHADOWS ? false : "percentage";

type Mark = { label: string; at: number; note: string };
type State = { origin: number; marks: Mark[] };

let state: State = { origin: 0, marks: [] };
let started = false;
const listeners = new Set<() => void>();

function push(label: string, at: number, note = "") {
  state = { ...state, marks: [...state.marks, { label, at, note }] };
  listeners.forEach((listener) => listener());
}

export function mark(label: string, note?: string) {
  if (TIMING) push(label, performance.now(), note);
}

function startScene() {
  state = { origin: started ? performance.now() : 0, marks: [] };
  if (!started) {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      push("html received", nav.responseEnd);
      if (nav.domContentLoadedEventEnd) push("page parsed", nav.domContentLoadedEventEnd);
    }
  }
  started = true;
  mark("scene code running");
}

const mb = (bytes: number) => (bytes / 1e6).toFixed(2);

function downloads() {
  const files = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter(
    (file) => file.startTime >= state.origin,
  );
  const size = files.reduce((sum, file) => sum + file.decodedBodySize, 0);
  const sent = files.reduce((sum, file) => sum + file.transferSize, 0);
  const last = Math.max(state.origin, ...files.map((file) => file.responseEnd));
  return { last, note: `${files.length} files, ${mb(size)} MB, ${mb(sent)} MB over network` };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;

export function TimingProbe() {
  const frames = useRef({ count: 0, first: 0, last: 0, worst: 0, reported: false });

  useEffect(() => {
    if (!TIMING) return;
    const { last, note } = downloads();
    push("downloads done", last, note);
    mark("assets ready");
  }, []);

  useFrame(({ gl }) => {
    if (!TIMING) return;
    const f = frames.current;
    const now = performance.now();
    f.count++;
    if (f.count === 2) {
      f.first = now;
      mark(
        "first frame drawn",
        `took ${Math.round(now - f.last)} ms, ${gl.info.programs?.length ?? 0} shaders, ${gl.info.memory.textures} textures, ${gl.domElement.width}×${gl.domElement.height} px`,
      );
    } else if (f.count > 2 && !f.reported) {
      f.worst = Math.max(f.worst, now - f.last);
      if (now - f.first > 3000) {
        f.reported = true;
        mark(
          "3 s later",
          `longest frame ${Math.round(f.worst)} ms, ${Math.round(((f.count - 2) * 1000) / (now - f.first))} fps`,
        );
      }
    }
    f.last = now;
  });

  return null;
}

export function SceneTiming() {
  useLayoutEffect(() => {
    if (TIMING) startScene();
  }, []);
  const { origin, marks } = useSyncExternalStore(subscribe, snapshot, snapshot);

  if (!TIMING) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-50 max-w-[calc(100%-1rem)] rounded-lg bg-stone-900/85 p-2 font-mono text-[10px] leading-snug text-white">
      <p className="font-bold">timing{NO_SHADOWS ? " · shadows off" : ""}</p>
      {[...marks]
        .sort((a, b) => a.at - b.at)
        .map((m, i) => (
          <p key={i}>
            <span className="inline-block w-12 text-right tabular-nums">{((m.at - origin) / 1000).toFixed(2)}s</span>{" "}
            {m.label}
            {m.note && <span className="text-white/60"> · {m.note}</span>}
          </p>
        ))}
    </div>
  );
}
