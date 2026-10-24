import { useEffect, useMemo, type Ref } from "react";
import { DoubleSide, MeshDepthMaterial, RGBADepthPacking, type Mesh, type Texture } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { CLICK_SLOP_PX, FABRIC_SHEEN, FABRIC_SPECULAR, WEAVE_BUMP } from "./constants";
import type { ShirtSurface } from "./shirtSurface";

type ShirtProps = {
  ref?: Ref<Mesh>;
  surface: ShirtSurface;
  texture: Texture;
  weave: Texture;
  onSelect: () => void;
};

/** One shirt: front and back panels around a cloth-simulated (or static) mid-sheet. */
export default function Shirt({ ref, surface, texture, weave, onSelect }: ShirtProps) {
  // Shadows follow the cut-out silhouette instead of the full rectangle.
  const depthMaterial = useMemo(
    () => new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: texture, alphaTest: 0.5 }),
    [texture],
  );
  useEffect(() => () => depthMaterial.dispose(), [depthMaterial]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    onSelect();
  };

  // Along the outline both panels are the same surface; the back one is drawn a hair behind so
  // they don't flicker against each other there.
  const material = (behind: boolean) => (
    <meshPhysicalMaterial
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
    <>
      <mesh ref={ref} geometry={surface.front} castShadow receiveShadow customDepthMaterial={depthMaterial} onClick={handleClick}>
        {material(false)}
      </mesh>
      <mesh geometry={surface.back} castShadow receiveShadow customDepthMaterial={depthMaterial} onClick={handleClick}>
        {material(true)}
      </mesh>
    </>
  );
}
