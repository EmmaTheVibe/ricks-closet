import { useEffect, useMemo } from "react";
import {
  BackSide,
  CatmullRomCurve3,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
  type BufferAttribute,
} from "three";
import { createShadowTexture } from "../rack/textures";
import {
  BAG_PAPER,
  BAG_RIBBON,
  BAG_SIZE,
  BAG_TISSUE,
  BAG_TURN_DEG,
  BAG_X,
  BAG_Z,
  BRAND_COLOR,
  INNER_BOTTOM,
} from "./constants";
import { createBagPrint } from "./textures";

const { width: W, height: H, depth: D } = BAG_SIZE;
const PX_PER_METRE = 1800;
const INSIDE = "#1e140e";
const PAPER = 0.003;
const HANDLE_SPAN = 0.11;
const HANDLE_RISE = 0.1;
const RIBBON = { width: 0.012, thickness: 0.002 };
const TISSUE = [
  [-0.06, -0.25, 0.3, 0.1],
  [0.03, 0.15, -0.2, 0.12],
  [0.08, 0.35, 0.5, 0.08],
] as const;

function handleGeometry() {
  const curve = new CatmullRomCurve3([
    new Vector3(-HANDLE_SPAN / 2, -0.03, 0),
    new Vector3(-HANDLE_SPAN / 2, 0.02, 0),
    new Vector3(-HANDLE_SPAN * 0.3, HANDLE_RISE * 0.85, 0),
    new Vector3(0, HANDLE_RISE, 0),
    new Vector3(HANDLE_SPAN * 0.3, HANDLE_RISE * 0.85, 0),
    new Vector3(HANDLE_SPAN / 2, 0.02, 0),
    new Vector3(HANDLE_SPAN / 2, -0.03, 0),
  ]);
  return new TubeGeometry(curve, 40, RIBBON.width / 2, 8, false);
}

function tissueGeometry(height: number, seed: number) {
  const geometry = new PlaneGeometry(0.16, height, 8, 6);
  geometry.translate(0, height / 2, 0);
  const position = geometry.getAttribute("position") as BufferAttribute;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < position.count; i++) {
    const up = position.getY(i) / height;
    position.setZ(i, (rand() - 0.5) * 0.03 * up + Math.sin(position.getX(i) * 40) * 0.006);
    position.setY(i, position.getY(i) - rand() * 0.012 * up);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default function Bag() {
  const assets = useMemo(() => {
    const print = createBagPrint(BAG_SIZE, BAG_PAPER, BRAND_COLOR, PX_PER_METRE);
    const paper = (map: typeof print.front) => new MeshStandardMaterial({ map, roughness: 0.75 });
    const front = paper(print.front);
    const side = paper(print.side);
    const inside = new MeshStandardMaterial({ color: INSIDE, roughness: 1, side: BackSide });
    const open = new MeshBasicMaterial({ visible: false });
    const ribbon = new MeshStandardMaterial({ color: BAG_RIBBON, roughness: 0.35, metalness: 0.1 });
    const tissue = new MeshStandardMaterial({ color: BAG_TISSUE, roughness: 0.95, side: DoubleSide });
    const shadow = new MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false,
    });
    const handle = handleGeometry();
    const sheets = TISSUE.map(([, , , height], i) => tissueGeometry(height, 61 + i * 7));
    return {
      body: [side, side, open, side, front, front],
      inside,
      ribbon,
      tissue,
      shadow,
      handle,
      sheets,
      dispose: () => {
        print.front.dispose();
        print.side.dispose();
        shadow.map?.dispose();
        [front, side, inside, open, ribbon, tissue, shadow].forEach((m) => m.dispose());
        handle.dispose();
        sheets.forEach((g) => g.dispose());
      },
    };
  }, []);
  useEffect(() => () => assets.dispose(), [assets]);

  return (
    <group position={[BAG_X, INNER_BOTTOM, BAG_Z]} rotation={[0, (BAG_TURN_DEG * Math.PI) / 180, 0]}>
      <mesh
        position={[0, 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[W * 1.5, D * 2.2, 1]}
        material={assets.shadow}
        renderOrder={-1}
      >
        <planeGeometry />
      </mesh>
      <mesh position={[0, H / 2, 0]} material={assets.body}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, H / 2 + PAPER / 2, 0]} material={assets.inside}>
        <boxGeometry args={[W - 2 * PAPER, H - PAPER, D - 2 * PAPER]} />
      </mesh>
      {TISSUE.map(([x, lean, turn], i) => (
        <mesh
          key={i}
          geometry={assets.sheets[i]}
          material={assets.tissue}
          position={[x, H - 0.07, 0]}
          rotation={[lean * 0.4, turn, lean]}
        />
      ))}
      {[1, -1].map((side) => (
        <mesh
          key={side}
          geometry={assets.handle}
          material={assets.ribbon}
          position={[0, H, side * (D / 2 - 0.01)]}
          rotation={[side > 0 ? 0.3 : -0.15, 0, 0]}
          scale={[1, 1, RIBBON.thickness / RIBBON.width]}
        />
      ))}
    </group>
  );
}
