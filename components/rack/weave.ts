import { CanvasTexture, NoColorSpace, RepeatWrapping } from "three";
import { SHIRT_HEIGHT, SHIRT_WIDTH, WEAVE_REPEAT } from "./constants";

const SIZE = 64;
const LOOP = 8; // px per knit loop

/** Tileable jersey-knit bump texture: columns of interlocking V loops, drawn once at runtime. */
export function createWeaveTexture(anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(70,70,70)";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgb(210,210,210)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let y = -LOOP; y < SIZE + LOOP; y += LOOP) {
    for (let x = 0; x < SIZE; x += LOOP) {
      ctx.beginPath();
      ctx.moveTo(x + 1, y);
      ctx.lineTo(x + LOOP / 2, y + LOOP);
      ctx.lineTo(x + LOOP - 1, y);
      ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = anisotropy;
  texture.repeat.set(WEAVE_REPEAT, (WEAVE_REPEAT * SHIRT_HEIGHT) / SHIRT_WIDTH);
  return texture;
}
