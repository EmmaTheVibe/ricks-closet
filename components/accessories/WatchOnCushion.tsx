import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { BufferAttribute, DoubleSide, PlaneGeometry, SRGBColorSpace, type Mesh, type Texture } from "three";
import { CLICK_SLOP_PX } from "../rack/constants";
import { CUSHION_DEPTH, CUSHION_HEIGHT, CUSHION_RADIUS, CUSHION_TOP } from "./constants";
import { ARM } from "./watches";
import type { WatchView } from "./watchView";
import type { WatchConfig } from "./watches";

const LENGTH_SEGMENTS = 48;
const LIFT = 0.0008;
const EDGE_SHADE = 0.5;
const WRIST_REACH = 1.05;
const HOVER_RAISE = 0.004;
const WATCH_SLIDE = 0.008;
const HOVER_EASE = 14;
function wrap(along: number, top: number, radius: number, side = Infinity) {
  const s = Math.abs(along);
  const arc = (radius * Math.PI) / 2;
  if (s <= top) return { dy: 0, dz: s, turn: 0 };
  if (s <= top + arc) {
    const turn = (s - top) / radius;
    return { dy: -radius * (1 - Math.cos(turn)), dz: top + radius * Math.sin(turn), turn };
  }
  const down = s - top - arc;
  if (down <= side) return { dy: -radius - down, dz: top + radius, turn: Math.PI / 2 };
  const under = down - side;
  if (under <= arc) {
    const bend = under / radius;
    return { dy: -radius - side - radius * Math.sin(bend), dz: top + radius * Math.cos(bend), turn: Math.PI / 2 + bend };
  }
  return { dy: -2 * radius - side, dz: top - (under - arc), turn: Math.PI };
}

type WatchOnCushionProps = {
  watch: WatchConfig;
  index: number;
  x: number;
  z: number;
  view: WatchView;
  onSelect: () => void;
  onHover: (over: boolean) => void;
};

export default function WatchOnCushion({ watch, index, x, z, view, onSelect, onHover }: WatchOnCushionProps) {
  const gl = useThree((s) => s.gl);
  const texture = useTexture(watch.image, (t: Texture) => {
    t.colorSpace = SRGBColorSpace;
  });
  const { width: imageWidth, height: imageHeight } = texture.image as HTMLImageElement;
  const length = (watch.width * imageHeight) / imageWidth;

  const shapes = useMemo(() => {
    const geometry = new PlaneGeometry(watch.width, length, 1, LENGTH_SEGMENTS);
    const position = geometry.getAttribute("position") as BufferAttribute;
    const shape = () => ({ position: new Float32Array(position.count * 3), shade: new Float32Array(position.count * 3) });
    const bent = shape();
    const flat = shape();
    const wrist = shape();
    const cushionTop = CUSHION_DEPTH / 2 - CUSHION_RADIUS;
    const wristScale = (WRIST_REACH * ARM.wristMetres) / 2 / (cushionTop + CUSHION_RADIUS);
    const wristTop = cushionTop * wristScale;
    const wristRadius = CUSHION_RADIUS * wristScale;
    for (let i = 0; i < position.count; i++) {
      const across = position.getX(i);
      const along = position.getY(i);
      const side = along > 0 ? -1 : 1;
      const onCushion = along - WATCH_SLIDE;
      const cushionSide = onCushion > 0 ? -1 : 1;
      const c = wrap(onCushion, cushionTop, CUSHION_RADIUS, Math.max(0, CUSHION_HEIGHT - 2 * CUSHION_RADIUS));
      const w = wrap(along, wristTop, wristRadius);
      bent.position.set([across, c.dy + LIFT * Math.cos(c.turn), cushionSide * (c.dz + LIFT * Math.sin(c.turn))], i * 3);
      flat.position.set([across, LIFT, -along], i * 3);
      wrist.position.set([across, w.dy + LIFT * Math.cos(w.turn), side * (w.dz + LIFT * Math.sin(w.turn))], i * 3);
      const shade = (amount: number, turn: number) => Math.max(0, 1 - amount * (turn / (Math.PI / 2)));
      bent.shade.fill(shade(EDGE_SHADE, c.turn), i * 3, i * 3 + 3);
      flat.shade.fill(1, i * 3, i * 3 + 3);
      wrist.shade.fill(shade(EDGE_SHADE, w.turn), i * 3, i * 3 + 3);
    }
    (position.array as Float32Array).set(bent.position);
    position.needsUpdate = true;
    geometry.setAttribute("color", new BufferAttribute(bent.shade.slice(), 3));
    return { geometry, bent, flat, wrist };
  }, [watch.width, length]);
  useEffect(() => () => shapes.geometry.dispose(), [shapes]);

  const meshRef = useRef<Mesh | null>(null);
  const [hovered, setHovered] = useState(false);
  const raise = useRef(0);
  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh || view.index === index) return;
    const target = hovered ? HOVER_RAISE : 0;
    raise.current += (target - raise.current) * Math.min(1, dt * HOVER_EASE);
    mesh.position.y = CUSHION_TOP + raise.current;
  });

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    setHovered(false);
    onSelect();
  };
  const pointer = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    gl.domElement.style.cursor = on ? "pointer" : "";
    if (!on || e.pointerType === "mouse") {
      setHovered(on);
      onHover(on);
    }
  };

  return (
    <mesh
      ref={(mesh: Mesh | null) => {
        meshRef.current = mesh;
        view.register(index, mesh && { mesh, bent: shapes.bent, flat: shapes.flat, wrist: shapes.wrist });
      }}
      geometry={shapes.geometry}
      position={[x, CUSHION_TOP, z]}
      onClick={tap}
      onPointerOver={pointer(true)}
      onPointerOut={pointer(false)}
    >
      <meshBasicMaterial map={texture} vertexColors transparent alphaTest={0.01} toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}
