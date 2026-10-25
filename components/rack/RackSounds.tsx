import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RACK_MAX_SPEED } from "./constants";
import type { RackSound } from "./rackSound";
import type { RackController } from "./useRackControls";

const JUMP_LOUDNESS = 0.4; // a jump to a clicked shirt slides quieter than a drag, swipe or arrow key

type RackSoundsProps = { controls: RackController; sound: RackSound };

/** Feeds the rack's speed to its sliding sound. Mount after <Rack>, so it sees each frame's move. */
export default function RackSounds({ controls, sound }: RackSoundsProps) {
  const last = useRef(controls.offset);

  useFrame((_, dt) => {
    const step = controls.offset - last.current;
    last.current = controls.offset;
    // Settling folds the offset back by whole laps; that jump isn't motion.
    const moved = Math.abs(step) > controls.count / 2 ? 0 : Math.abs(step);
    sound.slide(moved / Math.max(dt, 1e-3) / RACK_MAX_SPEED, controls.jumping ? JUMP_LOUDNESS : 1);
  });

  return null;
}
