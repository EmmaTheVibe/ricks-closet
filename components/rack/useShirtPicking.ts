import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3, type Mesh, type Texture } from "three";
import { sampleAlpha } from "./cloth/buildConstraints";
import { alphaMask, type ClothSim } from "./cloth/ClothSim";
import { GRAB_LIFT, GRAB_MAX_REACH } from "./constants";
import type { ShirtInteraction } from "./interaction";
import type { SlotRefs } from "./RackSlot";

const _ndc = new Vector2();
const _raycaster = new Raycaster();
const _plane = new Plane();
const _normal = new Vector3();
const _point = new Vector3();

export function useShirtPicking(
  interaction: ShirtInteraction,
  cloth: RefObject<ClothSim | null>,
  slots: RefObject<SlotRefs[]>,
  textures: Texture[],
) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const castRay = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _raycaster.setFromCamera(_ndc, camera);
    return _raycaster;
  };

  useEffect(() => {
    interaction.setPicker((clientX, clientY) => {
      const sim = cloth.current;
      if (!sim) return null;
      const fronts = slots.current.map((s) => s.front);
      const targets = sim.ids().flatMap((id) => fronts[id] ?? []);
      for (const hit of castRay(clientX, clientY).intersectObjects(targets, false)) {
        const id = fronts.indexOf(hit.object as Mesh);
        if (!hit.uv || sampleAlpha(alphaMask(textures[id]), hit.uv.x, 1 - hit.uv.y) < 0.5) continue;
        return { id, local: hit.object.worldToLocal(hit.point.clone()) };
      }
      return null;
    });
    return () => interaction.setPicker(null);
  });

  function updateGrabTarget(grab: NonNullable<ShirtInteraction["grab"]>) {
    const mesh = slots.current[grab.id]?.front;
    if (!mesh || !cloth.current?.has(grab.id)) {
      interaction.endGrab();
      return;
    }
    camera.getWorldDirection(_normal);
    _plane.setFromNormalAndCoplanarPoint(_normal, mesh.localToWorld(_point.copy(grab.anchor)));
    if (!castRay(interaction.clientX, interaction.clientY).ray.intersectPlane(_plane, _point)) return;
    _point.addScaledVector(_normal, -GRAB_LIFT);
    mesh.worldToLocal(_point).sub(grab.anchor).clampLength(0, GRAB_MAX_REACH);
    grab.target.copy(grab.anchor).add(_point);
  }

  return { updateGrabTarget };
}
