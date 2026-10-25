import { useEffect, useRef } from "react";
import type { Texture } from "three";
import { ClothSim, type ClothPointer, type HangerPose } from "./cloth/ClothSim";
import { MAX_SIMULATED, SIM_HYSTERESIS, SIM_RANGE } from "./constants";
import { wrapDistance } from "./layout";
import { SHIRTS } from "./shirts";
import type { ShirtSurface } from "./shirtSurface";
import type { RackController } from "./useRackControls";

/**
 * Owns the cloth worker. `step` simulates up to MAX_SIMULATED garments nearest the center (the
 * rest stay frozen) and advances them toward the current hanger poses.
 */
export function useClothSim(
  grid: { cols: number; rows: number },
  surfaces: ShirtSurface[],
  textures: Texture[],
  controls: RackController,
) {
  const cloth = useRef<ClothSim | null>(null);
  useEffect(() => {
    const sim = new ClothSim(grid);
    cloth.current = sim;
    return () => {
      sim.dispose();
      cloth.current = null;
    };
  }, [grid]);

  function syncSimulated(sim: ClothSim, offset: number, poses: HangerPose[]) {
    const distance = (i: number) => Math.abs(wrapDistance(i - offset, SHIRTS.length));
    const wanted = controls.reducedMotion
      ? []
      : SHIRTS.map((_, i) => i)
          .filter((i) => distance(i) <= (sim.has(i) ? SIM_RANGE + SIM_HYSTERESIS : SIM_RANGE))
          .sort((a, b) => distance(a) - distance(b))
          .slice(0, MAX_SIMULATED);
    for (const id of sim.ids()) if (!wanted.includes(id)) sim.remove(id);
    for (const i of wanted) {
      if (!sim.has(i)) sim.add(i, surfaces[i], textures[i], poses[i], SHIRTS[i].kind ?? "shirt");
    }
  }

  /** The cloth only ever sees the hanger and the pointer move; all motion comes from the solver. */
  function step(dt: number, offset: number, poses: HangerPose[], pointer: ClothPointer | null) {
    const sim = cloth.current;
    if (!sim) return;
    syncSimulated(sim, offset, poses);
    sim.step(dt, poses, pointer);
  }

  return { cloth, step };
}
