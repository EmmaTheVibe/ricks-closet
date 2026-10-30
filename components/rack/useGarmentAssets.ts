import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
} from "three";
import { alphaMask } from "./cloth/ClothSim";
import {
  FLOOR_SHADOW_OPACITY,
  GRID_COLS,
  GRID_COLS_MOBILE,
  GRID_ROWS,
  GRID_ROWS_MOBILE,
} from "./constants";
import { SHIRTS } from "./shirts";
import { ShirtSurface } from "./shirtSurface";
import type { SideViewAssets } from "./sideView";
import { createShadowTexture, createWeaveTexture } from "./textures";

function pickGrid() {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches
    ? { cols: GRID_COLS_MOBILE, rows: GRID_ROWS_MOBILE }
    : { cols: GRID_COLS, rows: GRID_ROWS };
}

const SIDE_URLS = SHIRTS.flatMap((s) => [s.side, s.sideLeft].filter((u): u is string => Boolean(u)));

export function useGarmentAssets() {
  const gl = useThree((s) => s.gl);
  const anisotropy = gl.capabilities.getMaxAnisotropy();
  const prepare = (loaded: Texture | Texture[]) => {
    for (const t of [loaded].flat()) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = anisotropy;
    }
  };
  const textures = useTexture(
    SHIRTS.map((s) => s.texture),
    prepare,
  );
  const sideTextures = useTexture(SIDE_URLS, prepare);

  const sideViews = useMemo(
    () =>
      SHIRTS.map((s): SideViewAssets | null => {
        if (!s.side) return null;
        const photo = (url: string) => sideTextures[SIDE_URLS.indexOf(url)];
        const photos = { right: photo(s.side), left: s.sideLeft ? photo(s.sideLeft) : null };
        const material = new MeshStandardMaterial({
          map: photos.right,
          alphaTest: 0.5,
          side: DoubleSide,
          transparent: true,
          roughness: 0.85,
          depthWrite: false,
        });
        return { material, photo: photos };
      }),
    [sideTextures],
  );
  useEffect(
    () => () =>
      sideViews.forEach((v) => v?.material.dispose()),
    [sideViews],
  );

  const [grid] = useState(pickGrid);
  const surfaces = useMemo(
    () => textures.map((texture) => new ShirtSurface(grid.cols, grid.rows, alphaMask(texture))),
    [grid, textures],
  );
  useEffect(() => () => surfaces.forEach((s) => s.dispose()), [surfaces]);

  const weave = useMemo(() => createWeaveTexture(anisotropy), [anisotropy]);
  useEffect(() => () => weave.dispose(), [weave]);

  const floorShadow = useMemo(
    () =>
      new MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        opacity: FLOOR_SHADOW_OPACITY,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      floorShadow.map?.dispose();
      floorShadow.dispose();
    },
    [floorShadow],
  );

  return { textures, sideViews, grid, surfaces, weave, floorShadow };
}
