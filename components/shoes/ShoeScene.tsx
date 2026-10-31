"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, type Group, type PerspectiveCamera } from "three";
import { useBag } from "../rack/bag";
import BagButton from "../rack/BagButton";
import BagDrawer from "../rack/BagDrawer";
import RoomNav from "../rack/RoomNav";
import RackLoading from "../rack/RackLoading";
import { mark, SceneTiming, TimingProbe } from "../rack/timing";
import Sign from "../rack/Sign";
import {
  BACKGROUND,
  CAMERA_FOV,
  ENV_INTENSITY,
  ENV_MAP,
  KEY_LIGHT_COLOR,
  KEY_LIGHT_INTENSITY,
  SIGN_Y,
} from "../rack/constants";
import { CAMERA_RAISE, PULL_BACK, SIGN_ABOVE_TOP_SHELF, SIGN_DEPTH, SIGN_TOP_GAP, topShelfY, CASE_DEPTH, VIEW_ANGLE_DEG, VIEW_HEIGHT, caseTop, caseWidth, WALL_Z, wallTop } from "./constants";
import Surroundings from "../home/Surroundings";
import ShoeModal from "./ShoeModal";
import { SHOES } from "./shoes";
import { ShoeView, SOLO_LAYER } from "./shoeView";
import ShoeWall, { WALL_SLOTS } from "./ShoeWall";
import { useWallScroll, type WallScroll } from "./useWallScroll";

const FLOOR_MARGIN = 0.3;
const SIDE_MARGIN = 0.12;
const VIEW_ANGLE = MathUtils.degToRad(VIEW_ANGLE_DEG);

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

function CameraRig({ scroll }: { scroll: WallScroll }) {
  useFrame(({ camera, size }, dt) => {
    const cam = camera as PerspectiveCamera;
    const tanHalfFov = Math.tan(MathUtils.degToRad(cam.fov) / 2);
    const aspect = size.width / size.height;
    const seenWidth = caseWidth() * Math.cos(VIEW_ANGLE) + CASE_DEPTH * Math.sin(VIEW_ANGLE) + 2 * SIDE_MARGIN;
    const distance = Math.max(seenWidth / 2 / (tanHalfFov * aspect), (PULL_BACK * VIEW_HEIGHT) / 2 / tanHalfFov);
    const halfHeight = distance * tanHalfFov;
    const lowest = halfHeight - FLOOR_MARGIN;
    const highest = wallTop() - halfHeight;
    if (highest < lowest) scroll.setBounds(wallTop() / 2, wallTop() / 2);
    else scroll.setBounds(lowest, highest);
    scroll.setPxToMetres((2 * halfHeight) / size.height);
    scroll.setHalfHeight(halfHeight);
    scroll.step(dt);

    const eyeY = scroll.y + CAMERA_RAISE;
    cam.position.set(distance * Math.sin(VIEW_ANGLE), eyeY, distance * Math.cos(VIEW_ANGLE));
    cam.lookAt(0, eyeY, 0);
    const shift = (CAMERA_RAISE / (distance * tanHalfFov)) * (size.height / 2);
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
  });
  return null;
}

function SignHanger({ scroll }: { scroll: WallScroll }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const above = topShelfY() + SIGN_ABOVE_TOP_SHELF;
    const nearTop = scroll.y + scroll.halfHeight - SIGN_TOP_GAP;
    if (group.current) group.current.position.y = (scroll.fitsWhole ? Math.max(above, nearTop) : above) - SIGN_Y;
  });
  return (
    <group ref={group} position={[0, 0, SIGN_DEPTH]}>
      <Sign />
    </group>
  );
}

function ViewDriver({ view }: { view: ShoeView }) {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useFrame((state, dt) => view.update(dt, reduced, state.gl, state.scene, state.camera as PerspectiveCamera));
  return null;
}

export default function ShoeScene() {
  const [webgl] = useState(hasWebGL);
  const area = useRef<HTMLDivElement>(null);
  const scroll = useWallScroll(area);
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
      new ShoeView(() => {
        setMode("closed");
        setViewing(-1);
      }),
  );
  const [hovered, setHovered] = useState(-1);
  const [labelled, setLabelled] = useState(-1);
  const hover = (index: number) => {
    setHovered(index);
    if (index >= 0) setLabelled(index);
  };
  const pill = useRef<HTMLDivElement>(null);
  const movePill = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pill.current;
    if (!el) return;
    const box = e.currentTarget.getBoundingClientRect();
    el.style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px) translate(-50%, calc(-100% - 14px))`;
  };
  const pillShown = mode === "closed" && hovered >= 0;
  const labelShoe = labelled >= 0 ? SHOES[WALL_SLOTS[labelled].shoe] : null;

  const openView = (index: number) => {
    if (mode !== "closed" || !view.lift(index)) return;
    setHovered(-1);
    setViewing(index);
    setMode("open");
  };
  const closeView = () => {
    setMode("returning");
    view.putBack();
  };

  if (!webgl) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-stone-900">
        <p className="font-bold">The shoe wall needs a browser with WebGL.</p>
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
        <ShoeModal
          shoe={SHOES[WALL_SLOTS[viewing].shoe]}
          view={view}
          onAdd={(size, thumbnail) => bag.add(SHOES[WALL_SLOTS[viewing].shoe].id, size, thumbnail)}
          onClose={closeView}
        />
      )}

      <div
        ref={area}
        className={`absolute inset-0 touch-none select-none ${mode === "closed" ? "" : "pointer-events-none"}`}
      >
        <Canvas
          dpr={[1, 2]}
          style={{ pointerEvents: mode === "closed" ? "auto" : "none" }}
          camera={{ fov: CAMERA_FOV, position: [0, 1, 3] }}
          onCreated={({ gl }) => {
            mark("webgl ready");
            gl.toneMapping = NeutralToneMapping;
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Shoe wall");
          }}
        >
          <color attach="background" args={[BACKGROUND]} />
          <Surroundings
            wallZ={WALL_Z}
            halo={{ width: caseWidth(), height: caseTop() }}
            decor={{ clear: caseWidth() / 2 + 0.19, sconcePanel: 0 }}
          />
          <CameraRig scroll={scroll} />

          <directionalLight
            position={[-2.5, 4, 3]}
            intensity={KEY_LIGHT_INTENSITY}
            color={KEY_LIGHT_COLOR}
            onUpdate={(light) => light.layers.enable(SOLO_LAYER)}
          />

          <Suspense fallback={null}>
            <Environment files={ENV_MAP} environmentIntensity={ENV_INTENSITY} />
            <ShoeWall view={view} viewing={viewing} onSelect={openView} onHover={hover} />
            <SignHanger scroll={scroll} />
            <ViewDriver view={view} />
            <TimingProbe />
            <SceneReady onReady={markReady} />
          </Suspense>

        </Canvas>
      </div>

      <h1 className="sr-only">Rick’s Closet: shoes</h1>

      <div
        ref={pill}
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 flex items-baseline gap-2 rounded-full bg-stone-900/85 px-3 py-1 whitespace-nowrap text-white transition-opacity duration-150 ${pillShown ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-xs font-bold">{labelShoe?.name}</span>
        <span className="font-mono text-[11px] text-white/75">{labelShoe?.price}</span>
      </div>

      <div inert={mode !== "closed"} className={`transition-opacity duration-300 ${mode === "closed" ? "" : "opacity-0"}`}>
        <RoomNav current="shoes" />
        <BagButton count={bag.count} onOpen={() => setBagOpen(true)} />
      </div>
      {bagOpen && <BagDrawer bag={bag} onClose={() => setBagOpen(false)} />}

      <RackLoading visible={!ready} />
    </div>
  );
}
