import { useEffect, useMemo } from "react";
import { ExtrudeGeometry, MathUtils, MeshPhysicalMaterial, MeshStandardMaterial, Path, Shape, ShapeGeometry, DoubleSide } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { timed } from "../rack/timing";
import {
  BOX_HEIGHT,
  boxSize,
  CHAMFER,
  COMPARTMENT,
  CUSHION_COLOR,
  CUSHION_DEPTH,
  CUSHION_HEIGHT,
  CUSHION_RADIUS,
  CUSHION_WIDTH,
  CUSHION_TOP,
  FLOOR,
  FRAME_COLOR,
  FRAME_HEIGHT,
  LEATHER_COLOR,
  LID_LINER,
  LID_OPEN_DEG,
  LID_PLATE,
  LID_THICKNESS,
  METAL_COLOR,
  SUEDE_COLOR,
  WALL,
  slotCentre,
  type BoxLayout,
} from "./constants";
import { createLeatherGrain, createLidLining, createSuedeNap } from "./textures";
import WatchOnCushion from "./WatchOnCushion";
import type { WatchView } from "./watchView";
import { WATCHES } from "./watches";

function clipped<T extends Shape | Path>(into: T, w: number, h: number, c: number, cx = 0, cy = 0) {
  const x = w / 2;
  const y = h / 2;
  into.moveTo(cx - x + c, cy - y);
  into.lineTo(cx + x - c, cy - y);
  into.lineTo(cx + x, cy - y + c);
  into.lineTo(cx + x, cy + y - c);
  into.lineTo(cx + x - c, cy + y);
  into.lineTo(cx - x + c, cy + y);
  into.lineTo(cx - x, cy + y - c);
  into.lineTo(cx - x, cy - y + c);
  into.closePath();
  return into;
}

function standUp(shape: Shape, height: number, bevel = 0.003) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: height - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

type WatchBoxProps = {
  layout: BoxLayout;
  view: WatchView;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
};

export default function WatchBox({ layout, view, onSelect, onHover }: WatchBoxProps) {
  const { width, depth } = boxSize(layout);

  const materials = useMemo(() => {
    const leather = timed("leather texture", createLeatherGrain);
    const suede = timed("suede texture", createSuedeNap);
    return {
      leather: new MeshPhysicalMaterial({
        color: LEATHER_COLOR,
        roughness: 0.75,
        specularIntensity: 0.35,
        bumpMap: leather,
        bumpScale: 0.45,
      }),
      frame: new MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.9, bumpMap: suede, bumpScale: 0.6 }),
      suede: new MeshStandardMaterial({ color: SUEDE_COLOR, roughness: 1, bumpMap: suede, bumpScale: 0.8, side: DoubleSide }),
      cushion: new MeshStandardMaterial({ color: CUSHION_COLOR, roughness: 1, bumpMap: suede, bumpScale: 0.8 }),
      metal: new MeshStandardMaterial({ color: METAL_COLOR, metalness: 1, roughness: 0.25 }),
    };
  }, []);
  useEffect(
    () => () => {
      materials.leather.bumpMap?.dispose();
      materials.frame.bumpMap?.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    },
    [materials],
  );

  const lidLining = useMemo(() => {
    const innerW = width - 2 * WALL;
    const innerD = depth - 2 * WALL;
    const map = timed("lid lining texture", () => createLidLining(innerW, innerD, SUEDE_COLOR));
    map.repeat.set(1 / innerW, 1 / innerD);
    map.offset.set(0.5, 0.5);
    return new MeshStandardMaterial({ map, roughness: 0.9, bumpMap: materials.suede.bumpMap, bumpScale: 0.5 });
  }, [width, depth, materials]);
  useEffect(
    () => () => {
      lidLining.map?.dispose();
      lidLining.dispose();
    },
    [lidLining],
  );

  const geometries = useMemo(() => {
    const innerW = width - 2 * WALL;
    const innerD = depth - 2 * WALL;
    const slots: { x: number; z: number }[] = [];
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) slots.push(slotCentre(layout, col, row));
    }

    const walls = clipped(new Shape(), width, depth, CHAMFER);
    walls.holes.push(clipped(new Path(), innerW, innerD, CHAMFER * 0.55));
    const frame = clipped(new Shape(), innerW + 0.002, innerD + 0.002, CHAMFER * 0.55);
    for (const s of slots) frame.holes.push(clipped(new Path(), COMPARTMENT.width, COMPARTMENT.depth, 0.008, s.x, -s.z));
    const floor = new ShapeGeometry(clipped(new Shape(), innerW, innerD, CHAMFER * 0.55));
    floor.rotateX(-Math.PI / 2);
    floor.translate(0, FLOOR + 0.0005, 0);

    const recess = LID_THICKNESS - LID_PLATE;
    const lidWallsShape = clipped(new Shape(), width, depth, CHAMFER);
    lidWallsShape.holes.push(clipped(new Path(), innerW, innerD, CHAMFER * 0.55));
    const lidWalls = standUp(lidWallsShape, LID_THICKNESS, 0.004);
    lidWalls.translate(0, 0, depth / 2);
    const lidTop = standUp(clipped(new Shape(), width, depth, CHAMFER), LID_PLATE, 0.004);
    lidTop.translate(0, recess, depth / 2);
    const linerShape = clipped(new Shape(), innerW + 0.001, innerD + 0.001, CHAMFER * 0.55);
    linerShape.holes.push(clipped(new Path(), innerW - 2 * LID_LINER, innerD - 2 * LID_LINER, CHAMFER * 0.5));
    const lidLiner = standUp(linerShape, recess, 0);
    lidLiner.translate(0, 0, depth / 2);
    const lining = new ShapeGeometry(clipped(new Shape(), innerW, innerD, CHAMFER * 0.55));
    lining.rotateX(Math.PI / 2);
    lining.translate(0, recess - 0.0005, depth / 2);

    return {
      base: standUp(clipped(new Shape(), width, depth, CHAMFER), FLOOR, 0.002),
      walls: standUp(walls, BOX_HEIGHT, 0.004),
      frame: standUp(frame, FRAME_HEIGHT, 0.004),
      floor,
      lidWalls,
      lidTop,
      lidLiner,
      lining,
      cushion: new RoundedBoxGeometry(CUSHION_WIDTH, CUSHION_HEIGHT, CUSHION_DEPTH, 5, CUSHION_RADIUS),
      slots,
    };
  }, [width, depth, layout]);
  useEffect(
    () => () => Object.values(geometries).forEach((g) => !Array.isArray(g) && g.dispose()),
    [geometries],
  );

  return (
    <group>
      <mesh geometry={geometries.base} material={materials.leather} castShadow receiveShadow />
      <mesh geometry={geometries.walls} material={materials.leather} castShadow receiveShadow />
      <mesh geometry={geometries.floor} material={materials.suede} receiveShadow />
      <mesh geometry={geometries.frame} material={materials.frame} castShadow receiveShadow />
      {geometries.slots.map((s) => (
        <mesh
          key={`${s.x}-${s.z}`}
          geometry={geometries.cushion}
          material={materials.cushion}
          position={[s.x, CUSHION_TOP - CUSHION_HEIGHT / 2, s.z]}
          castShadow
          receiveShadow
        />
      ))}
      {WATCHES.slice(0, geometries.slots.length).map((watch, i) => (
        <WatchOnCushion
          key={watch.id}
          watch={watch}
          index={i}
          x={geometries.slots[i].x}
          z={geometries.slots[i].z}
          view={view}
          onSelect={() => onSelect(i)}
          onHover={(over) => onHover(over ? i : -1)}
        />
      ))}
      <mesh position={[0, BOX_HEIGHT - 0.014, depth / 2 + 0.002]} material={materials.metal} castShadow>
        <boxGeometry args={[0.034, 0.012, 0.006]} />
      </mesh>
      <group position={[0, BOX_HEIGHT, -depth / 2]} rotation={[-MathUtils.degToRad(LID_OPEN_DEG), 0, 0]}>
        <mesh geometry={geometries.lidWalls} material={materials.leather} castShadow receiveShadow />
        <mesh geometry={geometries.lidTop} material={materials.leather} castShadow receiveShadow />
        <mesh geometry={geometries.lidLiner} material={materials.suede} receiveShadow />
        <mesh geometry={geometries.lining} material={lidLining} receiveShadow />
      </group>
    </group>
  );
}
