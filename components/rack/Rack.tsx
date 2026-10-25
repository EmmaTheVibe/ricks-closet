import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import type { HangerPose } from "./cloth/ClothSim";
import { RAIL_LENGTH, RAIL_RADIUS, RAIL_Y } from "./constants";
import type { ShirtInteraction } from "./interaction";
import { centerSlotRate, layoutForAspect, slotRotationY, slotX, wrapDistance } from "./layout";
import RackSlot, { emptySlotRefs, type SlotRefs } from "./RackSlot";
import { SHIRTS } from "./shirts";
import { updateSideView } from "./sideView";
import { useClothSim } from "./useClothSim";
import { useGarmentAssets } from "./useGarmentAssets";
import { useHangerAssets } from "./useHangerAssets";
import type { RackController } from "./useRackControls";
import { useShirtPicking } from "./useShirtPicking";

type RackProps = { controls: RackController; interaction: ShirtInteraction };

export default function Rack({ controls, interaction }: RackProps) {
  const { textures, sideViews, grid, surfaces, weave, floorShadow } = useGarmentAssets();
  const { hook, bodies, metal, wood } = useHangerAssets(textures);
  const { cloth, step: stepCloth } = useClothSim(grid, surfaces, textures, controls);

  const slots = useRef<SlotRefs[]>(SHIRTS.map(emptySlotRefs));
  const fades = useRef<number[]>(SHIRTS.map(() => 1)); // 3D front opacity per garment
  const poses = useRef<HangerPose[]>(SHIRTS.map(() => ({ x: 0, y: RAIL_Y, z: 0, rotY: 0 })));
  const { updateGrabTarget } = useShirtPicking(interaction, cloth, slots, textures);

  // One loop, in order: move the rack, lay out every slot, then step the cloth toward the new poses.
  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const layout = layoutForAspect(state.size.width / state.size.height);
    const worldPerPx = (2 * camera.position.z * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / state.size.height;
    controls.setPxToIndex(worldPerPx / centerSlotRate(layout));
    controls.step(dt);

    for (let i = 0; i < SHIRTS.length; i++) {
      const { slot, body, sideView, shadow } = slots.current[i];
      if (!slot || !body) continue;
      // The rack is a loop: each garment sits at its shortest distance around the ring, so the
      // one furthest away swaps ends off-screen.
      const d = wrapDistance(i - controls.offset, SHIRTS.length);
      const pose = poses.current[i];
      pose.x = slot.position.x = slotX(d, layout);
      pose.rotY = body.rotation.y = slotRotationY(d, SHIRTS[i].kind === "pants");

      const assets = sideViews[i];
      if (sideView && assets) {
        fades.current[i] = updateSideView(sideView, assets, d, pose.rotY, surfaces[i].hemTip);
      }

      // The floor shadow drifts under the hem as the garment swings or is tugged.
      if (shadow) {
        shadow.position.x = surfaces[i].hemShift.x;
        shadow.position.z = surfaces[i].hemShift.z;
      }
    }

    const grab = interaction.grab;
    if (grab) updateGrabTarget(grab);
    interaction.updateHover(dt);
    interaction.updateCursor();

    stepCloth(dt, controls.offset, poses.current, interaction.clothPointer());
  });

  return (
    <group>
      <mesh position={[0, RAIL_Y, 0]} rotation={[0, 0, Math.PI / 2]} material={metal}>
        <cylinderGeometry args={[RAIL_RADIUS, RAIL_RADIUS, RAIL_LENGTH, 16]} />
      </mesh>

      {SHIRTS.map((shirt, i) => (
        <RackSlot
          key={shirt.id}
          index={i}
          slots={slots}
          hook={hook}
          hanger={bodies[i]}
          wood={wood}
          metal={metal}
          floorShadow={floorShadow}
          sideView={sideViews[i]}
          surface={surfaces[i]}
          texture={textures[i]}
          weave={weave}
          fades={fades}
          onSelect={() => controls.goToShirt(i)}
        />
      ))}
    </group>
  );
}
