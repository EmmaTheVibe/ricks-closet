"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, Vector3, type PerspectiveCamera } from "three";
import { HoverIcon, ROOM_ICONS, SPRING } from "../ui/hover";
import RackLoading from "../rack/RackLoading";
import {
  BACKGROUND,
  CAMERA_FOV,
  ENV_INTENSITY,
  ENV_MAP,
  KEY_LIGHT_COLOR,
  KEY_LIGHT_INTENSITY,
} from "../rack/constants";
import {
  DOORS_START,
  END_FIT,
  EYE_Y,
  FADE_TIME,
  INTRO_END,
  PLANT_EDGE,
  PLANT_HEIGHT,
  PLANT_IMAGE,
  PLANT_Z,
  PUSH_TIME,
  RING_LIGHT_TURN_DEG,
  RING_LIGHT_X,
  RING_LIGHT_Z,
  ROOMS,
  START_FIT,
  WALK_START,
  WALK_TIME,
  WALL_Z,
  WARDROBE_HEIGHT,
  WARDROBE_WIDTH,
  type Room,
} from "./constants";
import FloorCutout from "./FloorCutout";
import RingLight from "./RingLight";
import Surroundings from "./Surroundings";
import Wardrobe, { progress, PUSH_TARGETS } from "./Wardrobe";

type Phase = "closed" | "opening" | "inside";

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

function IntroClock({ clockRef, running, onPhase }: { clockRef: RefObject<number>; running: boolean; onPhase: (phase: Phase) => void }) {
  const phase = useRef<Phase>("closed");
  useFrame((_, dt) => {
    if (!running) return;
    const t = Math.min(INTRO_END, clockRef.current + Math.min(dt, 1 / 20));
    clockRef.current = t;
    const next = t >= INTRO_END ? "inside" : t >= DOORS_START ? "opening" : "closed";
    if (next !== phase.current) {
      phase.current = next;
      onPhase(next);
    }
  });
  return null;
}

const eye = new Vector3();
const look = new Vector3();

type CameraRigProps = {
  clock: RefObject<number>;
  push: Room | null;
  onFade: () => void;
  onArrive: () => void;
};

function CameraRig({ clock, push, onFade, onArrive }: CameraRigProps) {
  const pushed = useRef(0);
  const cues = useRef({ faded: false, arrived: false });
  useFrame(({ camera, size }, dt) => {
    const cam = camera as PerspectiveCamera;
    const tanHalfFov = Math.tan(MathUtils.degToRad(cam.fov) / 2);
    const aspect = size.width / size.height;
    const fit = ({ width, height }: { width: number; height: number }) =>
      Math.max(height / 2 / tanHalfFov, width / 2 / (tanHalfFov * aspect));
    const k = progress(clock.current, WALK_START, WALK_TIME);
    const distance = MathUtils.lerp(fit(START_FIT), fit(END_FIT), k);
    const centreY = MathUtils.lerp(START_FIT.centreY, END_FIT.centreY, k);
    eye.set(0, EYE_Y, distance);
    look.set(0, EYE_Y, 0);
    let shift = ((EYE_Y - centreY) / (distance * tanHalfFov)) * (size.height / 2);

    if (!push) {
      pushed.current = 0;
      cues.current = { faded: false, arrived: false };
    } else {
      pushed.current += Math.min(dt, 1 / 20);
      const p = progress(pushed.current, 0, PUSH_TIME);
      const target = PUSH_TARGETS[push];
      eye.lerp(target.eye, p);
      look.lerp(target.look, p);
      shift *= 1 - p;
      if (!cues.current.faded && pushed.current >= PUSH_TIME - FADE_TIME) {
        cues.current.faded = true;
        onFade();
      }
      if (!cues.current.arrived && pushed.current >= PUSH_TIME) {
        cues.current.arrived = true;
        onArrive();
      }
    }

    cam.position.copy(eye);
    cam.lookAt(look);
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
  });
  return null;
}

let introPlayed = false;

export default function WardrobeScene({ fallback }: { fallback: ReactNode }) {
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [skipIntro] = useState(() => reduced || introPlayed);
  const clock = useRef(skipIntro ? INTRO_END : 0);
  const [phase, setPhase] = useState<Phase>(skipIntro ? "inside" : "closed");
  const changePhase = useCallback((next: Phase) => {
    setPhase(next);
    if (next === "inside") introPlayed = true;
  }, []);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  const router = useRouter();
  useEffect(() => {
    Object.values(ROOMS).forEach((room) => router.prefetch(room.href));
  }, [router]);
  const [hovered, setHovered] = useState<Room | null>(null);
  const [labelled, setLabelled] = useState<Room>("clothes");
  const hover = (room: Room | null) => {
    setHovered(room);
    if (room) setLabelled(room);
  };

  const [pushing, setPushing] = useState<Room | null>(null);
  const [fading, setFading] = useState(false);
  const go = (room: Room) => {
    if (pushing) return;
    setHovered(null);
    if (reduced) router.push(ROOMS[room].href);
    else setPushing(room);
  };
  const inside = phase === "inside" && !pushing;

  const cover = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    cover.current?.getBoundingClientRect();
    const frame = requestAnimationFrame(() => setFading(false));
    return () => {
      cancelAnimationFrame(frame);
      setPushing(null);
    };
  }, []);
  const pill = useRef<HTMLDivElement>(null);
  const movePill = (e: PointerEvent<HTMLElement>) => {
    const el = pill.current;
    if (!el) return;
    const box = e.currentTarget.getBoundingClientRect();
    el.style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px) translate(-50%, calc(-100% - 14px))`;
  };

  if (!webgl) return fallback;

  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ background: BACKGROUND }} onPointerMove={movePill}>
      <div className="absolute inset-0 select-none">
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: CAMERA_FOV, position: [0, EYE_Y, 6] }}
          onCreated={({ gl }) => {
            gl.toneMapping = NeutralToneMapping;
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Rick’s wardrobe, its doors opening onto clothes, shoes and watches");
          }}
        >
          <color attach="background" args={[BACKGROUND]} />
          <CameraRig
            clock={clock}
            push={pushing}
            onFade={() => setFading(true)}
            onArrive={() => pushing && router.push(ROOMS[pushing].href)}
          />
          <IntroClock clockRef={clock} running={ready} onPhase={changePhase} />

          <directionalLight position={[-2.5, 4, 3]} intensity={KEY_LIGHT_INTENSITY} color={KEY_LIGHT_COLOR} />

          <Suspense fallback={null}>
            <Environment files={ENV_MAP} environmentIntensity={ENV_INTENSITY} />
            <Wardrobe clock={clock} enabled={inside} onHover={hover} onGo={go} />
            <FloorCutout
              image={PLANT_IMAGE}
              height={PLANT_HEIGHT}
              edge={PLANT_EDGE}
              side={-1}
              z={PLANT_Z}
              footprint={[0.6, 0.31]}
              shadowOpacity={0.3}
            />
            <RingLight x={RING_LIGHT_X} z={RING_LIGHT_Z} wallZ={WALL_Z} turnDeg={RING_LIGHT_TURN_DEG} />
            <SceneReady onReady={markReady} />
          </Suspense>

          <Surroundings
            wallZ={WALL_Z}
            halo={{ width: WARDROBE_WIDTH, height: WARDROBE_HEIGHT }}
            decor={{ clear: WARDROBE_WIDTH / 2 + 0.19, sconcePanel: 0 }}
          />
        </Canvas>
      </div>

      <h1 className="sr-only">Rick’s Closet</h1>

      <div
        ref={pill}
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 rounded-full bg-stone-900/85 px-3 py-1 text-xs font-bold whitespace-nowrap text-white transition-opacity duration-150 ${inside && hovered ? "opacity-100" : "opacity-0"}`}
      >
        {ROOMS[labelled].label} →
      </div>

      <nav
        aria-label="Rooms"
        inert={!inside}
        className={`absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex justify-center gap-2 px-4 transition-opacity duration-500 motion-reduce:transition-none ${inside ? "opacity-100" : "opacity-0"}`}
      >
        {(Object.keys(ROOMS) as Room[]).map((room) => (
          <Link
            key={room}
            href={ROOMS[room].href}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              go(room);
            }}
            className={`flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-stone-900 shadow-md ${SPRING} hover:bg-stone-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900`}
          >
            <HoverIcon>{ROOM_ICONS[room]}</HoverIcon>
            {ROOMS[room].label}
          </Link>
        ))}
      </nav>

      {ready && phase !== "inside" && (
        <button
          type="button"
          onClick={() => {
            clock.current = INTRO_END;
          }}
          className="absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] rounded-full px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-900/5 focus-visible:outline-2 focus-visible:outline-stone-900"
        >
          Skip
        </button>
      )}

      <div
        ref={cover}
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity ease-in ${fading ? "opacity-100" : "opacity-0"}`}
        style={{ background: BACKGROUND, transitionDuration: `${FADE_TIME * 1000}ms` }}
      />

      <RackLoading visible={!ready} />
    </main>
  );
}
