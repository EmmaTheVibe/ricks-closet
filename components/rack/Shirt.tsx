import { useEffect, useMemo, useRef, type Ref, type RefObject } from "react";
import {
  DoubleSide,
  MeshDepthMaterial,
  RGBADepthPacking,
  type Group,
  type Mesh,
  type MeshPhysicalMaterial,
  type Texture,
} from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { CLICK_SLOP_PX, FABRIC_SHEEN, FABRIC_SPECULAR, WEAVE_BUMP } from "./constants";
import type { ShirtSurface } from "./shirtSurface";

type ShirtProps = {
  ref?: Ref<Mesh>;
  surface: ShirtSurface;
  texture: Texture;
  weave: Texture;
  fades: RefObject<number[]>;
  index: number;
  crossfades: boolean;
  onSelect: () => void;
};

export default function Shirt({ ref, surface, texture, weave, fades, index, crossfades, onSelect }: ShirtProps) {
  const depthMaterial = useMemo(
    () => new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: texture, alphaTest: 0.5 }),
    [texture],
  );
  useEffect(() => () => depthMaterial.dispose(), [depthMaterial]);

  const group = useRef<Group>(null);
  const frontMaterial = useRef<MeshPhysicalMaterial>(null);
  const backMaterial = useRef<MeshPhysicalMaterial>(null);
  useFrame(() => {
    const opacity = fades.current[index] ?? 1;
    if (group.current) group.current.visible = opacity > 0.001;
    for (const material of [frontMaterial.current, backMaterial.current]) {
      if (!material) continue;
      const transparent = crossfades || opacity < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    onSelect();
  };

  const material = (behind: boolean) => (
    <meshPhysicalMaterial
      ref={behind ? backMaterial : frontMaterial}
      transparent={crossfades}
      map={texture}
      alphaTest={0.5}
      side={DoubleSide}
      roughness={0.85}
      specularIntensity={FABRIC_SPECULAR}
      sheen={FABRIC_SHEEN}
      sheenRoughness={0.8}
      sheenColor="#ffffff"
      bumpMap={weave}
      bumpScale={WEAVE_BUMP}
      polygonOffset={behind}
      polygonOffsetFactor={behind ? 1 : 0}
      polygonOffsetUnits={behind ? 4 : 0}
    />
  );

  return (
    <group ref={group}>
      <mesh ref={ref} geometry={surface.front} castShadow receiveShadow customDepthMaterial={depthMaterial} onClick={handleClick}>
        {material(false)}
      </mesh>
      <mesh geometry={surface.back} castShadow receiveShadow customDepthMaterial={depthMaterial} onClick={handleClick}>
        {material(true)}
      </mesh>
    </group>
  );
}
