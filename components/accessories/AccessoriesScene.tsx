"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, Vector3, type PerspectiveCamera } from "three";
import { useBag } from "../rack/bag";
import BagButton from "../rack/BagButton";
import BagDrawer from "../rack/BagDrawer";
import RoomNav from "../rack/RoomNav";
import RackLoading from "../rack/RackLoading";
import { mark, SceneTiming, SHADOWS, TimingMark, TimingProbe } from "../rack/timing";
import { DPR } from "../rack/device";
import { BACKGROUND, ENV_INTENSITY, ENV_MAP, KEY_LIGHT_COLOR, KEY_LIGHT_INTENSITY } from "../rack/constants";
import { BOX_HEIGHT, boxSize, LAYOUTS, LID_OPEN_DEG, LID_THICKNESS, SIDEBOARD, SIDEBOARD_WALL_Z, type BoxLayout } from "./constants";
import Surroundings from "../home/Surroundings";
import Sideboard from "./Sideboard";
import WatchBox from "./WatchBox";
import WatchModal from "./WatchModal";
import { WatchView } from "./watchView";
import { WATCHES } from "./watches";

for (const watch of WATCHES) useTexture.preload(watch.image);

const CAMERA_FOV = 24;
const TILT_DEG = 38;
const LAYOUT = LAYOUTS.wide;
const FILL = 0.55;
const FILL_TALL = 0.85;

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

function corners(layout: BoxLayout) {
  const { width, depth } = boxSize(layout);
  const open = MathUtils.degToRad(LID_OPEN_DEG);
  const lidY = BOX_HEIGHT + depth * Math.sin(open) + LID_THICKNESS;
  const lidZ = -depth / 2 + depth * Math.cos(open);
  return [-1, 1].flatMap((side) => [
    new Vector3((side * width) / 2, BOX_HEIGHT, depth / 2),
    new Vector3((side * width) / 2, 0, depth / 2),
    new Vector3((side * width) / 2, BOX_HEIGHT, -depth / 2),
    new Vector3((side * width) / 2, lidY, lidZ),
  ]);
}

const projected = new Vector3();

function CameraRig({ layout }: { layout: BoxLayout }) {
  const fitted = useRef("");
  useFrame(({ camera, size }) => {
    const cam = camera as PerspectiveCamera;
    const key = `${size.width}x${size.height}:${layout.cols}`;
    if (fitted.current === key) return;
    fitted.current = key;
    const points = corners(layout);
    const fill = size.width < size.height ? FILL_TALL : FILL;
    const tilt = MathUtils.degToRad(TILT_DEG);
    const place = (distance: number, centreZ: number) => {
      cam.up.set(0, 0, -1);
      cam.position.set(0, distance * Math.cos(tilt), centreZ + distance * Math.sin(tilt));
      cam.lookAt(0, 0, centreZ);
      cam.updateMatrixWorld();
    };
    const spread = () => {
      let maxX = 0;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of points) {
        projected.copy(p).project(cam);
        maxX = Math.max(maxX, Math.abs(projected.x));
        minY = Math.min(minY, projected.y);
        maxY = Math.max(maxY, projected.y);
      }
      return { reach: Math.max(maxX, (maxY - minY) / 2), offset: (maxY + minY) / 2 };
    };

    let centreZ = 0;
    let distance = 1;
    for (let round = 0; round < 3; round++) {
      let near = 0.2;
      let far = 10;
      for (let i = 0; i < 30; i++) {
        distance = (near + far) / 2;
        place(distance, centreZ);
        if (spread().reach > fill) near = distance;
        else far = distance;
      }
      distance = far;
      place(distance, centreZ);
      const { offset } = spread();
      centreZ -= offset * distance * Math.tan(MathUtils.degToRad(cam.fov) / 2);
    }
    place(distance, centreZ);
  });
  return null;
}

type RoomProps = { view: WatchView; onSelect: (index: number) => void; onHover: (index: number) => void };

function Room({ view, onSelect, onHover }: RoomProps) {
  return (
    <>
      <CameraRig layout={LAYOUT} />
      <Sideboard />
      <WatchBox layout={LAYOUT} view={view} onSelect={onSelect} onHover={onHover} />
    </>
  );
}

function ViewDriver({ view }: { view: WatchView }) {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useFrame((state, dt) => view.update(dt, reduced, state.gl, state.scene, state.camera as PerspectiveCamera));
  return null;
}

export default function AccessoriesScene() {
  const [webgl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => {
    mark("curtain opens");
    setReady(true);
  }, []);
  const bag = useBag();
  const [bagOpen, setBagOpen] = useState(false);
  const [mode, setMode] = useState<"closed" | "open" | "returning">("closed");
  const [viewing, setViewing] = useState(-1);
  const [view] = useState(
    () =>
      new WatchView(() => {
        setMode("closed");
        setViewing(-1);
      }),
  );
  const openView = (index: number) => {
    if (mode !== "closed" || !view.lift(index)) return;
    setHovered(-1);
    setViewing(index);
    setMode("open");
  };

  const [hovered, setHovered] = useState(-1);
  const [labelled, setLabelled] = useState(-1);
  const hover = (index: number) => {
    setHovered(index);
    if (index >= 0) setLabelled(index);
  };
  const pill = useRef<HTMLDivElement>(null);
  const movePill = (e: PointerEvent<HTMLDivElement>) => {
    const el = pill.current;
    if (!el) return;
    const box = e.currentTarget.getBoundingClientRect();
    el.style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px) translate(-50%, calc(-100% - 14px))`;
  };
  const labelWatch = labelled >= 0 ? WATCHES[labelled] : null;

  if (!webgl) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-stone-900">
        <p className="font-bold">The watch box needs a browser with WebGL.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" onPointerMove={movePill}>
      <SceneTiming />
      <canvas
        ref={(el) => view.setSnapshot(el)}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ display: "none" }}
      />
      {mode === "open" && viewing >= 0 && (
        <WatchModal
          watch={WATCHES[viewing]}
          view={view}
          onAdd={() => bag.add(WATCHES[viewing].id, "One size")}
          onClose={() => setMode("returning")}
        />
      )}

      <div className={`absolute inset-0 select-none ${mode === "closed" ? "" : "pointer-events-none"}`}>
        <Canvas
          shadows={SHADOWS}
          dpr={DPR}
          style={{ pointerEvents: mode === "closed" ? "auto" : "none" }}
          camera={{ fov: CAMERA_FOV, position: [0, 1, 0] }}
          onCreated={({ gl }) => {
            mark("webgl ready");
            gl.toneMapping = NeutralToneMapping;
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Watch box");
          }}
        >
          <color attach="background" args={[BACKGROUND]} />
          <group position={[0, -SIDEBOARD.height, 0]}>
            <Surroundings
              wallZ={SIDEBOARD_WALL_Z}
              halo={{ width: SIDEBOARD.width, height: SIDEBOARD.height }}
              decor={{ clear: SIDEBOARD.width / 2 + 0.19, sconcePanel: 0 }}
            />
          </group>
          <directionalLight
            position={[-0.6, 1.2, 0.7]}
            intensity={KEY_LIGHT_INTENSITY}
            color={KEY_LIGHT_COLOR}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.01}
            shadow-camera-left={-0.4}
            shadow-camera-right={0.4}
            shadow-camera-top={0.4}
            shadow-camera-bottom={-0.4}
          />
          <Suspense fallback={null}>
            <TimingMark />
            <Environment files={ENV_MAP} environmentIntensity={ENV_INTENSITY} />
            <Room view={view} onSelect={openView} onHover={hover} />
            <ViewDriver view={view} />
            <TimingProbe />
            <SceneReady onReady={markReady} />
          </Suspense>
        </Canvas>
      </div>

      <h1 className="sr-only">Rick’s Closet: accessories</h1>

      <div
        ref={pill}
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 flex w-max max-w-52 flex-col items-center gap-1 rounded-2xl bg-stone-900/85 px-3 py-2 text-center text-white transition-opacity duration-150 ${mode === "closed" && hovered >= 0 ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-xs leading-snug font-bold">{labelWatch?.name}</span>
        <span className="font-mono text-[11px] text-white/75">{labelWatch?.price}</span>
      </div>

      <div inert={mode !== "closed"} className={`transition-opacity duration-300 ${mode === "closed" ? "" : "opacity-0"}`}>
        <RoomNav current="watches" />
        <BagButton count={bag.count} onOpen={() => setBagOpen(true)} />
      </div>
      {bagOpen && <BagDrawer bag={bag} onClose={() => setBagOpen(false)} />}
      <RackLoading visible={!ready} />
    </div>
  );
}
