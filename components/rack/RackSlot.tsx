import type { RefObject } from "react";
import type { Group, Material, Mesh, Texture } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { CLICK_SLOP_PX, FLOOR_SHADOW_SIZE, HANGER_DROP, RAIL_Y, SHIRT_HEIGHT, SHIRT_WIDTH } from "./constants";
import type { HangerGeometry } from "./hangers";
import Shirt from "./Shirt";
import type { ShirtSurface } from "./shirtSurface";
import { SIDE_VIEW_ROWS, type SideViewAssets } from "./sideView";

/** The objects in one slot that the rack's frame loop moves and updates. */
export type SlotRefs = {
  slot: Group | null; // slides along the rail
  body: Group | null; // turns with the garment
  front: Mesh | null; // the 3D cloth front
  shadow: Mesh | null;
  sideView: Mesh | null;
};

/** World height of the floor shadows: just above the floor. */
export const FLOOR_Y = 0.002;

export const emptySlotRefs = (): SlotRefs => ({
  slot: null,
  body: null,
  front: null,
  shadow: null,
  sideView: null,
});

type RackSlotProps = {
  index: number;
  slots: RefObject<SlotRefs[]>;
  hook: Mesh["geometry"];
  hanger: HangerGeometry;
  wood: Material;
  metal: Material;
  floorShadow: Material;
  sideView: SideViewAssets | null;
  surface: ShirtSurface;
  texture: Texture;
  weave: Texture;
  fades: RefObject<number[]>;
  onSelect: () => void;
};

/** One garment on the rail: hook, side view, hanger, floor shadow and the shirt itself. */
export default function RackSlot({
  index,
  slots,
  hook,
  hanger,
  wood,
  metal,
  floorShadow,
  sideView,
  surface,
  texture,
  weave,
  fades,
  onSelect,
}: RackSlotProps) {
  const set = (key: keyof SlotRefs) => (el: Group | Mesh | null) => {
    (slots.current[index] as Record<keyof SlotRefs, Group | Mesh | null>)[key] = el;
  };

  const handleSideClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    onSelect();
  };

  return (
    <group ref={set("slot")} position={[0, RAIL_Y, 0]}>
      <mesh geometry={hook} material={metal} castShadow />
      {sideView && (
        <mesh
          ref={set("sideView")}
          position={[0, -HANGER_DROP - SHIRT_HEIGHT / 2, 0]}
          material={sideView.material}
          visible={false}
          renderOrder={-1}
          onClick={handleSideClick}
        >
          <planeGeometry args={[SHIRT_WIDTH, SHIRT_HEIGHT, 1, SIDE_VIEW_ROWS]} />
        </mesh>
      )}
      <group ref={set("body")}>
        {hanger.wood && <mesh geometry={hanger.wood} material={wood} castShadow />}
        {hanger.metal && <mesh geometry={hanger.metal} material={metal} castShadow />}
        <mesh
          ref={set("shadow")}
          position={[0, FLOOR_Y - RAIL_Y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[...FLOOR_SHADOW_SIZE, 1]}
          material={floorShadow}
          renderOrder={-1}
        >
          <planeGeometry />
        </mesh>
        <Shirt
          ref={set("front")}
          surface={surface}
          texture={texture}
          weave={weave}
          fades={fades}
          index={index}
          crossfades={Boolean(sideView)}
          onSelect={onSelect}
        />
      </group>
    </group>
  );
}
