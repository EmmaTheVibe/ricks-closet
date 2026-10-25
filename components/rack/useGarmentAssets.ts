import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  DoubleSide,
  LinearFilter,
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
  TURN_COLS,
  TURN_ROWS,
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

// Side-profile photos and turn sheets, for the garments that have them (static list).
const SIDE_URLS = SHIRTS.flatMap((s) =>
  [s.side, s.sideLeft, s.turn?.right.src, s.turn?.left.src].filter((u): u is string => Boolean(u)),
);

/** Loads every garment's textures and builds what each one needs to render; disposes on unmount. */
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
        if (!s.side && !s.turn) return null;
        const photo = (url: string) => sideTextures[SIDE_URLS.indexOf(url)];
        // A turn sheet shows one frame at a time from its 4×3 grid.
        const sheet = (url: string) => {
          const texture = photo(url).clone();
          // Set here, not inherited: the clone is made before useTexture's onLoad marks the
          // source sRGB, and as linear data dark fabric would render washed-out grey.
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = anisotropy;
          texture.repeat.set(1 / TURN_COLS, 1 / TURN_ROWS);
          texture.generateMipmaps = false; // mipmaps would bleed neighbouring frames together
          texture.minFilter = LinearFilter;
          texture.needsUpdate = true;
          return texture;
        };
        const turn = s.turn
          ? { sheets: s.turn, right: sheet(s.turn.right.src), left: sheet(s.turn.left.src) }
          : null;
        const photos = s.side ? { right: photo(s.side), left: s.sideLeft ? photo(s.sideLeft) : null } : null;
        const material = new MeshStandardMaterial({
          map: turn?.right ?? photos!.right,
          alphaTest: 0.5,
          side: DoubleSide, // mirrored for garments left of center
          transparent: true,
          roughness: 0.85,
          // Drawn before the 3D front and never occludes it: the front fades over the photo
          // instead of the two fighting over depth as the shirt turns.
          depthWrite: false,
        });
        return { material, photo: turn ? null : photos, turn };
      }),
    [sideTextures, anisotropy],
  );
  useEffect(
    () => () =>
      sideViews.forEach((v) => {
        v?.material.dispose();
        v?.turn?.right.dispose();
        v?.turn?.left.dispose();
      }),
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
