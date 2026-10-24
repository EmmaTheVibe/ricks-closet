import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  CanvasTexture,
  CatmullRomCurve3,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Plane,
  Raycaster,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from "three";
import Shirt from "./Shirt";
import { ShirtSurface } from "./shirtSurface";
import { createWeaveTexture } from "./weave";
import { SHIRTS } from "./shirts";
import type { RackController } from "./useRackControls";
import type { ShirtInteraction } from "./interaction";
import { alphaMask, ClothSim, type HangerPose } from "./cloth/ClothSim";
import { sampleAlpha, type AlphaMask } from "./cloth/buildConstraints";
import { centerSlotRate, layoutForAspect, slotRotationY, slotX, wrapDistance } from "./layout";
import {
  FLOOR_SHADOW_OPACITY,
  FLOOR_SHADOW_SIZE,
  GRAB_LIFT,
  GRAB_MAX_REACH,
  GRID_COLS,
  GRID_COLS_MOBILE,
  GRID_ROWS,
  GRID_ROWS_MOBILE,
  HANGER_BAR_DROP,
  HANGER_DROP,
  MAX_SIMULATED,
  RAIL_LENGTH,
  RAIL_RADIUS,
  RAIL_Y,
  SHIRT_HEIGHT,
  SHIRT_WIDTH,
  SIM_HYSTERESIS,
  SIM_RANGE,
} from "./constants";

const WIRE_RADIUS = 0.0035;

/** Soft round falloff, stretched into an oval under each shirt. */
function createShadowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function pickGrid() {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches
    ? { cols: GRID_COLS_MOBILE, rows: GRID_ROWS_MOBILE }
    : { cols: GRID_COLS, rows: GRID_ROWS };
}

function wire(points: [number, number, number][], segments: number) {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, "centripetal");
  return new TubeGeometry(curve, segments, WIRE_RADIUS, 6, false);
}

/** Hook stays aligned with the rail (it swivels); the hanger body turns with the shirt. */
function buildHook() {
  return wire(
    [
      [0, -0.05, 0],
      [0, -0.025, 0.012],
      [0, 0, 0.017],
      [0, 0.017, 0],
      [0, 0, -0.017],
      [0, -0.012, -0.014],
    ],
    24,
  );
}

const ARM_XS = [0.035, 0.07, 0.11, 0.15, 0.19, 0.21]; // sample points along each hanger arm
const ARM_MARGIN = 0.03; // keep the wire this far below the top edge of the fabric
const APEX_MARGIN = 0.015; // the arms meet this far below the top of the back collar

/** Hanger-local y of the garment's top edge at hanger-local x. */
function topEdgeY(mask: AlphaMask, x: number) {
  const u = x / SHIRT_WIDTH + 0.5;
  for (let py = 0; py < mask.height; py++) {
    const v = (py + 0.5) / mask.height;
    if (sampleAlpha(mask, u, v) >= 0.5) return -HANGER_DROP - v * SHIRT_HEIGHT;
  }
  return -HANGER_DROP - SHIRT_HEIGHT;
}

/**
 * Hanger body fitted to one garment: the arms follow the tee slope, dropping lower wherever the
 * garment's shoulders do (dropped shoulders, tall collars) so the wire stays inside the fabric.
 * It sits a little behind the cloth so the bar never pokes through the shirt's face.
 */
function buildHangerBody(mask: AlphaMask) {
  const z = -0.012;
  // The neck wire meets the arms just below the back of the collar, so only the hook shows.
  const apex = Math.min(-0.08, topEdgeY(mask, 0) - APEX_MARGIN);
  const arm = ARM_XS.map((x) => {
    const teeSlope = apex - (0.09 / 0.21) * x;
    const fabric = Math.min(topEdgeY(mask, -x), topEdgeY(mask, x)) - ARM_MARGIN;
    return [x, Math.min(teeSlope, fabric)] as const;
  });
  const barY = Math.min(-HANGER_BAR_DROP, arm[arm.length - 1][1] - 0.01);
  return wire(
    [
      [0, -0.05, 0],
      [0, apex, z],
      ...arm.map(([x, y]): [number, number, number] => [-x, y, z]),
      [-0.19, barY, z],
      [0.19, barY, z],
      ...[...arm].reverse().map(([x, y]): [number, number, number] => [x, y, z]),
      [0, apex, z],
    ],
    64,
  );
}

const _ndc = new Vector2();
const _raycaster = new Raycaster();
const _plane = new Plane();
const _normal = new Vector3();
const _point = new Vector3();

type RackProps = { controls: RackController; interaction: ShirtInteraction };

export default function Rack({ controls, interaction }: RackProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const textures = useTexture(
    SHIRTS.map((s) => s.texture),
    (loaded) => {
      for (const t of [loaded].flat()) {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = gl.capabilities.getMaxAnisotropy();
      }
    },
  );

  const hook = useMemo(() => buildHook(), []);
  const hangerBodies = useMemo(() => textures.map((t) => buildHangerBody(alphaMask(t))), [textures]);
  useEffect(() => () => hangerBodies.forEach((h) => h.dispose()), [hangerBodies]);
  const metal = useMemo(() => new MeshStandardMaterial({ color: "#c8c8c8", metalness: 1, roughness: 0.3 }), []);
  useEffect(
    () => () => {
      hook.dispose();
      metal.dispose();
    },
    [hook, metal],
  );

  const [grid] = useState(pickGrid);
  const surfaces = useMemo(
    () => textures.map((texture) => new ShirtSurface(grid.cols, grid.rows, alphaMask(texture))),
    [grid, textures],
  );
  useEffect(() => () => surfaces.forEach((s) => s.dispose()), [surfaces]);

  const weave = useMemo(() => createWeaveTexture(gl.capabilities.getMaxAnisotropy()), [gl]);
  useEffect(() => () => weave.dispose(), [weave]);

  const floorShadow = useMemo(
    () =>
      new MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        opacity: FLOOR_SHADOW_OPACITY,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      floorShadow.map?.dispose();
      floorShadow.dispose();
    },
    [floorShadow],
  );

  const cloth = useRef<ClothSim | null>(null);
  useEffect(() => {
    const sim = new ClothSim(grid);
    cloth.current = sim;
    return () => {
      sim.dispose();
      cloth.current = null;
    };
  }, [grid]);

  const slots = useRef<(Group | null)[]>([]);
  const bodies = useRef<(Group | null)[]>([]);
  const meshes = useRef<(Mesh | null)[]>([]);
  const shadows = useRef<(Mesh | null)[]>([]);
  const poses = useRef<HangerPose[]>(SHIRTS.map(() => ({ x: 0, y: RAIL_Y, z: 0, rotY: 0 })));

  // Pointer ray from client coordinates.
  const castRay = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _raycaster.setFromCamera(_ndc, camera);
    return _raycaster;
  };

  // Only simulated shirts can be hovered or grabbed, and only where the texture is opaque.
  useEffect(() => {
    interaction.setPicker((clientX, clientY) => {
      const sim = cloth.current;
      if (!sim) return null;
      const targets = sim.ids().flatMap((id) => meshes.current[id] ?? []);
      for (const hit of castRay(clientX, clientY).intersectObjects(targets, false)) {
        const id = meshes.current.indexOf(hit.object as Mesh);
        if (!hit.uv || sampleAlpha(alphaMask(textures[id]), hit.uv.x, 1 - hit.uv.y) < 0.5) continue;
        return { id, local: hit.object.worldToLocal(hit.point.clone()) };
      }
      return null;
    });
    return () => interaction.setPicker(null);
  });

  /** Projects the pointer onto a camera-facing plane through the grab point, within reach. */
  function updateGrabTarget(grab: NonNullable<ShirtInteraction["grab"]>) {
    const mesh = meshes.current[grab.id];
    if (!mesh || !cloth.current?.has(grab.id)) {
      interaction.endGrab();
      return;
    }
    camera.getWorldDirection(_normal);
    _plane.setFromNormalAndCoplanarPoint(_normal, mesh.localToWorld(_point.copy(grab.anchor)));
    if (!castRay(interaction.clientX, interaction.clientY).ray.intersectPlane(_plane, _point)) return;
    _point.addScaledVector(_normal, -GRAB_LIFT); // lift toward the camera
    mesh.worldToLocal(_point).sub(grab.anchor).clampLength(0, GRAB_MAX_REACH);
    grab.target.copy(grab.anchor).add(_point);
  }

  /** Simulates up to MAX_SIMULATED shirts nearest the center; the rest stay frozen. */
  function syncSimulated(sim: ClothSim, offset: number) {
    const distance = (i: number) => Math.abs(wrapDistance(i - offset, SHIRTS.length));
    const wanted = controls.reducedMotion
      ? []
      : SHIRTS.map((_, i) => i)
          .filter((i) => distance(i) <= (sim.has(i) ? SIM_RANGE + SIM_HYSTERESIS : SIM_RANGE))
          .sort((a, b) => distance(a) - distance(b))
          .slice(0, MAX_SIMULATED);
    for (const id of sim.ids()) if (!wanted.includes(id)) sim.remove(id);
    for (const i of wanted) {
      if (!sim.has(i)) sim.add(i, surfaces[i], textures[i], poses.current[i]);
    }
  }

  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const layout = layoutForAspect(state.size.width / state.size.height);
    const worldPerPx = (2 * camera.position.z * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / state.size.height;
    controls.setPxToIndex(worldPerPx / centerSlotRate(layout));
    controls.step(dt);

    for (let i = 0; i < SHIRTS.length; i++) {
      const slot = slots.current[i];
      const body = bodies.current[i];
      if (!slot || !body) continue;
      // The rack is a loop: each shirt sits at its shortest distance around the ring, so the
      // one furthest away swaps ends off-screen.
      const d = wrapDistance(i - controls.offset, SHIRTS.length);
      const pose = poses.current[i];
      pose.x = slot.position.x = slotX(d, layout);
      pose.rotY = body.rotation.y = slotRotationY(d);

      // The floor shadow drifts under the hem as the shirt swings or is tugged.
      const shadow = shadows.current[i];
      if (shadow) {
        shadow.position.x = surfaces[i].hemShift.x;
        shadow.position.z = surfaces[i].hemShift.z;
      }
    }

    const grab = interaction.grab;
    if (grab) updateGrabTarget(grab);
    interaction.updateHover(dt);
    interaction.updateCursor();

    // The cloth only ever sees the hanger and the pointer move; all motion comes from the solver.
    if (cloth.current) {
      syncSimulated(cloth.current, controls.offset);
      cloth.current.step(dt, poses.current, interaction.clothPointer());
    }
  });

  return (
    <group>
      <mesh position={[0, RAIL_Y, 0]} rotation={[0, 0, Math.PI / 2]} material={metal}>
        <cylinderGeometry args={[RAIL_RADIUS, RAIL_RADIUS, RAIL_LENGTH, 16]} />
      </mesh>

      {SHIRTS.map((shirt, i) => (
        <group
          key={shirt.id}
          ref={(el) => {
            slots.current[i] = el;
          }}
          position={[0, RAIL_Y, 0]}
        >
          <mesh geometry={hook} material={metal} castShadow />
          <group
            ref={(el) => {
              bodies.current[i] = el;
            }}
          >
            <mesh geometry={hangerBodies[i]} material={metal} castShadow />
            <mesh
              ref={(el) => {
                shadows.current[i] = el;
              }}
              position={[0, -RAIL_Y + 0.002, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[...FLOOR_SHADOW_SIZE, 1]}
              material={floorShadow}
              renderOrder={-1}
            >
              <planeGeometry />
            </mesh>
            <Shirt
              ref={(el) => {
                meshes.current[i] = el;
              }}
              surface={surfaces[i]}
              texture={textures[i]}
              weave={weave}
              onSelect={() => controls.goToShirt(i)}
            />
          </group>
        </group>
      ))}
    </group>
  );
}
