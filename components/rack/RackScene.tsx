"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, type PerspectiveCamera } from "three";
import Rack from "./Rack";
import Sign from "./Sign";
import RackFallback from "./RackFallback";
import RackOverlay from "./RackOverlay";
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

/** Pulls the camera back on narrow screens so the center shirt always fits. */
function CameraRig() {
  useFrame(({ camera, size }) => {
    const halfWidth = SHIRT_WIDTH * 0.75;
    const tanHalfFov = Math.tan(MathUtils.degToRad((camera as PerspectiveCamera).fov) / 2);
    const z = Math.max(CAMERA_POSITION[2], halfWidth / (tanHalfFov * (size.width / size.height)));
    if (camera.position.z !== z) {
      camera.position.z = z;
      camera.lookAt(...CAMERA_TARGET);
    }
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
      <div ref={dragArea} className="absolute inset-0 touch-none select-none">
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          frameloop={onScreen ? "always" : "never"}
          camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
          onCreated={({ gl, camera }) => {
            // Khronos PBR Neutral keeps product colours true (ACES, the default, shifts and washes them).
            gl.toneMapping = NeutralToneMapping;
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Clothes rack");
            camera.lookAt(...CAMERA_TARGET);
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
          />

          <Suspense fallback={null}>
            <Environment preset="studio" environmentIntensity={ENV_INTENSITY} />
            <Rack controls={controls} interaction={interaction} />
            <Sign />
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

      <RackOverlay
        shirt={SHIRTS[index]}
        onPrev={() => controls.goTo(controls.target - 1)}
        onNext={() => controls.goTo(controls.target + 1)}
      />
    </div>
  );
}
