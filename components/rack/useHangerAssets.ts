import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshStandardMaterial, type Texture } from "three";
import { alphaMask } from "./cloth/ClothSim";
import { HANGER_WOOD_COLOR } from "./constants";
import { buildHangerBody, buildHook } from "./hangers";
import { SHIRTS } from "./shirts";
import { createWoodGrain } from "./textures";

/** Hook, per-garment hanger shapes and their materials; disposes on unmount. */
export function useHangerAssets(textures: Texture[]) {
  const gl = useThree((s) => s.gl);

  const hook = useMemo(() => buildHook(), []);
  const bodies = useMemo(
    () => textures.map((t, i) => buildHangerBody(alphaMask(t), SHIRTS[i].kind ?? "shirt")),
    [textures],
  );
  useEffect(
    () => () =>
      bodies.forEach((h) => {
        h.wood?.dispose();
        h.metal?.dispose();
      }),
    [bodies],
  );

  const metal = useMemo(() => new MeshStandardMaterial({ color: "#c8c8c8", metalness: 1, roughness: 0.3 }), []);
  useEffect(
    () => () => {
      hook.dispose();
      metal.dispose();
    },
    [hook, metal],
  );

  const wood = useMemo(
    () =>
      new MeshStandardMaterial({
        color: HANGER_WOOD_COLOR,
        map: createWoodGrain(gl.capabilities.getMaxAnisotropy()),
        roughness: 0.5,
      }),
    [gl],
  );
  useEffect(
    () => () => {
      wood.map?.dispose();
      wood.dispose();
    },
    [wood],
  );

  return { hook, bodies, metal, wood };
}
