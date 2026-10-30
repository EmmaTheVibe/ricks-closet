import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import type { HangerPose } from "./cloth/ClothSim";
import { FLOOR_SHADOW_SIZE, RAIL_LENGTH, RAIL_RADIUS, RAIL_Y } from "./constants";
import type { ShirtInteraction } from "./interaction";
import { centerSlotRate, layoutForAspect, slotRotationY, slotX, wrapDistance } from "./layout";
import type { Placement, PullOff } from "./pullOff";
import RackSlot, { emptySlotRefs, FLOOR_Y, type SlotRefs } from "./RackSlot";
import { SHIRTS } from "./shirts";
import { showSideViewStill, updateSideView } from "./sideView";
import { useClothSim } from "./useClothSim";
import { useGarmentAssets } from "./useGarmentAssets";
import { useHangerAssets } from "./useHangerAssets";
import type { RackController } from "./useRackControls";
import { useShirtPicking } from "./useShirtPicking";

type RackProps = { controls: RackController; interaction: ShirtInteraction; pullOff: PullOff };

export default function Rack({ controls, interaction, pullOff }: RackProps) {
  const { textures, sideViews, grid, surfaces, weave, floorShadow } = useGarmentAssets();
  const { hook, bodies, metal, wood } = useHangerAssets(textures);
  const { cloth, step: stepCloth } = useClothSim(grid, surfaces, textures, controls);

  const slots = useRef<SlotRefs[]>(SHIRTS.map(emptySlotRefs));
  const fades = useRef<number[]>(SHIRTS.map(() => 1));
  const poses = useRef<HangerPose[]>(SHIRTS.map(() => ({ x: 0, y: RAIL_Y, z: 0, rotY: 0 })));
  const { updateGrabTarget } = useShirtPicking(interaction, cloth, slots, textures);
  const placement = useRef<Placement>({ x: 0, y: 0, z: 0, scale: 1 });
  const hem = useRef({ x: 0, z: 0 });

  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const layout = layoutForAspect(state.size.width / state.size.height);
    const worldPerPx = (2 * camera.position.z * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / state.size.height;
    controls.setPxToIndex(worldPerPx / centerSlotRate(layout));
    controls.step(dt);

    const liftedSlot = pullOff.index >= 0 ? slots.current[pullOff.index].slot : null;
    if (pullOff.wantsFreeze && liftedSlot) {
      pullOff.freeze(state.gl, state.scene, camera, liftedSlot);
      const tip = surfaces[pullOff.index].hemTip;
      hem.current = { x: tip.x, z: tip.z };
    }
    const liftedTip = pullOff.index >= 0 ? surfaces[pullOff.index].hemTip : null;
    const hemSpeed = liftedTip
      ? Math.hypot(liftedTip.x - hem.current.x, liftedTip.z - hem.current.z) / Math.max(dt, 1e-3)
      : 0;
    if (liftedTip) hem.current = { x: liftedTip.x, z: liftedTip.z };
    pullOff.update(dt, controls.reducedMotion, camera, state.gl.domElement, hemSpeed);

    pullOff.thawIfLanded(state.scene, camera);

    for (let i = 0; i < SHIRTS.length; i++) {
      const { slot, body, sideView, shadow } = slots.current[i];
      if (!slot || !body) continue;
      const d = wrapDistance(i - controls.offset, SHIRTS.length);
      const pose = poses.current[i];
      pose.rotY = body.rotation.y = slotRotationY(d, SHIRTS[i].kind === "pants");
      const lifted = i === pullOff.index;
      const at = lifted
        ? pullOff.place(slotX(d, layout), placement.current)
        : Object.assign(placement.current, { x: slotX(d, layout), y: RAIL_Y, z: 0, scale: 1 });
      slot.position.set(at.x, at.y, at.z);
      slot.scale.setScalar(at.scale);
      slot.visible = !(lifted && pullOff.hidden);
      pose.x = at.x;
      pose.y = at.y;
      pose.z = at.z;

      const assets = sideViews[i];
      if (sideView && assets) {
        fades.current[i] = updateSideView(sideView, assets, d, pose.rotY, surfaces[i].hemTip);
      }

      if (shadow) {
        shadow.position.x = surfaces[i].hemShift.x;
        shadow.position.y = (FLOOR_Y - at.y) / at.scale;
        shadow.position.z = surfaces[i].hemShift.z;
        const left = lifted ? 1 - pullOff.away : 1;
        shadow.scale.set(FLOOR_SHADOW_SIZE[0] * left, FLOOR_SHADOW_SIZE[1] * left, 1);
      }
    }

    const grab = interaction.grab;
    if (grab) updateGrabTarget(grab);
    interaction.updateHover(dt);
    interaction.updateCursor();

    stepCloth(dt, controls.offset, poses.current, interaction.clothPointer());

    if (pullOff.wantsCapture) {
      const { body, sideView } = slots.current[pullOff.index];
      const assets = sideViews[pullOff.index];
      pullOff.captureRest(state.gl, state.scene, camera, (kind) => {
        if (!body) return false;
        if (kind === null || kind === "front") {
          body.visible = true;
          if (sideView) sideView.visible = false;
          return kind === "front";
        }
        if (!sideView || !assets) return false;
        body.visible = false;
        showSideViewStill(sideView, assets, kind === "sideMirrored");
        return true;
      });
    }
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
