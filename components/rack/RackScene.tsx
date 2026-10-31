"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, type PerspectiveCamera } from "three";
import { useBag } from "./bag";
import BagButton from "./BagButton";
import BagDrawer from "./BagDrawer";
import GarmentModal from "./GarmentModal";
import { PullOff, SOLO_LAYER } from "./pullOff";
import Rack from "./Rack";
import Sign from "./Sign";
import RackFallback from "./RackFallback";
import RackOverlay from "./RackOverlay";
import RackLoading from "./RackLoading";
import RackSounds from "./RackSounds";
import { useRackSound } from "./rackSound";
import RoomNav from "./RoomNav";
import SoundToggle from "./SoundToggle";
import { mark, SceneTiming, SHADOWS, TimingProbe } from "./timing";
import { INITIAL_INDEX, SHIRTS } from "./shirts";
import { useRackControls } from "./useRackControls";
import { ShirtInteraction, usePointerTracking } from "./interaction";
import {
  BACKGROUND,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  ENV_INTENSITY,
  ENV_MAP,
  KEY_LIGHT_COLOR,
  KEY_LIGHT_INTENSITY,
  ROOM_WALL_Z,
  SHIRT_WIDTH,
} from "./constants";
import Surroundings from "../home/Surroundings";

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

function CameraRig() {
  const last = useRef({ z: 0, width: 0, height: 0 });
  useFrame(({ camera, size }) => {
    const cam = camera as PerspectiveCamera;
    const tanHalfFov = Math.tan(MathUtils.degToRad(cam.fov) / 2);
    const halfWidth = SHIRT_WIDTH * 0.75;
    const z = Math.max(CAMERA_POSITION[2], halfWidth / (tanHalfFov * (size.width / size.height)));
    const prev = last.current;
    if (prev.z === z && prev.width === size.width && prev.height === size.height) return;
    last.current = { z, width: size.width, height: size.height };

    const eyeY = CAMERA_POSITION[1];
    cam.position.set(0, eyeY, z);
    cam.lookAt(0, eyeY, 0);
    const shift = ((eyeY - CAMERA_TARGET[1]) / (z * tanHalfFov)) * (size.height / 2);
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
  });
  return null;
}

export default function RackScene() {
  const [webgl] = useState(hasWebGL);
  const [index, setIndex] = useState(INITIAL_INDEX);
  const dragArea = useRef<HTMLDivElement>(null);
  const [interaction] = useState(() => new ShirtInteraction());
  usePointerTracking(interaction, dragArea);
  const controls = useRackControls(SHIRTS.length, INITIAL_INDEX, dragArea, interaction, setIndex);
  const sound = useRackSound();
  const bag = useBag();
  const [bagOpen, setBagOpen] = useState(false);
  const [view, setView] = useState<"closed" | "open" | "returning">("closed");
  const [pullOff] = useState(() => new PullOff(() => setView("closed")));
  const openView = () => {
    setView("open");
    pullOff.lift(index);
  };
  const closeView = () => {
    setView("returning");
    pullOff.putBack();
  };
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => {
    mark("curtain opens");
    setReady(true);
  }, []);

  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = dragArea.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!webgl) return <RackFallback />;

  return (
    <div className="relative h-full w-full">
      <SceneTiming />
      <canvas
        ref={(el) => pullOff.setSnapshot(el)}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ display: "none" }}
      />
      {view === "open" && (
        <GarmentModal
          shirt={SHIRTS[index]}
          pullOff={pullOff}
          onAdd={(size) => bag.add(SHIRTS[index].id, size)}
          onClose={closeView}
        />
      )}

      <div
        ref={dragArea}
        className={`absolute inset-0 touch-none select-none ${view === "closed" ? "" : "pointer-events-none"}`}
      >
        <Canvas
          shadows={SHADOWS}
          dpr={[1, 2]}
          frameloop={onScreen ? "always" : "never"}
          style={{ pointerEvents: view === "closed" ? "auto" : "none" }}
          camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
          onCreated={({ gl }) => {
            mark("webgl ready");
            gl.toneMapping = NeutralToneMapping;
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Clothes rack");
          }}
        >
          <color attach="background" args={[BACKGROUND]} />
          <fog attach="fog" args={[BACKGROUND, 5, 11]} />
          <CameraRig />

          <directionalLight
            position={[-2.5, 4, 3]}
            intensity={KEY_LIGHT_INTENSITY}
            color={KEY_LIGHT_COLOR}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-camera-left={-3}
            shadow-camera-right={3}
            shadow-camera-top={3}
            shadow-camera-bottom={-1}
            onUpdate={(light) => light.layers.enable(SOLO_LAYER)}
          />

          <Suspense fallback={null}>
            <Environment files={ENV_MAP} environmentIntensity={ENV_INTENSITY} />
            <Rack controls={controls} interaction={interaction} pullOff={pullOff} />
            <RackSounds controls={controls} sound={sound} />
            <Sign />
            <TimingProbe />
            <SceneReady onReady={markReady} />
          </Suspense>

          <Surroundings wallZ={ROOM_WALL_Z} decor={{ clear: 0.065, sconcePanel: 1 }} />
        </Canvas>
      </div>

      <h1 className="sr-only">Rick’s Closet</h1>

      <div
        ref={(el) => interaction.setLabel(el)}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-full bg-stone-900/85 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-white opacity-0 transition-opacity duration-150"
      >
        GRAB
      </div>

      <div inert={view !== "closed"} className={`transition-opacity duration-300 ${view === "closed" ? "" : "opacity-0"}`}>
        <RackOverlay
          shirt={SHIRTS[index]}
          onPrev={() => controls.nudge(-1)}
          onNext={() => controls.nudge(1)}
          onView={openView}
        />

        <RoomNav current="clothes" />
        <SoundToggle sound={sound} />
        <BagButton count={bag.count} onOpen={() => setBagOpen(true)} />
      </div>
      {bagOpen && <BagDrawer bag={bag} onClose={() => setBagOpen(false)} />}

      <RackLoading visible={!ready} />
    </div>
  );
}
