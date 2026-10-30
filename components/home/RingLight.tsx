import { useEffect, useMemo } from "react";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Quaternion,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createShadowTexture } from "../rack/textures";
import { SKIRTING_DEPTH, SKIRTING_HEIGHT } from "./constants";

const HUB_Y = 0.6;
const LEG_SPREAD = 0.32;
const BRACE_Y = 0.38;
const COLLAR_Y = 1.15;
const POLE_TOP = 1.42;
const RING_RADIUS = 0.2;
const TUBE = 0.024;
const DOME = 0.6;
const BAND = 2 * (TUBE + 0.003);
const HOUSING_DEPTH = 0.016;
const BOX = { width: 0.12, height: 0.032, depth: 0.03 };
const BOX_Y = -(RING_RADIUS - TUBE) + BOX.height / 2 + 0.004;
const CLAMP = { x: -0.03, y: 0.04, z: 0.022, span: 0.06 };
const RING_Y = POLE_TOP + 0.04 + RING_RADIUS + BAND / 2;
const LEG_ANGLES = [90, 210, 330].map(MathUtils.degToRad);
const CABLE_RADIUS = 0.003;
const ON_FLOOR = CABLE_RADIUS + 0.0005;
const SOCKET = { x: 0.34, y: 0.3, plate: 0.085 };

const up = new Vector3(0, 1, 0);

function housingGeometry() {
  const shape = new Shape().absarc(0, 0, RING_RADIUS + BAND / 2, 0, Math.PI * 2, false);
  shape.holes.push(new Path().absarc(0, 0, RING_RADIUS - BAND / 2, 0, Math.PI * 2, true));
  const bevel = 0.003;
  const geometry = new ExtrudeGeometry(shape, {
    depth: HOUSING_DEPTH - 2 * bevel,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 96,
  });
  geometry.translate(0, 0, -HOUSING_DEPTH + bevel);
  return geometry;
}

function rod(a: Vector3, b: Vector3) {
  const dir = b.clone().sub(a);
  return {
    position: a.clone().add(b).multiplyScalar(0.5).toArray(),
    quaternion: new Quaternion().setFromUnitVectors(up, dir.clone().normalize()).toArray() as [number, number, number, number],
    length: dir.length(),
  };
}

type RingLightProps = {
  x: number;
  z: number;
  wallZ: number;
  turnDeg: number;
};

export default function RingLight({ x, z, wallZ, turnDeg }: RingLightProps) {
  const WALL = wallZ - z;
  const assets = useMemo(() => {
    const feet = LEG_ANGLES.map((a) => new Vector3(Math.cos(a) * LEG_SPREAD, 0, Math.sin(a) * LEG_SPREAD));
    const hub = new Vector3(0, HUB_Y, 0);
    const pole = new Vector3(0, BRACE_Y, 0);
    const skirtingFront = WALL + SKIRTING_DEPTH;
    const route = new CatmullRomCurve3(
      [
        [0.015, RING_Y - RING_RADIUS - BAND / 2, -0.03],
        [0.02, COLLAR_Y, -0.02],
        [0.025, HUB_Y + 0.05, -0.025],
        [0.04, 0.25, -0.05],
        [0.08, 0.05, -0.05],
        [0.14, ON_FLOOR, 0],
        [0.26, ON_FLOOR, 0.09],
        [0.38, ON_FLOOR, 0.04],
        [0.4, ON_FLOOR, -0.15],
        [SOCKET.x + 0.02, ON_FLOOR, -0.3],
        [SOCKET.x, ON_FLOOR, skirtingFront + 0.012],
        [SOCKET.x, SKIRTING_HEIGHT * 0.6, skirtingFront + 0.006],
        [SOCKET.x, SKIRTING_HEIGHT + 0.03, WALL + 0.012],
        [SOCKET.x, SOCKET.y - 0.015, WALL + 0.018],
      ].map(([x, y, z]) => new Vector3(x, y, z)),
    );
    const cable = new CatmullRomCurve3(route.getSpacedPoints(200).map((p) => p.setY(Math.max(p.y, ON_FLOOR))));
    return {
      legs: feet.map((foot) => rod(hub, foot)),
      braces: feet.map((foot) => rod(pole, hub.clone().lerp(foot, 0.45))),
      cable: new TubeGeometry(cable, 240, CABLE_RADIUS, 6, false),
      housing: housingGeometry(),
      tube: new TorusGeometry(RING_RADIUS, TUBE, 32, 160),
      box: new RoundedBoxGeometry(BOX.width, BOX.height, BOX.depth, 4, 0.008),
      gooseneck: new TubeGeometry(
        new CatmullRomCurve3(
          [
            [0.035, BOX_Y + BOX.height / 2 - 0.004, 0.008],
            [0.048, -0.09, 0.014],
            [0.032, -0.035, 0.018],
            [0.0, 0.0, 0.02],
            [CLAMP.x, CLAMP.y - 0.01, CLAMP.z - 0.004],
          ].map(([x, y, z]) => new Vector3(x, y, z)),
        ),
        48,
        0.0035,
        8,
        false,
      ),
      metal: new MeshStandardMaterial({ color: "#1b1b1b", roughness: 0.5, metalness: 0.3 }),
      diffuser: new MeshPhysicalMaterial({
        color: "#f6f5f2",
        roughness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: "#ffffff",
        emissiveIntensity: 0.12,
      }),
      button: new MeshStandardMaterial({ color: "#5c5c5c", roughness: 0.4 }),
      plate: new MeshStandardMaterial({ color: "#f4f1ec", roughness: 0.4 }),
      shadow: new MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [WALL]);
  useEffect(
    () => () => {
      assets.cable.dispose();
      [assets.housing, assets.tube, assets.box, assets.gooseneck].forEach((g) => g.dispose());
      [assets.metal, assets.diffuser, assets.button].forEach((m) => m.dispose());
      assets.plate.dispose();
      assets.shadow.map?.dispose();
      assets.shadow.dispose();
    },
    [assets],
  );
  const { metal } = assets;

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[LEG_SPREAD * 2.4, LEG_SPREAD * 2.4, 1]}
        material={assets.shadow}
        renderOrder={-1}
      >
        <planeGeometry />
      </mesh>

      {[...assets.legs, ...assets.braces].map((r, i) => (
        <mesh key={i} position={r.position} quaternion={r.quaternion} material={metal}>
          <cylinderGeometry args={[i < 3 ? 0.008 : 0.005, i < 3 ? 0.008 : 0.005, r.length, 8]} />
        </mesh>
      ))}
      <mesh position={[0, (BRACE_Y - 0.05 + COLLAR_Y) / 2, 0]} material={metal}>
        <cylinderGeometry args={[0.013, 0.013, COLLAR_Y - BRACE_Y + 0.05, 12]} />
      </mesh>
      <mesh position={[0, (COLLAR_Y + POLE_TOP) / 2, 0]} material={metal}>
        <cylinderGeometry args={[0.009, 0.009, POLE_TOP - COLLAR_Y, 12]} />
      </mesh>
      {[
        [HUB_Y, 0.024, 0.07],
        [BRACE_Y, 0.02, 0.04],
        [COLLAR_Y, 0.02, 0.045],
      ].map(([y, r, h]) => (
        <mesh key={y} position={[0, y, 0]} material={metal}>
          <cylinderGeometry args={[r, r, h, 12]} />
        </mesh>
      ))}
      <mesh geometry={assets.cable} material={metal} />
      <mesh position={[SOCKET.x, SOCKET.y, WALL + 0.004]} material={assets.plate}>
        <boxGeometry args={[SOCKET.plate, SOCKET.plate, 0.008]} />
      </mesh>
      <mesh position={[SOCKET.x, SOCKET.y, WALL + 0.008 + 0.0125]} material={metal}>
        <boxGeometry args={[0.035, 0.045, 0.025]} />
      </mesh>

      <group position={[0, RING_Y, 0]} rotation={[0, MathUtils.degToRad(turnDeg), 0]}>
        <mesh position={[0, -RING_RADIUS - BAND / 2 - 0.02, -HOUSING_DEPTH / 2]} material={metal}>
          <boxGeometry args={[0.04, 0.05, 0.04]} />
        </mesh>
        <mesh geometry={assets.housing} material={metal} />
        <mesh geometry={assets.tube} scale={[1, 1, DOME]} material={assets.diffuser} />

        <mesh geometry={assets.box} position={[0, BOX_Y, 0.004]} material={metal} />
        {[-0.03, -0.01, 0.01, 0.03].map((x) => (
          <mesh key={x} position={[x, BOX_Y, 0.004 + BOX.depth / 2 + 0.001]} rotation={[Math.PI / 2, 0, 0]} material={assets.button}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.002, 12]} />
          </mesh>
        ))}
        <mesh geometry={assets.gooseneck} material={metal} />

        <mesh position={[CLAMP.x, CLAMP.y, CLAMP.z]} material={metal}>
          <boxGeometry args={[CLAMP.span, 0.04, 0.008]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[CLAMP.x + side * (CLAMP.span / 2 + 0.004), CLAMP.y, CLAMP.z + 0.008]}>
            <mesh material={metal}>
              <boxGeometry args={[0.008, 0.03, 0.022]} />
            </mesh>
            <mesh position={[-side * 0.005, 0, 0.009]} material={metal}>
              <boxGeometry args={[0.006, 0.03, 0.004]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
