import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshPhysicalMaterial } from "three";
import { createWoodGrain } from "../rack/textures";
import ShoePair from "./ShoePair";
import type { ShoeView } from "./shoeView";
import { SHOES } from "./shoes";
import {
  COLUMN_PITCH,
  COLUMN_STAGGER,
  COLUMNS,
  FIRST_SHELF_Y,
  ROWS,
  SHELF_DEPTH,
  SHELF_LENGTH,
  SHELF_LENGTH_VARIATION,
  SHELF_NUDGE,
  SHELF_STEP,
  SHELF_THICKNESS,
  WOOD_COLOR,
  WOOD_SPECULAR,
  WOOD_ROUGHNESS,
} from "./constants";

export type Shelf = { column: number; row: number; x: number; y: number; length: number };

/**
 * Where every shelf goes: COLUMNS columns of ROWS shelves, each column raised by its own share of
 * a step (COLUMN_STAGGER), with small fixed variations in length and position so the wall looks
 * hung by hand, and is the same on every visit.
 */
export function shelfLayout(): Shelf[] {
  const shelves: Shelf[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    for (let row = 0; row < ROWS; row++) {
      const k = column * ROWS + row;
      shelves.push({
        column,
        row,
        x: (column - (COLUMNS - 1) / 2) * COLUMN_PITCH + Math.sin(k * 1.7 + 0.4) * SHELF_NUDGE,
        y: FIRST_SHELF_Y + (row + COLUMN_STAGGER[column % COLUMN_STAGGER.length]) * SHELF_STEP,
        length: SHELF_LENGTH + Math.sin(k * 2.3 + 1.1) * SHELF_LENGTH_VARIATION,
      });
    }
  }
  return shelves;
}

const SHELVES = shelfLayout();
// Shoes fill the shelves from the top of the wall down, left to right along each level, so the
// first pairs are the ones seen first. Changing the wall's size never loses a shoe.
const SHELVES_IN_ORDER = [...SHELVES].sort((a, b) => b.y - a.y || a.x - b.x);

/** A fixed shuffle (seeded), so filler shelves look random but are the same on every visit. */
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

/**
 * What stands where: the catalog in order on the top shelves, then shuffled rounds of the same
 * shoes on any shelves left over, so the wall is always full. `shoe` indexes SHOES.
 */
export const WALL_SLOTS = SHELVES_IN_ORDER.map((shelf, i) => {
  const round = Math.floor(i / SHOES.length);
  const order = round === 0 ? SHOES.map((_, k) => k) : shuffled(SHOES.map((_, k) => k), round * 7919);
  return { shelf, shoe: order[i % SHOES.length] };
});

/** The floating shelves, in deep brown wood, and the shoes on them; the wall is the scene's plain background. */
type ShoeWallProps = {
  view: ShoeView;
  /** The wall slot being viewed (its shoe off the shelf), or -1. See WALL_SLOTS. */
  viewing: number;
  onSelect: (index: number) => void;
  /** The wall slot under the mouse, or -1. */
  onHover: (index: number) => void;
};

export default function ShoeWall({ view, viewing, onSelect, onHover }: ShoeWallProps) {
  const gl = useThree((s) => s.gl);

  const materials = useMemo(() => {
    const grain = createWoodGrain(gl.capabilities.getMaxAnisotropy());
    grain.repeat.set(2, 1);
    return {
      wood: new MeshPhysicalMaterial({
        color: WOOD_COLOR,
        map: grain,
        roughness: WOOD_ROUGHNESS,
        specularIntensity: WOOD_SPECULAR,
      }),
    };
  }, [gl]);
  useEffect(
    () => () => {
      materials.wood.map?.dispose();
      materials.wood.dispose();
    },
    [materials],
  );

  return (
    <group>
      {SHELVES.map((shelf) => (
        <mesh
          key={`${shelf.column}-${shelf.row}`}
          position={[shelf.x, shelf.y, SHELF_DEPTH / 2]}
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
