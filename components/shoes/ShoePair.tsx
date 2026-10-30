import { Suspense, useMemo } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, type Group } from "three";
import { CLICK_SLOP_PX } from "../rack/constants";
import { SHELF_DEPTH, SHELF_THICKNESS } from "./constants";
import type { ShoeConfig, ShoeModel } from "./shoes";
import type { Shelf } from "./ShoeWall";

const FRONT_Z = SHELF_DEPTH * 0.72;
const BACK_Z = SHELF_DEPTH * 0.3;
const BACK_OFFSET = 0.07;

const TOE_TURN: Record<ShoeModel["toe"], number> = { "+x": 0, "-x": Math.PI, "+z": Math.PI / 2, "-z": -Math.PI / 2 };

type FootProps = { model: ShoeModel; file: string; metres: number; mirrored: boolean; x?: number; z?: number };

function Foot({ model, file, metres, mirrored, x = 0, z = 0 }: FootProps) {
  const { scene } = useGLTF(file, false, true);
  const foot = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    return {
      object: scene.clone(true),
      centre: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2] as const,
    };
  }, [scene]);
  const scale = metres / model.length;

  return (
    <group position={[x, 0, z]} scale={[scale, scale, mirrored ? -scale : scale]}>
      <group rotation={[0, TOE_TURN[model.toe], 0]}>
        <primitive object={foot.object} position={foot.centre} />
      </group>
    </group>
  );
}

type ShoePairProps = {
  shoe: ShoeConfig;
  shelf: Shelf;
  lifted: boolean;
  frontRef: (group: Group | null) => void;
  onSelect: () => void;
  onHover: (over: boolean) => void;
};

export default function ShoePair({ shoe, shelf, lifted, frontRef, onSelect, onHover }: ShoePairProps) {
  const gl = useThree((s) => s.gl);
  const right = shoe.right ?? shoe.left;
  const left = shoe.left ?? shoe.right;
  if (!right || !left) return null;

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    onSelect();
  };
  const pointer = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    gl.domElement.style.cursor = on ? "pointer" : "";
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
