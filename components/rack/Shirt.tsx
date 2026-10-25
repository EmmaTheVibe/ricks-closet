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
  /** Per-garment front opacity, written by the rack each frame (1 = fully shown). */
  fades: RefObject<number[]>;
  index: number;
  /** Has a side-view photo: stays in blended mode so fading never recompiles shaders mid-move. */
  crossfades: boolean;
  onSelect: () => void;
};

/** One shirt: front and back panels around a cloth-simulated (or static) mid-sheet. */
export default function Shirt({ ref, surface, texture, weave, fades, index, crossfades, onSelect }: ShirtProps) {
  // Shadows follow the cut-out silhouette instead of the full rectangle.
  const depthMaterial = useMemo(
    () => new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: texture, alphaTest: 0.5 }),
    [texture],
  );
  useEffect(() => () => depthMaterial.dispose(), [depthMaterial]);

  // Fades out while a side-view photo takes over (only garments that have one).
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

  // Along the outline both panels are the same surface; the back one is drawn a hair behind so
  // they don't flicker against each other there.
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
