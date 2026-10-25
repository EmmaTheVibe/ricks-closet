import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  LinearFilter,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Plane,
  Raycaster,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferAttribute,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from "three";
import Shirt from "./Shirt";
import { ShirtSurface } from "./shirtSurface";
import { createWeaveTexture } from "./weave";
import { SHIRTS, type GarmentKind } from "./shirts";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RackController } from "./useRackControls";
import type { ShirtInteraction } from "./interaction";
import { alphaMask, ClothSim, type HangerPose } from "./cloth/ClothSim";
import { sampleAlpha, type AlphaMask } from "./cloth/buildConstraints";
import {
  centerSlotRate,
  layoutForAspect,
  slotRotationY,
  slotX,
  wrapDistance,
} from "./layout";
import {
  CLICK_SLOP_PX,
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
  SIDE_VIEW_CUT_AT,
  SIDE_VIEW_FADE,
  SIDE_VIEW_HARD_CUT,
  TURN_COLS,
  TURN_ROWS,
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
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
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
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    false,
    "centripetal",
  );
  return new TubeGeometry(curve, segments, WIRE_RADIUS, 6, false);
}

/** Hook stays aligned with the rail (it swivels); the hanger body turns with the shirt. */
function buildHook() {
  return wire(
    [
      // Neck down to the collar: on the turning axis, so it reads the same from the front and in
      // side-view photos (where the hanger body is hidden).
      [0, -HANGER_DROP - 0.01, 0],
      [0, -0.06, 0],
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
const WAIST_BAND_ROWS = 3; // mask rows below the top edge that count as the waistband

/**
 * Opaque extent (hanger-local x) of the waistband for pants: the widest span across the top few
 * opaque rows. A single row isn't enough: a small bump on the top edge can be the only thing in
 * it, depending on how the browser downsamples the mask (coarser on mobile Safari).
 */
function waistSpan(mask: AlphaMask) {
  const span = (py: number) => {
    let left = -1;
    let right = -1;
    for (let px = 0; px < mask.width; px++) {
      if (mask.data[py * mask.width + px] < 128) continue;
      if (left < 0) left = px;
      right = px;
    }
    return { left, right };
  };
  for (let py = 0; py < mask.height; py++) {
    if (span(py).left < 0) continue;
    let left = mask.width;
    let right = -1;
    for (let r = py; r < Math.min(mask.height, py + WAIST_BAND_ROWS); r++) {
      const s = span(r);
      if (s.left < 0) continue;
      left = Math.min(left, s.left);
      right = Math.max(right, s.right);
    }
    // The waistband's top is its first row spanning most of that width, not a bump above it.
    let topRow = py;
    for (let r = py; r < Math.min(mask.height, py + WAIST_BAND_ROWS); r++) {
      const s = span(r);
      if (s.left >= 0 && s.right - s.left >= 0.6 * (right - left)) {
        topRow = r;
        break;
      }
    }
    const toX = (px: number) => ((px + 0.5) / mask.width - 0.5) * SHIRT_WIDTH;
    return {
      left: toX(left),
      right: toX(right),
      top: -HANGER_DROP - (topRow / mask.height) * SHIRT_HEIGHT,
    };
  }
  return { left: -0.15, right: 0.15, top: -HANGER_DROP };
}

/** Clip hanger for pants: a straight bar above the waistband with a clip gripping each end. */
function buildClipHanger(mask: AlphaMask) {
  const waist = waistSpan(mask);
  const barY = waist.top + 0.03;
  const clipX = [waist.left + 0.03, waist.right - 0.03];
  const parts = [
    wire(
      [
        [0, -0.05, 0],
        [0, -0.06, 0],
        [0, barY, 0],
      ],
      8,
    ),
    wire(
      [
        [waist.left - 0.01, barY, 0],
        [0, barY, 0],
        [waist.right + 0.01, barY, 0],
      ],
      24,
    ),
    ...clipX.flatMap((x) => {
      const clip = new BoxGeometry(0.024, 0.04, 0.02);
      clip.translate(x, waist.top - 0.008, 0);
      return [
        wire(
          [
            [x, barY, 0],
            [x, (barY + waist.top) / 2, 0],
            [x, waist.top + 0.012, 0],
          ],
          4,
        ),
        clip,
      ];
    }),
  ];
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
  parts.forEach((g) => g.dispose());
  return merged;
}

function buildHangerBody(mask: AlphaMask, kind: GarmentKind) {
  if (kind === "pants") return buildClipHanger(mask);
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
      ...[...arm]
        .reverse()
        .map(([x, y]): [number, number, number] => [x, y, z]),
      [0, apex, z],
    ],
    64,
  );
}

const SIDE_VIEW_ROWS = 16;
const SIDE_VIEW_HEM_GAIN = 1.1; // follows the simulated hem line one to one
const SIDE_VIEW_BEND = 0.5; // bend curve exponent: near 1 lets the fabric swing from high up, like the front

/**
 * Bends a side-view photo with the cloth sim: the shirt keeps simulating while its side photo
 * shows, so the photo is sheared by the simulated hem's sideways motion, pinned at the shoulders
 * and growing toward the hem. All the sway still comes from the solver.
 */
function bendSideView(
  mesh: Mesh,
  hemShift: { x: number; z: number },
  rotY: number,
  mirror: number,
) {
  // Hem motion in the slot's frame (the side photo isn't turned with the hanger body).
  const sideways =
    (hemShift.x * Math.cos(rotY) + hemShift.z * Math.sin(rotY)) *
    SIDE_VIEW_HEM_GAIN *
    mirror;
  const position = mesh.geometry.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const depth = MathUtils.clamp(
      (SHIRT_HEIGHT / 2 - position.getY(i)) / SHIRT_HEIGHT,
      0,
      1,
    );
    const base = (i % 2 === 0 ? -1 : 1) * (SHIRT_WIDTH / 2);
    position.setX(i, base + sideways * depth ** SIDE_VIEW_BEND);
  }
  position.needsUpdate = true;
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

  // Side-profile photos, for the garments that have one.
  const sideUrls = SHIRTS.flatMap((s) =>
    [s.side, s.sideLeft, s.turn?.right.src, s.turn?.left.src].filter(
      (u): u is string => Boolean(u),
    ),
  );
  const sideTextures = useTexture(sideUrls, (loaded) => {
    for (const t of [loaded].flat()) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
    }
  });
  // Turn flipbooks: each side's sheet, set up to show one frame at a time.
  const turnMaps = useMemo(
    () =>
      SHIRTS.map((s) => {
        if (!s.turn) return null;
        const sheet = (src: string) => {
          const texture = sideTextures[sideUrls.indexOf(src)].clone();
          // Set here, not inherited: the clone is made before useTexture's onLoad marks the
          // source sRGB, and as linear data dark fabric would render washed-out grey.
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = gl.capabilities.getMaxAnisotropy();
          texture.repeat.set(1 / TURN_COLS, 1 / TURN_ROWS);
          texture.generateMipmaps = false; // mipmaps would bleed neighbouring frames together
          texture.minFilter = LinearFilter;
          texture.needsUpdate = true;
          return texture;
        };
        return { right: sheet(s.turn.right.src), left: sheet(s.turn.left.src) };
      }),
    // sideUrls is derived from the static SHIRTS list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideTextures],
  );
  useEffect(
    () => () =>
      turnMaps.forEach((m) => {
        m?.right.dispose();
        m?.left.dispose();
      }),
    [turnMaps],
  );

  const sideMaterials = useMemo(
    () =>
      SHIRTS.map((s, i) => {
        if (!s.side && !s.turn) return null;
        return new MeshStandardMaterial({
          map: turnMaps[i]?.right ?? sideTextures[sideUrls.indexOf(s.side!)],
          alphaTest: 0.5,
          side: DoubleSide, // mirrored for garments left of center
          transparent: true,
          roughness: 0.85,
          // Drawn before the 3D front and never occludes it: the front fades over the photo
          // instead of the two fighting over depth as the shirt turns.
          depthWrite: false,
        });
      }),
    // sideUrls is derived from the static SHIRTS list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideTextures, turnMaps],
  );
  useEffect(
    () => () => sideMaterials.forEach((m) => m?.dispose()),
    [sideMaterials],
  );

  const hook = useMemo(() => buildHook(), []);
  const hangerBodies = useMemo(
    () =>
      textures.map((t, i) =>
        buildHangerBody(alphaMask(t), SHIRTS[i].kind ?? "shirt"),
      ),
    [textures],
  );
  useEffect(
    () => () => hangerBodies.forEach((h) => h.dispose()),
    [hangerBodies],
  );
  const metal = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#c8c8c8",
        metalness: 1,
        roughness: 0.3,
      }),
    [],
  );
  useEffect(
    () => () => {
      hook.dispose();
      metal.dispose();
    },
    [hook, metal],
  );
  // Garments with a side photo get their own hanger material so the hanger can fade with the front.
  const hangerMaterials = useMemo(
    () =>
      SHIRTS.map((s) =>
        s.side ? Object.assign(metal.clone(), { transparent: true }) : metal,
      ),
    [metal],
  );
  useEffect(
    () => () => hangerMaterials.forEach((m) => m !== metal && m.dispose()),
    [hangerMaterials, metal],
  );

  const [grid] = useState(pickGrid);
  const surfaces = useMemo(
    () =>
      textures.map(
        (texture) => new ShirtSurface(grid.cols, grid.rows, alphaMask(texture)),
      ),
    [grid, textures],
  );
  useEffect(() => () => surfaces.forEach((s) => s.dispose()), [surfaces]);

  const weave = useMemo(
    () => createWeaveTexture(gl.capabilities.getMaxAnisotropy()),
    [gl],
  );
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
  const sideViews = useRef<(Mesh | null)[]>([]);
  const hangerMeshes = useRef<(Mesh | null)[]>([]);
  const fades = useRef<number[]>(SHIRTS.map(() => 1)); // front opacity per garment
  const poses = useRef<HangerPose[]>(
    SHIRTS.map(() => ({ x: 0, y: RAIL_Y, z: 0, rotY: 0 })),
  );

  // Pointer ray from client coordinates.
  const castRay = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    _raycaster.setFromCamera(_ndc, camera);
    return _raycaster;
  };

  // Only simulated shirts can be hovered or grabbed, and only where the texture is opaque.
  useEffect(() => {
    interaction.setPicker((clientX, clientY) => {
      const sim = cloth.current;
      if (!sim) return null;
      const targets = sim.ids().flatMap((id) => meshes.current[id] ?? []);
      for (const hit of castRay(clientX, clientY).intersectObjects(
        targets,
        false,
      )) {
        const id = meshes.current.indexOf(hit.object as Mesh);
        if (
          !hit.uv ||
          sampleAlpha(alphaMask(textures[id]), hit.uv.x, 1 - hit.uv.y) < 0.5
        )
          continue;
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
    _plane.setFromNormalAndCoplanarPoint(
      _normal,
      mesh.localToWorld(_point.copy(grab.anchor)),
    );
    if (
      !castRay(interaction.clientX, interaction.clientY).ray.intersectPlane(
        _plane,
        _point,
      )
    )
      return;
    _point.addScaledVector(_normal, -GRAB_LIFT); // lift toward the camera
    mesh.worldToLocal(_point).sub(grab.anchor).clampLength(0, GRAB_MAX_REACH);
    grab.target.copy(grab.anchor).add(_point);
  }

  /** Simulates up to MAX_SIMULATED shirts nearest the center; the rest stay frozen. */
  function syncSimulated(sim: ClothSim, offset: number) {
    const distance = (i: number) =>
      Math.abs(wrapDistance(i - offset, SHIRTS.length));
    const wanted = controls.reducedMotion
      ? []
      : SHIRTS.map((_, i) => i)
          .filter(
            (i) =>
              distance(i) <=
              (sim.has(i) ? SIM_RANGE + SIM_HYSTERESIS : SIM_RANGE),
          )
          .sort((a, b) => distance(a) - distance(b))
          .slice(0, MAX_SIMULATED);
    for (const id of sim.ids()) if (!wanted.includes(id)) sim.remove(id);
    for (const i of wanted) {
      if (!sim.has(i))
        sim.add(
          i,
          surfaces[i],
          textures[i],
          poses.current[i],
          SHIRTS[i].kind ?? "shirt",
        );
    }
  }

  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const layout = layoutForAspect(state.size.width / state.size.height);
    const worldPerPx =
      (2 * camera.position.z * Math.tan(MathUtils.degToRad(camera.fov) / 2)) /
      state.size.height;
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
      pose.rotY = body.rotation.y = slotRotationY(
        d,
        SHIRTS[i].kind === "pants",
      );

      // Garments with a side-profile photo crossfade to it as they turn away from the center.
      const sideView = sideViews.current[i];
      if (sideView) {
        let amount: number;
        const turn = SHIRTS[i].turn;
        const turnMap = turnMaps[i];
        if (turn && turnMap) {
          // Real turning frames: show the one nearest the shirt's current angle. Every frame is
          // opaque and replaces the last outright, so the turn never blends or flashes.
          const sheet = d < 0 ? turn.left : turn.right;
          const map = d < 0 ? turnMap.left : turnMap.right;
          const degrees = MathUtils.radToDeg(Math.abs(pose.rotY));
          amount = degrees >= sheet.angles[0] * 0.5 ? 1 : 0;
          fades.current[i] = 1 - amount;
          let frame = 0;
          for (let k = 1; k < sheet.angles.length; k++) {
            if (
              Math.abs(sheet.angles[k] - degrees) <
              Math.abs(sheet.angles[frame] - degrees)
            )
              frame = k;
          }
          map.offset.set(
            (frame % TURN_COLS) / TURN_COLS,
            1 - (Math.floor(frame / TURN_COLS) + 1) / TURN_ROWS,
          );
          const material = sideView.material as MeshStandardMaterial;
          if (material.map !== map) material.map = map;
        } else if (SIDE_VIEW_HARD_CUT) {
          // One-frame swap at the fastest part of the turn: nothing is ever see-through, so
          // nothing can flash or ghost through.
          amount = Math.abs(d) >= SIDE_VIEW_CUT_AT ? 1 : 0;
          fades.current[i] = 1 - amount;
        } else {
          // Overlapped, not even: the side photo is nearly solid before the front fades much, so
          // the light background never shows through mid-swap.
          const [start, end] = SIDE_VIEW_FADE;
          const span = end - start;
          amount = MathUtils.smoothstep(Math.abs(d), start, start + span * 0.6);
          fades.current[i] =
            1 - MathUtils.smoothstep(Math.abs(d), start + span * 0.4, end);
        }
        (sideView.material as MeshStandardMaterial).opacity = amount;
        sideView.visible = amount > 0.001;
        sideView.scale.x = d < 0 ? -1 : 1; // the photo faces left; mirror it on the left side
        // Asymmetric garments have their own photo for the left (e.g. a D-ring on one side only).
        const sideLeft = SHIRTS[i].sideLeft;
        if (sideLeft && !turn) {
          const material = sideView.material as MeshStandardMaterial;
          const map =
            sideTextures[sideUrls.indexOf(d < 0 ? sideLeft : SHIRTS[i].side!)];
          if (material.map !== map) material.map = map;
        }
        // Seen from the side, a real hanger is edge-on inside the shirt; only the hook shows.
        const hanger = hangerMeshes.current[i];
        if (hanger) {
          // Fades out with the front: seen from the side, only the hook shows.
          const opacity = fades.current[i];
          (hanger.material as MeshStandardMaterial).opacity = opacity;
          hanger.visible = opacity > 0.001;
        }
        if (sideView.visible)
          bendSideView(
            sideView,
            surfaces[i].hemTip,
            pose.rotY,
            sideView.scale.x,
          );
      }

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
      <mesh
        position={[0, RAIL_Y, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={metal}
      >
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
          {sideMaterials[i] && (
            <mesh
              ref={(el) => {
                sideViews.current[i] = el;
              }}
              position={[0, -HANGER_DROP - SHIRT_HEIGHT / 2, 0]}
              material={sideMaterials[i]}
              visible={false}
              renderOrder={-1}
              onClick={(e) => {
                if (e.delta > CLICK_SLOP_PX) return;
                e.stopPropagation();
                controls.goToShirt(i);
              }}
            >
              <planeGeometry
                args={[SHIRT_WIDTH, SHIRT_HEIGHT, 1, SIDE_VIEW_ROWS]}
              />
            </mesh>
          )}
          <group
            ref={(el) => {
              bodies.current[i] = el;
            }}
          >
            <mesh
              ref={(el) => {
                hangerMeshes.current[i] = el;
              }}
              geometry={hangerBodies[i]}
              material={hangerMaterials[i]}
              castShadow
            />
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
              fades={fades}
              index={i}
              crossfades={Boolean(shirt.side)}
              onSelect={() => controls.goToShirt(i)}
            />
          </group>
        </group>
      ))}
    </group>
  );
}
