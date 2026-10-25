"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, type PerspectiveCamera } from "three";
import { useBag } from "../rack/bag";
import BagButton from "../rack/BagButton";
import BagDrawer from "../rack/BagDrawer";
import RackLoading from "../rack/RackLoading";
// The clothes rack's lighting, shared so the two rooms of the shop always match.
import {
  CAMERA_FOV,
  ENV_INTENSITY,
  KEY_LIGHT_COLOR,
  KEY_LIGHT_INTENSITY,
} from "../rack/constants";
import { CAMERA_RAISE, PULL_BACK, WALL_COLOR, SHELF_DEPTH, VIEW_ANGLE_DEG, VIEW_HEIGHT, shelvesWidth, wallTop } from "./constants";
import ShoeModal from "./ShoeModal";
import { SHOES } from "./shoes";
import { ShoeView, SOLO_LAYER } from "./shoeView";
import ShoeWall from "./ShoeWall";
import { useWallScroll, type WallScroll } from "./useWallScroll";

const FLOOR_MARGIN = 0.06; // floor showing below the wall at the bottom of the scroll
const SIDE_MARGIN = 0.12; // room either side of the shelves on a phone
const VIEW_ANGLE = MathUtils.degToRad(VIEW_ANGLE_DEG);

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
 * Frames the wall and follows the scroll. The camera stands to the right and looks across the
 * wall at VIEW_ANGLE_DEG, pulled back until the shelves' width fits (phones) or VIEW_HEIGHT does
 * (wider screens, PULL_BACK further). A wall that fits on screen is centred and doesn't scroll. It stays level a little above the height it shows and shifts the lens down
 * onto it (as the clothes rack does), so verticals stay vertical while shelf tops still show.
 */
function CameraRig({ scroll }: { scroll: WallScroll }) {
  useFrame(({ camera, size }, dt) => {
    const cam = camera as PerspectiveCamera;
    const tanHalfFov = Math.tan(MathUtils.degToRad(cam.fov) / 2);
    const aspect = size.width / size.height;
    // The shelving as seen from the side: its width foreshortened, plus the depth of the boards.
    const seenWidth = shelvesWidth() * Math.cos(VIEW_ANGLE) + SHELF_DEPTH * Math.sin(VIEW_ANGLE) + 2 * SIDE_MARGIN;
    // Phones fit the shelves' width; wider screens fit VIEW_HEIGHT, pulled back so the wall sits back.
    const distance = Math.max(seenWidth / 2 / (tanHalfFov * aspect), (PULL_BACK * VIEW_HEIGHT) / 2 / tanHalfFov);
    const halfHeight = distance * tanHalfFov; // of the view, at the wall
    const lowest = halfHeight - FLOOR_MARGIN;
    const highest = wallTop() - halfHeight;
    // A wall shorter than the view doesn't scroll: centre it.
    if (highest < lowest) scroll.setBounds(wallTop() / 2, wallTop() / 2);
    else scroll.setBounds(lowest, highest);
    scroll.setPxToMetres((2 * halfHeight) / size.height);
    scroll.step(dt);

    const eyeY = scroll.y + CAMERA_RAISE;
    cam.position.set(distance * Math.sin(VIEW_ANGLE), eyeY, distance * Math.cos(VIEW_ANGLE));
    cam.lookAt(0, eyeY, 0);
    const shift = (CAMERA_RAISE / (distance * tanHalfFov)) * (size.height / 2);
    cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
  });
  return null;
}

/** Moves the viewed shoe each frame. Mount after the camera rig and the wall. */
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
  const markReady = useCallback(() => setReady(true), []);
  const bag = useBag();
  const [bagOpen, setBagOpen] = useState(false);
  // The shoe view: "open" while the modal is up, "returning" while the shoe flies back to its shelf.
  const [mode, setMode] = useState<"closed" | "open" | "returning">("closed");
  const [viewing, setViewing] = useState(-1);
  const [view] = useState(
    () =>
      new ShoeView(() => {
        setMode("closed");
        setViewing(-1);
      }),
  );
  const openView = (index: number) => {
    if (mode !== "closed" || !view.lift(index)) return;
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
    <div className="relative h-full w-full">
      {/* Shoe view stacks, bottom to top: the wall frozen into a still, the modal, then the canvas
          drawing only the shoe (see shoeView.ts). The still is shown and hidden by the view. */}
      <canvas
        ref={(el) => view.setSnapshot(el)}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ display: "none" }}
      />
      {mode === "open" && viewing >= 0 && (
        <ShoeModal
          shoe={SHOES[viewing]}
          view={view}
          onAdd={(size, thumbnail) => bag.add(SHOES[viewing].id, size, thumbnail)}
          onClose={closeView}
        />
      )}

      <div
        ref={area}
        className={`absolute inset-0 touch-none select-none ${mode === "closed" ? "" : "pointer-events-none"}`}
      >
        <Canvas
          dpr={[1, 2]}
          // The Canvas sets pointer-events on its own wrapper: during the view it sits above the
          // modal, and clicks must go through to it.
          style={{ pointerEvents: mode === "closed" ? "auto" : "none" }}
          camera={{ fov: CAMERA_FOV, position: [0, 1, 3] }}
          onCreated={({ gl }) => {
            gl.toneMapping = NeutralToneMapping;
            gl.domElement.setAttribute("role", "img");
            gl.domElement.setAttribute("aria-label", "Shoe wall");
          }}
        >
          {/* One plain colour behind everything: the wall, with no floor line. */}
          <color attach="background" args={[WALL_COLOR]} />
          <CameraRig scroll={scroll} />

          {/* The rack's key light. The shoe wall casts no shadows. */}
          <directionalLight
            position={[-2.5, 4, 3]}
            intensity={KEY_LIGHT_INTENSITY}
            color={KEY_LIGHT_COLOR}
            // Also lights the shoe while it's drawn alone in the view.
            onUpdate={(light) => light.layers.enable(SOLO_LAYER)}
          />

          <Suspense fallback={null}>
            <Environment files="/hdri/studio_small_03_1k.hdr" environmentIntensity={ENV_INTENSITY} />
            <ShoeWall view={view} viewing={viewing} onSelect={openView} />
            <ViewDriver view={view} />
            <SceneReady onReady={markReady} />
          </Suspense>

        </Canvas>
      </div>

      <h1 className="sr-only">Rick’s Closet: shoes</h1>

      {/* The page's own controls step back while the view is up (the canvas covers them then). */}
      <div inert={mode !== "closed"} className={`transition-opacity duration-300 ${mode === "closed" ? "" : "opacity-0"}`}>
        <BagButton count={bag.count} onOpen={() => setBagOpen(true)} />
      </div>
      {bagOpen && <BagDrawer bag={bag} onClose={() => setBagOpen(false)} />}

      <RackLoading visible={!ready} />
    </div>
  );
}
