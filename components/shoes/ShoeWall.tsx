import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshBasicMaterial, MeshPhysicalMaterial } from "three";
import { createPanelGrain } from "../home/textures";
import { FLOOR_SHADOW_OPACITY } from "../rack/constants";
import { createShadowTexture, createWoodGrain } from "../rack/textures";
import ShoePair from "./ShoePair";
import type { ShoeView } from "./shoeView";
import { SHOES } from "./shoes";
import {
  CASE_BACK,
  CASE_BASE,
  CASE_DEPTH,
  CASE_PANEL,
  caseTop,
  caseWidth,
  COLUMN_PITCH,
  COLUMN_STAGGER,
  COLUMNS,
  FIRST_SHELF_Y,
  ROWS,
  SHELF_DEPTH,
  SHELF_LENGTH,
  SHELF_STEP,
  SHELF_THICKNESS,
  WOOD_COLOR,
  WOOD_SPECULAR,
  WOOD_ROUGHNESS,
} from "./constants";

export type Shelf = { column: number; row: number; x: number; y: number; length: number };

export function shelfLayout(): Shelf[] {
  const shelves: Shelf[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    for (let row = 0; row < ROWS; row++) {
      shelves.push({
        column,
        row,
        x: (column - (COLUMNS - 1) / 2) * COLUMN_PITCH,
        y: FIRST_SHELF_Y + (row + COLUMN_STAGGER[column % COLUMN_STAGGER.length]) * SHELF_STEP,
        length: SHELF_LENGTH,
      });
    }
  }
  return shelves;
}

const SHELVES = shelfLayout();
const SHELVES_IN_ORDER = [...SHELVES].sort((a, b) => b.y - a.y || a.x - b.x);

function shuffled<T>(items: T[], seed: number) {
  const out = [...items];
  let s = seed;
  const next = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const WALL_SLOTS = SHELVES_IN_ORDER.map((shelf, i) => {
  const round = Math.floor(i / SHOES.length);
  const order = round === 0 ? SHOES.map((_, k) => k) : shuffled(SHOES.map((_, k) => k), round * 7919);
  return { shelf, shoe: order[i % SHOES.length] };
});

type ShoeWallProps = {
  view: ShoeView;
  viewing: number;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
};

export default function ShoeWall({ view, viewing, onSelect, onHover }: ShoeWallProps) {
  const gl = useThree((s) => s.gl);

  const materials = useMemo(() => {
    const grain = createWoodGrain(gl.capabilities.getMaxAnisotropy());
    grain.repeat.set(2, 1);
    const panel = (across: boolean) => {
      const map = createPanelGrain(gl.capabilities.getMaxAnisotropy());
      if (across) {
        map.center.set(0.5, 0.5);
        map.rotation = Math.PI / 2;
      }
      return new MeshPhysicalMaterial({ color: WOOD_COLOR, map, roughness: WOOD_ROUGHNESS, specularIntensity: WOOD_SPECULAR });
    };
    return {
      wood: new MeshPhysicalMaterial({
        color: WOOD_COLOR,
        map: grain,
        roughness: WOOD_ROUGHNESS,
        specularIntensity: WOOD_SPECULAR,
      }),
      caseUp: panel(false),
      caseAcross: panel(true),
      shadow: new MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        opacity: FLOOR_SHADOW_OPACITY,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [gl]);
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );

  const width = caseWidth();
  const top = caseTop();
  const inside = { bottom: CASE_BASE + CASE_PANEL, top: top - CASE_PANEL };
  const board = (key: string, at: [number, number, number], size: [number, number, number], up: boolean) => (
    <mesh key={key} position={at} material={up ? materials.caseUp : materials.caseAcross}>
      <boxGeometry args={size} />
    </mesh>
  );

  return (
    <group>
      <mesh
        position={[0, 0.002, CASE_DEPTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[width + 0.4, CASE_DEPTH + 0.5, 1]}
        material={materials.shadow}
        renderOrder={-1}
      >
        <planeGeometry />
      </mesh>
      {[-1, 1].map((side) =>
        board(`side${side}`, [(side * (width - CASE_PANEL)) / 2, top / 2, CASE_DEPTH / 2], [CASE_PANEL, top, CASE_DEPTH], true),
      )}
      {board("top", [0, top - CASE_PANEL / 2, CASE_DEPTH / 2], [width, CASE_PANEL, CASE_DEPTH], false)}
      {board("bottom", [0, CASE_BASE + CASE_PANEL / 2, CASE_DEPTH / 2], [width - 2 * CASE_PANEL, CASE_PANEL, CASE_DEPTH], false)}
      {board("plinth", [0, CASE_BASE / 2, CASE_DEPTH - 0.03], [width - 2 * CASE_PANEL, CASE_BASE, CASE_PANEL], false)}
      {board(
        "back",
        [0, (inside.bottom + inside.top) / 2, CASE_BACK / 2],
        [width - 2 * CASE_PANEL, inside.top - inside.bottom, CASE_BACK],
        true,
      )}
      {Array.from({ length: COLUMNS - 1 }, (_, i) =>
        board(
          `divider${i}`,
          [(i + 1 - COLUMNS / 2) * COLUMN_PITCH, (inside.bottom + inside.top) / 2, CASE_DEPTH / 2],
          [CASE_PANEL, inside.top - inside.bottom, CASE_DEPTH],
          true,
        ),
      )}

      {SHELVES.map((shelf) => (
        <mesh
          key={`${shelf.column}-${shelf.row}`}
          position={[shelf.x, shelf.y, CASE_BACK + SHELF_DEPTH / 2]}
          material={materials.wood}
        >
          <boxGeometry args={[shelf.length, SHELF_THICKNESS, SHELF_DEPTH]} />
        </mesh>
      ))}
      {WALL_SLOTS.map((slot, i) => (
        <ShoePair
          key={i}
          shoe={SHOES[slot.shoe]}
          shelf={slot.shelf}
          lifted={viewing === i}
          frontRef={(group) => view.register(i, group)}
          onSelect={() => onSelect(i)}
          onHover={(over) => onHover(over ? i : -1)}
        />
      ))}
    </group>
  );
}
