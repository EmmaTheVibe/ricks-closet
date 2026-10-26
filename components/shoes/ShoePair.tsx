import { Suspense, useMemo } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, type Group } from "three";
import { CLICK_SLOP_PX } from "../rack/constants";
import { SHELF_DEPTH, SHELF_THICKNESS } from "./constants";
import type { ShoeConfig, ShoeModel } from "./shoes";
import type { Shelf } from "./ShoeWall";

// The pair on its shelf, as on a shop's sneaker wall: side-on, toes out, the back shoe staggered
// forward so both show.
const FRONT_Z = SHELF_DEPTH * 0.72; // the right shoe, nearer the viewer
const BACK_Z = SHELF_DEPTH * 0.3; // the left shoe, against the wall
const BACK_OFFSET = 0.07; // the back shoe sits this far toe-wards, so it shows beside the front one

/** The turn about the vertical that points a model's toe along +x (with its outer side to the camera). */
const TOE_TURN: Record<ShoeModel["toe"], number> = { "+x": 0, "-x": Math.PI, "+z": Math.PI / 2, "-z": -Math.PI / 2 };

type FootProps = { model: ShoeModel; file: string; metres: number; mirrored: boolean; x?: number; z?: number };

/**
 * One shoe, sole on the shelf, toe pointing +x (toward the camera's side), `metres` long. A
 * mirrored foot stands in for a missing one: the other foot reflected across its width.
 */
function Foot({ model, file, metres, mirrored, x = 0, z = 0 }: FootProps) {
  // Meshopt-compressed (decoder bundled); no Draco, so nothing is fetched from a CDN.
  const { scene } = useGLTF(file, false, true);
  const foot = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    return {
      object: scene.clone(true),
      // Centre heel-to-toe and across, sole at the origin.
      centre: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2] as const,
    };
  }, [scene]);
  const scale = metres / model.length;

  return (
    <group position={[x, 0, z]} scale={[scale, scale, mirrored ? -scale : scale]}>
      {/* Turn the model so its toe points +x. */}
      <group rotation={[0, TOE_TURN[model.toe], 0]}>
        <primitive object={foot.object} position={foot.centre} />
      </group>
    </group>
  );
}

type ShoePairProps = {
  shoe: ShoeConfig;
  shelf: Shelf;
  /** Its front shoe is off the shelf, in the shoe view: show it in HD. */
  lifted: boolean;
  /** The front shoe's group, for the shoe view to move. */
  frontRef: (group: Group | null) => void;
  onSelect: () => void;
  /** The mouse moved onto (true) or off (false) the pair. */
  onHover: (over: boolean) => void;
};

/** One shoe design standing as a pair on its shelf: the right shoe in front, the left behind. Tap to view it. */
export default function ShoePair({ shoe, shelf, lifted, frontRef, onSelect, onHover }: ShoePairProps) {
  const gl = useThree((s) => s.gl);
  const right = shoe.right ?? shoe.left;
  const left = shoe.left ?? shoe.right;
  if (!right || !left) return null;

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return; // a drag across the shoe scrolls the wall instead
    e.stopPropagation();
    onSelect();
  };
  const pointer = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    gl.domElement.style.cursor = on ? "pointer" : "";
    // Mouse only: on touch a tap opens the shoe, and a hover label would just flash.
    if (!on || e.pointerType === "mouse") onHover(on);
  };
  const front = <Foot model={right} file={right.file} metres={shoe.length} mirrored={!shoe.right} />;

  return (
    <group
      position={[shelf.x, shelf.y + SHELF_THICKNESS / 2, 0]}
      onClick={tap}
      onPointerOver={pointer(true)}
      onPointerOut={pointer(false)}
    >
      <Foot model={left} file={left.file} metres={shoe.length} mirrored={!shoe.left} x={BACK_OFFSET} z={BACK_Z} />
      <group ref={frontRef} position={[0, 0, FRONT_Z]}>
        {lifted ? (
          // The sharper model for the close-up; the shelf one stands in until it has loaded.
          <Suspense fallback={front}>
            <Foot model={right} file={right.fileHd} metres={shoe.length} mirrored={!shoe.right} />
          </Suspense>
        ) : (
          front
        )}
      </group>
    </group>
  );
}
