import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RACK_MAX_SPEED } from "./constants";
import type { RackSound } from "./rackSound";
import type { RackController } from "./useRackControls";

const JUMP_LOUDNESS = 0.4;

type RackSoundsProps = { controls: RackController; sound: RackSound };

export default function RackSounds({ controls, sound }: RackSoundsProps) {
  const last = useRef(controls.offset);

  useFrame((_, dt) => {
    const step = controls.offset - last.current;
    last.current = controls.offset;
    const moved = Math.abs(step) > controls.count / 2 ? 0 : Math.abs(step);
    sound.slide(moved / Math.max(dt, 1e-3) / RACK_MAX_SPEED, controls.jumping ? JUMP_LOUDNESS : 1);
  });

  return null;
}
