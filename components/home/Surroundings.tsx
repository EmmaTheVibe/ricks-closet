import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshBasicMaterial, MeshStandardMaterial } from "three";
import { physicalMaterial } from "../rack/device";
import { createShadowTexture } from "../rack/textures";
import { WOOD_ROUGHNESS, WOOD_SPECULAR } from "../shoes/constants";
import {
  BOARD_WIDTH,
  FLOOR_WOOD,
  PLASTER,
  SKIRTING_COLOR,
  SKIRTING_DEPTH,
  SKIRTING_HEIGHT,
  WALL_SHADOW_OPACITY,
} from "./constants";
import { BOARDS_ACROSS, createFloorBoards } from "./textures";
import WallDecor, { type WallDecorLayout } from "./WallDecor";

const ROOM_WIDTH = 16;
const FLOOR_DEPTH = 14;
const WALL_HEIGHT = 10;
const FLOOR_BUMP = 1;

type SurroundingsProps = {
  wallZ: number;
  halo?: { width: number; height: number };
  decor: WallDecorLayout;
};

export default function Surroundings({ wallZ, halo, decor }: SurroundingsProps) {
  const gl = useThree((s) => s.gl);
  const materials = useMemo(() => {
    const boards = createFloorBoards(gl.capabilities.getMaxAnisotropy(), FLOOR_WOOD);
    const tile = BOARDS_ACROSS * BOARD_WIDTH;
    for (const t of [boards.map, boards.bump]) t.repeat.set(ROOM_WIDTH / tile, FLOOR_DEPTH / (2 * tile));
    return {
      wall: new MeshBasicMaterial({ color: PLASTER, toneMapped: false }),
      skirting: new MeshStandardMaterial({ color: SKIRTING_COLOR, roughness: 0.6 }),
      floor: physicalMaterial({
        map: boards.map,
        bumpMap: boards.bump,
        bumpScale: FLOOR_BUMP,
        roughness: WOOD_ROUGHNESS,
        specularIntensity: WOOD_SPECULAR,
      }),
      halo: new MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        opacity: WALL_SHADOW_OPACITY,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [gl]);
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        if ("bumpMap" in m) m.bumpMap?.dispose();
        m.dispose();
      }),
    [materials],
  );

  return (
    <group>
      <mesh position={[0, WALL_HEIGHT / 2, wallZ]} material={materials.wall}>
        <planeGeometry args={[ROOM_WIDTH, WALL_HEIGHT]} />
      </mesh>
      {halo && (
        <mesh
          position={[0, halo.height / 2, wallZ + 0.001]}
          scale={[halo.width + 0.5, halo.height + 0.5, 1]}
          material={materials.halo}
          renderOrder={-1}
        >
          <planeGeometry />
        </mesh>
      )}
      <group position={[0, 0, wallZ]}>
        <WallDecor {...decor} />
      </group>
      <mesh position={[0, SKIRTING_HEIGHT / 2, wallZ + SKIRTING_DEPTH / 2]} material={materials.skirting}>
        <boxGeometry args={[ROOM_WIDTH, SKIRTING_HEIGHT, SKIRTING_DEPTH]} />
      </mesh>
      <mesh position={[0, 0, wallZ + FLOOR_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]} material={materials.floor}>
        <planeGeometry args={[ROOM_WIDTH, FLOOR_DEPTH]} />
      </mesh>
    </group>
  );
}
