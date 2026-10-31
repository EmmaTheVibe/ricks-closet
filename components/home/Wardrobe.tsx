import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  DoubleSide,
  ExtrudeGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Texture,
} from "three";
import { boxSize, FRAME_HEIGHT, LAYOUTS } from "../accessories/constants";
import WatchBox from "../accessories/WatchBox";
import { WatchView } from "../accessories/watchView";
import {
  CLICK_SLOP_PX,
  FLOOR_SHADOW_OPACITY,
  HANGER_DROP,
  RAIL_RADIUS,
  SHIRT_HEIGHT,
  SHIRT_WIDTH,
} from "../rack/constants";
import { buildHook } from "../rack/hangers";
import { createShadowTexture } from "../rack/textures";
import { SHELF_THICKNESS, VIEW_ANGLE_DEG, WOOD_ROUGHNESS, WOOD_SPECULAR } from "../shoes/constants";
import ShoePair from "../shoes/ShoePair";
import Bag from "./Bag";
import { createBrandMark, createPanelGrain } from "./textures";
import {
  BRAND_ANGLE_DEG,
  BRAND_COLOR,
  BRAND_RAISE,
  BRAND_WIDTH,
  BRASS,
  CLOTHES_PUSH,
  CLOSET_RAIL_Y,
  CLOSET_RAIL_Z,
  CORNICE,
  DOOR_OPEN_DEG,
  DOOR_THICKNESS,
  DOORS_START,
  DOORS_TIME,
  HANG_LAYER,
  HANG_SPACING,
  HOME_SHOE,
  HOME_SIDES,
  HOME_WATCHES,
  INNER_BOTTOM,
  INNER_HALF_WIDTH,
  INNER_TOP,
  INNER_WOOD,
  OUTER_WOOD,
  PANEL,
  PLINTH,
  SHOE_TURN_DEG,
  SHOE_Z,
  SHOES_PUSH,
  SHOES_RAISE,
  SIDE_SHIRTS,
  STEP_TOP,
  STEP_WIDTH,
  WARDROBE_DEPTH,
  WARDROBE_HEIGHT,
  WARDROBE_WIDTH,
  WATCH_FRONT_Z,
  WATCH_TILT_DEG,
  WATCHES_PUSH,
  WATCHES_TIP_DEG,
  type Room,
} from "./constants";

const BACK = 0.01;
const INNER_DEPTH = WARDROBE_DEPTH - BACK;
const STEP_LEFT = INNER_HALF_WIDTH - STEP_WIDTH;
const CUBBY_X = (STEP_LEFT + PANEL + INNER_HALF_WIDTH) / 2;
const DOOR_WIDTH = WARDROBE_WIDTH / 2 - 0.003;
const DOOR_HEIGHT = WARDROBE_HEIGHT - PLINTH - 0.006;
const DOOR_Y = PLINTH + 0.003 + DOOR_HEIGHT / 2;
const DOOR_FRAME = 0.08;
const PULL_Y = 1.1;
const PULL_LENGTH = 0.32;
const ASTRAGAL = 0.024;

const SHOE_SHELF = { column: 0, row: 0, x: 0, y: -SHELF_THICKNESS / 2, length: 0 };
const PAIR_MIDDLE = 0.035;
const { width: BOX_WIDTH, depth: BOX_DEPTH } = boxSize(LAYOUTS.wide);
const TILT = MathUtils.degToRad(WATCH_TILT_DEG);

export const PUSH_TARGETS: Record<Room, { eye: Vector3; look: Vector3 }> = (() => {
  const clothes = {
    eye: new Vector3(0, CLOSET_RAIL_Y - 0.3, CLOSET_RAIL_Z + CLOTHES_PUSH),
    look: new Vector3(0, CLOSET_RAIL_Y - 0.58, CLOSET_RAIL_Z),
  };
  const pair = new Vector3(CUBBY_X, STEP_TOP + 0.08, SHOE_Z + 0.13);
  const side = MathUtils.degToRad(VIEW_ANGLE_DEG);
  const shoes = {
    eye: pair.clone().add(new Vector3(SHOES_PUSH * Math.sin(side), SHOES_RAISE, SHOES_PUSH * Math.cos(side))),
    look: pair,
  };
  const top = new Vector3(0, FRAME_HEIGHT, -BOX_DEPTH / 2).applyAxisAngle(new Vector3(1, 0, 0), TILT);
  const box = new Vector3(CUBBY_X, INNER_BOTTOM, WATCH_FRONT_Z).add(top);
  const normal = new Vector3(0, Math.cos(TILT), Math.sin(TILT));
  const front = new Vector3(0, -Math.sin(TILT), Math.cos(TILT));
  const tip = MathUtils.degToRad(WATCHES_TIP_DEG);
  const watches = {
    eye: box.clone().addScaledVector(normal.multiplyScalar(Math.cos(tip)).addScaledVector(front, Math.sin(tip)), WATCHES_PUSH),
    look: box,
  };
  return { clothes, shoes, watches };
})();

export function progress(t: number, start: number, time: number) {
  const k = MathUtils.clamp((t - start) / time, 0, 1);
  return k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
}

type HotspotProps = {
  room: Room;
  enabled: boolean;
  onHover: (room: Room | null) => void;
  onGo: (room: Room) => void;
  children: ReactNode;
};

function Hotspot({ room, enabled, onHover, onGo, children }: HotspotProps) {
  const gl = useThree((s) => s.gl);
  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (!enabled || e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    onGo(room);
  };
  const pointer = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    gl.domElement.style.cursor = on && enabled ? "pointer" : "";
    if (!on || (enabled && e.pointerType === "mouse")) onHover(on ? room : null);
  };
  return (
    <group onClick={tap} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
      {children}
    </group>
  );
}

function ClosetRail() {
  const gl = useThree((s) => s.gl);
  const textures = useTexture(
    HOME_SIDES,
    (loaded: Texture | Texture[]) => {
      for (const t of [loaded].flat()) {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = gl.capabilities.getMaxAnisotropy();
      }
    },
  );
  const assets = useMemo(
    () => ({
      hook: buildHook(),
      metal: new MeshStandardMaterial({ color: "#c8c8c8", metalness: 1, roughness: 0.3 }),
      photos: textures.map((map) => new MeshStandardMaterial({ map, alphaTest: 0.5, roughness: 0.85, side: DoubleSide })),
    }),
    [textures],
  );
  useEffect(
    () => () => {
      assets.hook.dispose();
      assets.metal.dispose();
      assets.photos.forEach((m) => m.dispose());
    },
    [assets],
  );
  const middle = (SIDE_SHIRTS.length - 1) / 2;

  return (
    <group>
      <mesh position={[0, CLOSET_RAIL_Y, CLOSET_RAIL_Z]} rotation={[0, 0, Math.PI / 2]} material={assets.metal}>
        <cylinderGeometry args={[RAIL_RADIUS, RAIL_RADIUS, 2 * INNER_HALF_WIDTH, 16]} />
      </mesh>
      {SIDE_SHIRTS.map((shirt, i) => (
        <group key={shirt.id} position={[(i - middle) * HANG_SPACING, CLOSET_RAIL_Y, CLOSET_RAIL_Z]}>
          <mesh geometry={assets.hook} material={assets.metal} />
          <mesh
            position={[0, -HANGER_DROP - SHIRT_HEIGHT / 2, -HANG_LAYER * Math.abs(i - middle)]}
            material={assets.photos[i]}
          >
            <planeGeometry args={[SHIRT_WIDTH, SHIRT_HEIGHT]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

type DoorsProps = {
  clock: RefObject<number>;
  wood: { up: MeshPhysicalMaterial; across: MeshPhysicalMaterial };
  brass: MeshStandardMaterial;
};

function Doors({ clock, wood, brass }: DoorsProps) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const brand = useMemo(() => {
    const { texture, aspect } = createBrandMark(BRAND_COLOR);
    return { aspect, material: new MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.4, metalness: 0.3 }) };
  }, []);
  useEffect(
    () => () => {
      brand.material.map?.dispose();
      brand.material.dispose();
    },
    [brand],
  );
  useFrame(() => {
    const angle = progress(clock.current, DOORS_START, DOORS_TIME) * MathUtils.degToRad(DOOR_OPEN_DEG);
    if (left.current) left.current.rotation.y = -angle;
    if (right.current) right.current.rotation.y = angle;
  });

  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? left : right} position={[(side * WARDROBE_WIDTH) / 2, 0, 0]}>
          <group position={[(-side * DOOR_WIDTH) / 2, DOOR_Y, DOOR_THICKNESS / 2]}>
            <mesh material={wood.up}>
              <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS]} />
            </mesh>
            {[-1, 1].map((end) => (
              <group key={end}>
                <mesh position={[(end * (DOOR_WIDTH - DOOR_FRAME)) / 2, 0, DOOR_THICKNESS / 2 + 0.004]} material={wood.up}>
                  <boxGeometry args={[DOOR_FRAME, DOOR_HEIGHT, 0.008]} />
                </mesh>
                <mesh position={[0, (end * (DOOR_HEIGHT - DOOR_FRAME)) / 2, DOOR_THICKNESS / 2 + 0.004]} material={wood.across}>
                  <boxGeometry args={[DOOR_WIDTH - 2 * DOOR_FRAME, DOOR_FRAME, 0.008]} />
                </mesh>
              </group>
            ))}
            {side > 0 && (
              <mesh position={[-(DOOR_WIDTH / 2 + 0.003), 0, DOOR_THICKNESS / 2 + 0.011]} material={wood.up}>
                <boxGeometry args={[ASTRAGAL, DOOR_HEIGHT, 0.006]} />
              </mesh>
            )}
            {side < 0 &&
              [1, -1].map((face) => (
                <mesh
                  key={face}
                  position={[0, BRAND_RAISE, face * (DOOR_THICKNESS / 2 + 0.001)]}
                  rotation={[0, face > 0 ? 0 : Math.PI, MathUtils.degToRad(BRAND_ANGLE_DEG)]}
                  material={brand.material}
                >
                  <planeGeometry args={[BRAND_WIDTH, BRAND_WIDTH / brand.aspect]} />
                </mesh>
              ))}
            <group position={[-side * (DOOR_WIDTH / 2 - DOOR_FRAME / 2), PULL_Y - DOOR_Y, DOOR_THICKNESS / 2 + 0.008]}>
              <mesh position={[0, 0, 0.03]} material={brass}>
                <cylinderGeometry args={[0.007, 0.007, PULL_LENGTH, 12]} />
              </mesh>
              {[-1, 1].map((end) => (
                <mesh
                  key={end}
                  position={[0, (end * (PULL_LENGTH - 0.06)) / 2, 0.015]}
                  rotation={[Math.PI / 2, 0, 0]}
                  material={brass}
                >
                  <cylinderGeometry args={[0.005, 0.005, 0.03, 10]} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

function Board({ at, size, material }: { at: [number, number, number]; size: [number, number, number]; material: MeshPhysicalMaterial }) {
  return (
    <mesh position={at} material={material}>
      <boxGeometry args={size} />
    </mesh>
  );
}

type WardrobeProps = {
  clock: RefObject<number>;
  enabled: boolean;
  onHover: (room: Room | null) => void;
  onGo: (room: Room) => void;
};

export default function Wardrobe({ clock, enabled, onHover, onGo }: WardrobeProps) {
  const gl = useThree((s) => s.gl);
  const [watchView] = useState(() => new WatchView(() => {}));

  const materials = useMemo(() => {
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    const wood = (color: string, across = false) => {
      const grain = createPanelGrain(anisotropy);
      if (across) {
        grain.center.set(0.5, 0.5);
        grain.rotation = Math.PI / 2;
      }
      return new MeshPhysicalMaterial({ color, map: grain, roughness: WOOD_ROUGHNESS, specularIntensity: WOOD_SPECULAR });
    };
    return {
      outer: wood(OUTER_WOOD),
      outerAcross: wood(OUTER_WOOD, true),
      inner: wood(INNER_WOOD),
      innerAcross: wood(INNER_WOOD, true),
      brass: new MeshStandardMaterial({ color: BRASS, metalness: 1, roughness: 0.35 }),
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

  const wedge = useMemo(() => {
    const run = BOX_DEPTH * Math.cos(TILT);
    const rise = BOX_DEPTH * Math.sin(TILT);
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(run, 0);
    shape.lineTo(run, rise);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, { depth: BOX_WIDTH, bevelEnabled: false });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-BOX_WIDTH / 2, 0, 0);
    return geometry;
  }, []);
  useEffect(() => () => wedge.dispose(), [wedge]);

  const goIfEnabled = (room: Room) => () => {
    if (enabled) onGo(room);
  };
  const hotspot = { enabled, onHover, onGo };
  const innerHeight = INNER_TOP - INNER_BOTTOM;

  return (
    <group>
      <mesh
        position={[0, 0.002, -WARDROBE_DEPTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[WARDROBE_WIDTH + 0.4, WARDROBE_DEPTH + 0.5, 1]}
        material={materials.shadow}
        renderOrder={-1}
      >
        <planeGeometry />
      </mesh>

      {[-1, 1].map((side) => (
        <Board
          key={side}
          at={[side * (WARDROBE_WIDTH / 2 - PANEL / 2), WARDROBE_HEIGHT / 2, -WARDROBE_DEPTH / 2]}
          size={[PANEL, WARDROBE_HEIGHT, WARDROBE_DEPTH]}
          material={materials.outer}
        />
      ))}
      <Board
        at={[0, WARDROBE_HEIGHT - PANEL / 2, -WARDROBE_DEPTH / 2]}
        size={[2 * INNER_HALF_WIDTH, PANEL, WARDROBE_DEPTH]}
        material={materials.outerAcross}
      />
      <Board
        at={[0, WARDROBE_HEIGHT + CORNICE / 2, -WARDROBE_DEPTH / 2 + 0.015]}
        size={[WARDROBE_WIDTH + 0.04, CORNICE, WARDROBE_DEPTH + 0.03]}
        material={materials.outerAcross}
      />
      <Board at={[0, PLINTH / 2, -0.03]} size={[2 * INNER_HALF_WIDTH, PLINTH, PANEL]} material={materials.outerAcross} />
      <Board
        at={[0, PLINTH + PANEL / 2, -WARDROBE_DEPTH / 2]}
        size={[2 * INNER_HALF_WIDTH, PANEL, WARDROBE_DEPTH]}
        material={materials.innerAcross}
      />
      <Board
        at={[0, INNER_BOTTOM + innerHeight / 2, -WARDROBE_DEPTH + BACK / 2]}
        size={[2 * INNER_HALF_WIDTH, innerHeight, BACK]}
        material={materials.inner}
      />

      <Board
        at={[STEP_LEFT + STEP_WIDTH / 2, STEP_TOP - PANEL / 2, -INNER_DEPTH / 2]}
        size={[STEP_WIDTH, PANEL, INNER_DEPTH]}
        material={materials.innerAcross}
      />
      <Board
        at={[STEP_LEFT + PANEL / 2, (INNER_BOTTOM + STEP_TOP - PANEL) / 2, -INNER_DEPTH / 2]}
        size={[PANEL, STEP_TOP - PANEL - INNER_BOTTOM, INNER_DEPTH]}
        material={materials.inner}
      />

      <Bag />

      <Doors clock={clock} wood={{ up: materials.outer, across: materials.outerAcross }} brass={materials.brass} />

      <Hotspot room="clothes" {...hotspot}>
        <ClosetRail />
      </Hotspot>

      <Hotspot room="shoes" {...hotspot}>
        <group
          position={[CUBBY_X - PAIR_MIDDLE, STEP_TOP, SHOE_Z]}
          rotation={[0, -MathUtils.degToRad(SHOE_TURN_DEG), 0]}
        >
          <ShoePair
            shoe={HOME_SHOE}
            shelf={SHOE_SHELF}
            lifted={false}
            frontRef={() => {}}
            onSelect={goIfEnabled("shoes")}
            onHover={() => {}}
          />
        </group>
      </Hotspot>

      <Hotspot room="watches" {...hotspot}>
        <group position={[CUBBY_X, INNER_BOTTOM, WATCH_FRONT_Z]}>
          <mesh geometry={wedge} material={materials.innerAcross} />
          <group rotation={[TILT, 0, 0]}>
            <group position={[0, 0, -BOX_DEPTH / 2]}>
              <WatchBox layout={LAYOUTS.wide} view={watchView} images={HOME_WATCHES} onSelect={goIfEnabled("watches")} onHover={() => {}} />
            </group>
          </group>
        </group>
      </Hotspot>
    </group>
  );
}
