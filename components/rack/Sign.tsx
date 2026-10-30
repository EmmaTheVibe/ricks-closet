import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  CanvasTexture,
  ExtrudeGeometry,
  MathUtils,
  MeshStandardMaterial,
  Path,
  Shape,
  SRGBColorSpace,
  type BufferAttribute,
  type Group,
} from "three";
import { CLICK_SLOP_PX, SIGN_INK, SIGN_PAPER, SIGN_SIZE, SIGN_TILT_DEG, SIGN_Y } from "./constants";

const TEXTURE_WIDTH = 1536;
const CLIP = 0.022;
const EYELET_INSET = 0.035;
const EYELET_RADIUS = 0.007;
const TWINE_APEX = 2.4;

const SWING_RATE = 9.81 / (TWINE_APEX - SIGN_Y);
const SWING_DAMPING = 0.9;
const SWING_KICK = 0.9;
const SWING_MAX = 0.6;
const SPIN_RATE = 5;
const SPIN_DAMPING = 0.55;
const SPIN_KICK = 7;
const SPIN_MAX_SPEED = 12;
const REDUCED_KICK = 0.3;

function pageFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim();
  return family ? `${family}, Arial, sans-serif` : "Arial, sans-serif";
}

function createTagGeometry() {
  const [w, h, thickness] = SIGN_SIZE;
  const x = w / 2;
  const y = h / 2;
  const shape = new Shape();
  shape.moveTo(-x + CLIP, -y);
  shape.lineTo(x - CLIP, -y);
  shape.lineTo(x, -y + CLIP);
  shape.lineTo(x, y - CLIP);
  shape.lineTo(x - CLIP, y);
  shape.lineTo(-x + CLIP, y);
  shape.lineTo(-x, y - CLIP);
  shape.lineTo(-x, -y + CLIP);
  shape.closePath();
  for (const side of [-1, 1]) {
    const hole = new Path();
    hole.absarc(side * (x - EYELET_INSET), y - EYELET_INSET, EYELET_RADIUS * 0.6, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.translate(0, 0, -thickness / 2);
  const [caps, edges] = geometry.groups;
  const half = caps.count / 2;
  geometry.clearGroups();
  geometry.addGroup(caps.start, half, 1);
  geometry.addGroup(caps.start + half, half, 0);
  geometry.addGroup(edges.start, edges.count, 1);
  const pos = geometry.getAttribute("position") as BufferAttribute;
  const uv = geometry.getAttribute("uv") as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + x) / w, (pos.getY(i) + y) / h);
  return geometry;
}

function createTagFace(anisotropy: number) {
  const [w, h] = SIGN_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = Math.round((TEXTURE_WIDTH * h) / w);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;

  const fibres = Array.from({ length: 2600 }, (_, i) => {
    const r = (n: number) => {
      const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    return { x: r(1), y: r(2), len: 2 + r(3) * 7, angle: r(4) * Math.PI, dark: r(5) < 0.55 };
  });

  const sans = pageFont();
  const serif = 'Georgia, "Times New Roman", serif';
  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    const { width: cw, height: ch } = canvas;
    ctx.fillStyle = SIGN_PAPER;
    ctx.fillRect(0, 0, cw, ch);
    ctx.lineWidth = 1.5;
    for (const f of fibres) {
      ctx.strokeStyle = f.dark ? "rgba(90,60,30,0.16)" : "rgba(255,240,210,0.18)";
      ctx.beginPath();
      ctx.moveTo(f.x * cw, f.y * ch);
      ctx.lineTo(f.x * cw + Math.cos(f.angle) * f.len, f.y * ch + Math.sin(f.angle) * f.len);
      ctx.stroke();
    }
    const edge = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.4, cw / 2, ch / 2, cw * 0.62);
    edge.addColorStop(0, "rgba(60,40,20,0)");
    edge.addColorStop(1, "rgba(60,40,20,0.22)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = SIGN_INK;

    const small = ch * 0.19;
    ctx.font = `800 ${small}px ${sans}`;
    const letters = [..."RICK’S"];
    const tracking = small * 0.32;
    const widths = letters.map((l) => ctx.measureText(l).width);
    let lx = cw / 2 - (widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1)) / 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    letters.forEach((l, i) => {
      ctx.fillText(l, lx, ch * 0.37);
      lx += widths[i] + tracking;
    });

    ctx.textAlign = "center";
    ctx.font = `italic 700 ${ch * 0.4}px ${serif}`;
    ctx.fillText("Closet", cw / 2, ch * 0.77);

    ctx.font = `600 ${ch * 0.065}px ${sans}`;
    ctx.globalAlpha = 0.75;
    ctx.fillText("EST. 2026", cw / 2, ch * 0.91);
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  };

  draw();
  document.fonts?.load(`800 64px ${sans}`).then(draw, () => {});
  return texture;
}

export default function Sign() {
  const gl = useThree((s) => s.gl);
  const [w, h] = SIGN_SIZE;
  const swing = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const motion = useRef({ swing: 0, swingSpeed: 0, spin: 0, spinSpeed: 0 });

  useFrame((_, dt) => {
    const m = motion.current;
    const total = Math.min(dt, 0.1);
    const steps = Math.ceil(total / (1 / 240));
    const step = total / steps;
    for (let i = 0; i < steps; i++) {
      m.swingSpeed += (-SWING_RATE * m.swing - SWING_DAMPING * m.swingSpeed) * step;
      m.swing = MathUtils.clamp(m.swing + m.swingSpeed * step, -SWING_MAX, SWING_MAX);
      m.spinSpeed += (-SPIN_RATE * m.spin - SPIN_DAMPING * m.spinSpeed) * step;
      m.spin += m.spinSpeed * step;
    }
    if (swing.current) swing.current.rotation.x = m.swing;
    if (spin.current) spin.current.rotation.y = m.spin;
  });

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_SLOP_PX) return;
    e.stopPropagation();
    const m = motion.current;
    const kick = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? REDUCED_KICK : 1;
    const across = MathUtils.clamp(e.object.worldToLocal(e.point.clone()).x / (w / 2), -1, 1);
    m.swingSpeed += SWING_KICK * kick;
    m.spinSpeed = MathUtils.clamp(m.spinSpeed + SPIN_KICK * across * kick, -SPIN_MAX_SPEED, SPIN_MAX_SPEED);
  };
  const pointer = (on: boolean) => () => {
    gl.domElement.style.cursor = on ? "pointer" : "";
  };

  const parts = useMemo(() => {
    const geometry = createTagGeometry();
    const face = new MeshStandardMaterial({
      map: createTagFace(gl.capabilities.getMaxAnisotropy()),
      roughness: 0.9,
    });
    const edge = new MeshStandardMaterial({ color: SIGN_PAPER, roughness: 0.95 });
    const metal = new MeshStandardMaterial({ color: "#b9a27a", metalness: 1, roughness: 0.35 });
    const twine = new MeshStandardMaterial({ color: "#7a5c3c", roughness: 1 });
    return { geometry, materials: [face, edge], metal, twine };
  }, [gl]);
  useEffect(
    () => () => {
      const [face, edge] = parts.materials;
      parts.geometry.dispose();
      face.map?.dispose();
      face.dispose();
      edge.dispose();
      parts.metal.dispose();
      parts.twine.dispose();
    },
    [parts],
  );

  const tilt = MathUtils.degToRad(SIGN_TILT_DEG);
  const eyelets = [-1, 1].map((side) => [side * (w / 2 - EYELET_INSET), h / 2 - EYELET_INSET] as const);

  return (
    <group position={[0, TWINE_APEX, 0]}>
      <group ref={swing}>
        <group ref={spin} position={[0, SIGN_Y - TWINE_APEX, 0]}>
          <group rotation={[0, 0, tilt]}>
            <mesh
              geometry={parts.geometry}
              material={parts.materials}
              onClick={tap}
              onPointerOver={pointer(true)}
              onPointerOut={pointer(false)}
            />
            {eyelets.map(([x, y]) => (
              <mesh key={x} position={[x, y, 0]} material={parts.metal}>
                <torusGeometry args={[EYELET_RADIUS * 0.8, EYELET_RADIUS * 0.3, 8, 20]} />
              </mesh>
            ))}
          </group>
          {eyelets.map(([ex, ey]) => {
            const sx = ex * Math.cos(tilt) - ey * Math.sin(tilt);
            const sy = ex * Math.sin(tilt) + ey * Math.cos(tilt);
            const dx = -sx;
            const dy = TWINE_APEX - SIGN_Y - sy;
            const length = Math.hypot(dx, dy);
            return (
              <mesh
                key={ex}
                position={[sx + dx / 2, sy + dy / 2, 0]}
                rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]}
                material={parts.twine}
              >
                <cylinderGeometry args={[0.0018, 0.0018, length, 5]} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
