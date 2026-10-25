"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, type PerspectiveCamera } from "three";
import GarmentModal from "./GarmentModal";
import { PullOff, SOLO_LAYER } from "./pullOff";
import Rack from "./Rack";
import Sign from "./Sign";
import RackFallback from "./RackFallback";
import RackOverlay from "./RackOverlay";
import RackLoading from "./RackLoading";
import RackSounds from "./RackSounds";
import { useRackSound } from "./rackSound";
import SoundToggle from "./SoundToggle";
import { INITIAL_INDEX, SHIRTS } from "./shirts";
import { useRackControls } from "./useRackControls";
import { ShirtInteraction, usePointerTracking } from "./interaction";
import {
  BACKGROUND,
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  ENV_INTENSITY,
  KEY_LIGHT_COLOR,
  KEY_LIGHT_INTENSITY,
  SHIRT_WIDTH,
} from "./constants";

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Mounts only once everything in its Suspense boundary has loaded; reports after the first frame. */
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

/**
 * Pulls the camera back on narrow screens so the center shirt always fits. The camera stays level
 * and the frame is shifted down instead of tilted (like a shift lens), so hanging garments stay
 * vertical at the edges of the screen instead of leaning.
 */
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
    // Shift the frame so CAMERA_TARGET lands at the centre, as it did when the camera tilted.
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
  // View: "open" while the modal is up, "returning" while the shirt flies back onto the rail.
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
  const markReady = useCallback(() => setReady(true), []);

  // Stop rendering (and with it, cloth stepping) while the canvas is scrolled offscreen.
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
      {/* View stacks, bottom to top: the rack frozen into a still, the modal, then the canvas
          drawing only the shirt (see pullOff.ts). Shown and hidden by the rack's frame loop. */}
      <canvas
        ref={(el) => pullOff.setSnapshot(el)}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ display: "none" }}
      />
      {view === "open" && <GarmentModal shirt={SHIRTS[index]} pullOff={pullOff} onClose={closeView} />}

      <div
        ref={dragArea}
        className={`absolute inset-0 touch-none select-none ${view === "closed" ? "" : "pointer-events-none"}`}
      >
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          frameloop={onScreen ? "always" : "never"}
          // The Canvas sets pointer-events on its own wrapper, so it must be turned off here too:
          // during View the canvas sits above the modal, and clicks have to go through to it.
          style={{ pointerEvents: view === "closed" ? "auto" : "none" }}
          camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
          onCreated={({ gl }) => {
            // Khronos PBR Neutral keeps product colours true (ACES, the default, shifts and washes them).
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
            // Also lights the shirt while it's drawn alone during View.
            onUpdate={(light) => light.layers.enable(SOLO_LAYER)}
          />

          <Suspense fallback={null}>
            {/* drei's "studio" preset, self-hosted (the preset loads from a slow third-party CDN). */}
            <Environment files="/hdri/studio_small_03_1k.hdr" environmentIntensity={ENV_INTENSITY} />
            <Rack controls={controls} interaction={interaction} pullOff={pullOff} />
            <RackSounds controls={controls} sound={sound} />
            <Sign />
            <SceneReady onReady={markReady} />
          </Suspense>

          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40, 40]} />
            {/* Unlit, so it matches the background exactly; floor shadows are drawn on top. */}
            <meshBasicMaterial color={BACKGROUND} toneMapped={false} />
          </mesh>
        </Canvas>
      </div>

      {/* The visible sign is 3D (Sign.tsx); this keeps the page title for screen readers. */}
      <h1 className="sr-only">Rick’s Closet</h1>

      {/* Cursor label; positioned every frame by ShirtInteraction, not by React. */}
      <div
        ref={(el) => interaction.setLabel(el)}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-full bg-stone-900/85 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-white opacity-0 transition-opacity duration-150"
      >
        GRAB
      </div>

      {/* The rack's controls step back while View is up (the canvas covers them then). */}
      <div inert={view !== "closed"} className={`transition-opacity duration-300 ${view === "closed" ? "" : "opacity-0"}`}>
        <RackOverlay
          shirt={SHIRTS[index]}
          onPrev={() => controls.nudge(-1)}
          onNext={() => controls.nudge(1)}
          onView={openView}
        />

        <SoundToggle sound={sound} />
      </div>

      <RackLoading visible={!ready} />
    </div>
  );
}
