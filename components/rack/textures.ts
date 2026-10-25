// Small textures drawn at runtime, so nothing extra downloads.
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";
import { SHIRT_HEIGHT, SHIRT_WIDTH, WEAVE_REPEAT } from "./constants";

/** Soft round falloff, stretched into an oval under each shirt. */
export function createShadowTexture() {
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

/** Tileable wood grain running along a tube (u = along its length), greyscale for the wood colour. */
export function createWoodGrain(anisotropy: number) {
  const width = 512;
  const height = 64;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(235,235,235)";
  ctx.fillRect(0, 0, width, height);
  // Fixed pseudo-random streaks so the grain is identical on every load.
  const rand = (n: number) => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  for (let k = 0; k < 26; k++) {
    const y = rand(k + 1) * height;
    const shade = 150 + rand(k + 50) * 70;
    ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.55)`;
    ctx.lineWidth = 0.6 + rand(k + 90) * 1.6;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 16) {
      const wobble = Math.sin((x / width) * Math.PI * 2 * (1 + (k % 3)) + k) * 1.5;
      if (x === 0) ctx.moveTo(x, y + wobble);
      else ctx.lineTo(x, y + wobble);
    }
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 1);
  texture.anisotropy = anisotropy;
  return texture;
}

const WEAVE_SIZE = 64;
const WEAVE_LOOP = 8; // px per knit loop

/** Tileable jersey-knit bump texture: columns of interlocking V loops. */
export function createWeaveTexture(anisotropy: number) {
  const canvas = document.createElement("canvas");
  canvas.width = WEAVE_SIZE;
  canvas.height = WEAVE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(70,70,70)";
  ctx.fillRect(0, 0, WEAVE_SIZE, WEAVE_SIZE);
  ctx.strokeStyle = "rgb(210,210,210)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let y = -WEAVE_LOOP; y < WEAVE_SIZE + WEAVE_LOOP; y += WEAVE_LOOP) {
    for (let x = 0; x < WEAVE_SIZE; x += WEAVE_LOOP) {
      ctx.beginPath();
      ctx.moveTo(x + 1, y);
      ctx.lineTo(x + WEAVE_LOOP / 2, y + WEAVE_LOOP);
      ctx.lineTo(x + WEAVE_LOOP - 1, y);
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
