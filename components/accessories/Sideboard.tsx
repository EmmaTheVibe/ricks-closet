import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { createPanelGrain } from "../home/textures";
import { FLOOR_SHADOW_OPACITY } from "../rack/constants";
import { createShadowTexture } from "../rack/textures";
import { WOOD_ROUGHNESS, WOOD_SPECULAR } from "../shoes/constants";
import { BRASS, MARBLE, SIDEBOARD, SIDEBOARD_WOOD } from "./constants";
import { createMarble } from "./textures";

const { width: W, depth: D, height: H, back: BACK, top: TOP, legs: LEGS } = SIDEBOARD;
const FRONT = BACK + D;
const BODY = { width: W - 0.02, height: H - TOP - LEGS, depth: D - 0.02 };
const BODY_Y = -TOP - BODY.height / 2;
const DRAWERS = 3;
const DRAWER_GAP = 0.006;
const DRAWER_INSET = 0.025;
const PULL = { length: 0.12, radius: 0.005 };
const LEG_INSET = 0.07;

export default function Sideboard() {
  const gl = useThree((s) => s.gl);
  const materials = useMemo(() => {
    const wood = (across: boolean) => {
      const map = createPanelGrain(gl.capabilities.getMaxAnisotropy());
      if (across) {
        map.center.set(0.5, 0.5);
        map.rotation = Math.PI / 2;
      }
      return new MeshPhysicalMaterial({ color: SIDEBOARD_WOOD, map, roughness: WOOD_ROUGHNESS, specularIntensity: WOOD_SPECULAR });
    };
    return {
      marble: new MeshPhysicalMaterial({
        map: createMarble(MARBLE, W / D),
        roughness: 0.45,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      body: wood(false),
      drawer: wood(true),
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

  const drawerWidth = (BODY.width - 2 * DRAWER_INSET - (DRAWERS - 1) * DRAWER_GAP) / DRAWERS;
  const drawerHeight = BODY.height - 2 * DRAWER_INSET;
  const bodyFront = BACK + 0.01 + BODY.depth;

  return (
    <group>
      <mesh
        position={[0, -H + 0.002, BACK + D / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[W + 0.4, D + 0.5, 1]}
        material={materials.shadow}
        renderOrder={-1}
      >
        <planeGeometry />
      </mesh>

      <mesh position={[0, -TOP / 2, BACK + D / 2]} material={materials.marble} receiveShadow>
        <boxGeometry args={[W, TOP, D]} />
      </mesh>
      <mesh position={[0, BODY_Y, BACK + 0.01 + BODY.depth / 2]} material={materials.body}>
        <boxGeometry args={[BODY.width, BODY.height, BODY.depth]} />
      </mesh>

      {Array.from({ length: DRAWERS }, (_, i) => {
        const x = -BODY.width / 2 + DRAWER_INSET + drawerWidth / 2 + i * (drawerWidth + DRAWER_GAP);
        return (
          <group key={i} position={[x, BODY_Y, bodyFront]}>
            <mesh position={[0, 0, 0.006]} material={materials.drawer}>
              <boxGeometry args={[drawerWidth, drawerHeight, 0.012]} />
            </mesh>
            <group position={[0, drawerHeight * 0.25, 0.012]}>
              <mesh position={[0, 0, 0.022]} rotation={[0, 0, Math.PI / 2]} material={materials.brass}>
                <cylinderGeometry args={[PULL.radius, PULL.radius, PULL.length, 12]} />
              </mesh>
              {[-1, 1].map((end) => (
                <mesh
                  key={end}
                  position={[(end * (PULL.length - 0.03)) / 2, 0, 0.011]}
                  rotation={[Math.PI / 2, 0, 0]}
                  material={materials.brass}
                >
                  <cylinderGeometry args={[0.004, 0.004, 0.022, 10]} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}

      {[-1, 1].flatMap((sx) =>
        [BACK + LEG_INSET, FRONT - LEG_INSET].map((z) => (
          <mesh key={`${sx}${z}`} position={[sx * (W / 2 - LEG_INSET), -H + LEGS / 2, z]} material={materials.body}>
            <cylinderGeometry args={[0.02, 0.012, LEGS, 12]} />
          </mesh>
        )),
      )}
    </group>
  );
}
