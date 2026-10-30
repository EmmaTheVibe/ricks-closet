import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  SRGBColorSpace,
} from "three";
import { BRASS, SKIRTING_COLOR } from "./constants";

const PANEL_WIDTH = 0.65;
const PANEL_GAP = 0.13;
const PANELS_PER_SIDE = 4;
const LOWER = { bottom: 0.22, top: 0.72 };
const UPPER = { bottom: 0.86, top: 2.3 };
const TRIM = 0.024;
const TRIM_DEPTH = 0.01;
const SCONCE_Y = 1.72;
const SHADE = { top: 0.05, bottom: 0.08, height: 0.13 };
const SHADE_Y = 0.02;
const ARM = 0.11;
const GLOW_SIZE: [number, number] = [0.85, 1.1];

function frameGeometry(w: number, h: number) {
  const shape = new Shape();
  shape.moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2).lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2).closePath();
  const hole = new Path();
  const iw = w / 2 - TRIM;
  const ih = h / 2 - TRIM;
  hole.moveTo(-iw, -ih).lineTo(-iw, ih).lineTo(iw, ih).lineTo(iw, -ih).closePath();
  shape.holes.push(hole);
  const bevel = 0.004;
  return new ExtrudeGeometry(shape, {
    depth: TRIM_DEPTH - bevel,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
  });
}

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,214,158,0.7)");
  g.addColorStop(0.35, "rgba(255,212,156,0.28)");
  g.addColorStop(1, "rgba(255,210,150,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export type WallDecorLayout = {
  clear: number;
  sconcePanel?: number;
};

export default function WallDecor({ clear, sconcePanel }: WallDecorLayout) {
  const assets = useMemo(
    () => ({
      lower: frameGeometry(PANEL_WIDTH, LOWER.top - LOWER.bottom),
      upper: frameGeometry(PANEL_WIDTH, UPPER.top - UPPER.bottom),
      trim: new MeshStandardMaterial({ color: SKIRTING_COLOR, roughness: 0.6 }),
      brass: new MeshStandardMaterial({ color: BRASS, metalness: 1, roughness: 0.3 }),
      glass: new MeshPhysicalMaterial({
        color: "#f0cf9c",
        emissive: "#ffb766",
        emissiveIntensity: 0.55,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        side: DoubleSide,
      }),
      bulb: new MeshBasicMaterial({ color: "#fff2d2", toneMapped: false }),
      glow: new MeshBasicMaterial({ map: createGlowTexture(), transparent: true, depthWrite: false, toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      assets.lower.dispose();
      assets.upper.dispose();
      [assets.trim, assets.brass, assets.glass, assets.bulb, assets.glow].forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [assets],
  );

  const panelX = (i: number) => clear + PANEL_WIDTH / 2 + i * (PANEL_WIDTH + PANEL_GAP);
  const panelXs = [-1, 1].flatMap((side) => Array.from({ length: PANELS_PER_SIDE }, (_, i) => side * panelX(i)));

  return (
    <group>
      {panelXs.map((x) => (
        <group key={x}>
          <mesh geometry={assets.lower} position={[x, (LOWER.bottom + LOWER.top) / 2, 0]} material={assets.trim} />
          <mesh geometry={assets.upper} position={[x, (UPPER.bottom + UPPER.top) / 2, 0]} material={assets.trim} />
        </group>
      ))}

      {sconcePanel !== undefined &&
        [-1, 1].map((side) => (
          <group key={side} position={[side * panelX(sconcePanel), SCONCE_Y, 0]}>
            <mesh position={[0, 0, 0.002]} scale={[...GLOW_SIZE, 1]} material={assets.glow} renderOrder={-1}>
              <planeGeometry />
            </mesh>
            <mesh position={[0, -0.03, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={assets.brass}>
              <cylinderGeometry args={[0.04, 0.04, 0.012, 24]} />
            </mesh>
            <mesh position={[0, -0.03, ARM / 2]} rotation={[Math.PI / 2, 0, 0]} material={assets.brass}>
              <cylinderGeometry args={[0.006, 0.006, ARM, 10]} />
            </mesh>
            <mesh position={[0, -0.03, ARM]} material={assets.brass}>
              <cylinderGeometry args={[0.008, 0.008, 0.05, 10]} />
            </mesh>
            <mesh position={[0, SHADE_Y - 0.005, ARM]} material={assets.bulb}>
              <sphereGeometry args={[0.024, 20, 14]} />
            </mesh>
            <mesh position={[0, SHADE_Y, ARM]} material={assets.glass} renderOrder={1}>
              <cylinderGeometry args={[SHADE.top, SHADE.bottom, SHADE.height, 40, 1, true]} />
            </mesh>
            {[
              [SHADE_Y + SHADE.height / 2, SHADE.top],
              [SHADE_Y - SHADE.height / 2, SHADE.bottom],
            ].map(([y, r]) => (
              <mesh key={y} position={[0, y, ARM]} rotation={[Math.PI / 2, 0, 0]} material={assets.brass}>
                <torusGeometry args={[r, 0.003, 8, 40]} />
              </mesh>
            ))}
          </group>
        ))}
    </group>
  );
}
