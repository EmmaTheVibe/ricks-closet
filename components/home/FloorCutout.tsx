import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type Texture } from "three";
import { createShadowTexture } from "../rack/textures";

type FloorCutoutProps = {
  image: string;
  height: number;
  edge: number;
  side: -1 | 1;
  z: number;
  footprint: [number, number];
  shadowOpacity: number;
};

export default function FloorCutout({ image, height, edge, side, z, footprint, shadowOpacity }: FloorCutoutProps) {
  const texture = useTexture(image, (t: Texture) => {
    t.colorSpace = SRGBColorSpace;
  });
  const { width: px, height: py } = texture.image as HTMLImageElement;
  const width = (height * px) / py;

  const materials = useMemo(
    () => ({
      photo: new MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.05, roughness: 0.85 }),
      shadow: new MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        opacity: shadowOpacity,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [texture, shadowOpacity],
  );
  useEffect(
    () => () => {
      materials.photo.dispose();
      materials.shadow.map?.dispose();
      materials.shadow.dispose();
    },
    [materials],
  );

  return (
    <group position={[edge + (side * width) / 2, 0, z]}>
      <mesh
        position={[0, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[...footprint, 1]}
        material={materials.shadow}
        renderOrder={-1}
      >
        <planeGeometry />
      </mesh>
      <mesh position={[0, height / 2, 0]} material={materials.photo}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  );
}
