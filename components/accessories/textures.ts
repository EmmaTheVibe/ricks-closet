import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";
import { drawHanger, drawLockup, pageSans } from "../home/textures";

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function bumpTexture(canvas: HTMLCanvasElement, repeat: number) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

export function createLeatherGrain() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgb(110,110,110)";
  ctx.fillRect(0, 0, size, size);
  const rand = random(7);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 6;
    const shade = 150 + rand() * 70;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, `rgb(${shade},${shade},${shade})`);
    g.addColorStop(1, "rgba(110,110,110,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.7 + rand() * 0.3), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return bumpTexture(canvas, 6);
}

export function createSuedeNap() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const rand = random(11);
  for (let i = 0; i < size * size; i++) {
    const v = 118 + rand() * 20;
    image.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
  return bumpTexture(canvas, 10);
}

export function createMarble(base: string, aspect: number) {
  const height = 1024;
  const width = Math.round(height * aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  const rand = random(19);

  for (let i = 0; i < 60; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 120 + rand() * 360;
    const dark = rand() < 0.7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark ? `rgba(${150 + rand() * 30},${145 + rand() * 25},${138 + rand() * 20},0.16)` : "rgba(255,252,246,0.22)");
    g.addColorStop(1, "rgba(200,195,188,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }

  type Wave = { amp: number; len: number; phase: number };
  const curve = (x0: number, angle: number, waves: Wave[], offset = 0) => {
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    const points: [number, number][] = [];
    for (let t = -200; t < (width + height) * 1.3; t += 6) {
      const bend = offset + waves.reduce((sum, w) => sum + w.amp * Math.sin(t / w.len + w.phase), 0);
      points.push([x0 + dx * t - dy * bend, -40 + dy * t + dx * bend]);
    }
    return points;
  };
  const vein = (points: [number, number][], weight: number, darkness: number) => {
    for (const [lineWidth, alpha] of [
      [22 * weight, 0.06 * darkness],
      [8 * weight, 0.16 * darkness],
      [3 * weight, 0.45 * darkness],
      [1.2 * weight, 0.85 * darkness],
    ]) {
      ctx.strokeStyle = `rgba(78,72,66,${Math.min(1, alpha)})`;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = ctx.lineCap = "round";
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }
  };
  const VEINS = 7;
  for (let i = 0; i < VEINS; i++) {
    const bold = i % 3 === 0;
    const t = (i + 0.2 + rand() * 0.6) / VEINS;
    const x0 = -height * 0.6 + t * (width + height * 0.6);
    const angle = Math.PI * (0.22 + rand() * 0.12);
    const waves = [
      { amp: 90 + rand() * 120, len: 120 + rand() * 120, phase: rand() * Math.PI * 2 },
      { amp: 30 + rand() * 50, len: 50 + rand() * 50, phase: rand() * Math.PI * 2 },
    ];
    vein(curve(x0, angle, waves), bold ? 3.4 + rand() * 1.2 : 1.4 + rand() * 0.9, bold ? 1 : 0.75);
    for (let c = 0; c < (bold ? 2 : 1); c++) {
      const shifted = waves.map((w) => ({ ...w, phase: w.phase + (rand() - 0.5) * 0.4 }));
      vein(curve(x0, angle, shifted, (rand() < 0.5 ? -1 : 1) * (16 + rand() * 30)), 0.45, 0.6);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createLidLining(width: number, depth: number, suede: string) {
  const W = 1400;
  const H = Math.round((W * depth) / width);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = random(29);
  ctx.fillStyle = suede;
  ctx.fillRect(0, 0, W, H);

  const cell = (0.03 / width) * W;
  const half = cell / 2;
  for (let cy = -cell; cy < H + cell; cy += half) {
    const row = Math.round(cy / half);
    for (let cx = (row % 2 ? half : 0) - cell; cx < W + cell; cx += cell) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, half);
      g.addColorStop(0, "rgba(255,255,255,0.07)");
      g.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.lineCap = "round";
  const first = Math.floor(-(W + H) / cell) * cell + half;
  for (let k = first; k < W + H; k += cell) {
    for (const [style, lineWidth, offset] of [
      ["rgba(0,0,0,0.4)", 3, 0],
      ["rgba(255,255,255,0.08)", 1.5, 2.5],
    ] as const) {
      ctx.strokeStyle = style;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(k + offset, 0);
      ctx.lineTo(k + offset + H, H);
      ctx.moveTo(k + offset, 0);
      ctx.lineTo(k + offset - H, H);
      ctx.stroke();
    }
  }
  for (let cy = -cell; cy < H + cell; cy += half) {
    const row = Math.round(cy / half);
    for (let cx = (row % 2 ? 0 : half) - cell; cx < W + cell; cx += cell) {
      const g = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 7);
      g.addColorStop(0, "rgba(120,120,124,1)");
      g.addColorStop(1, "rgba(40,40,42,1)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < (W * H) / 25; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }

  const panel = { w: W * 0.56, h: H * 0.62 };
  const px = (W - panel.w) / 2;
  const py = (H - panel.h) / 2;
  const gold = (y0: number, y1: number) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, "#f2dea8");
    g.addColorStop(0.45, "#c9a46a");
    g.addColorStop(0.7, "#9c7a3e");
    g.addColorStop(1, "#dcc084");
    return g;
  };
  ctx.fillStyle = "#525256";
  ctx.beginPath();
  ctx.roundRect(px, py, panel.w, panel.h, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = gold(py, py + panel.h);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 14, panel.w - 28, panel.h - 28, 10);
  ctx.stroke();
  ctx.setLineDash([10, 7]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(px + 28, py + 28, panel.w - 56, panel.h - 56, 6);
  ctx.stroke();
  ctx.setLineDash([]);

  const cx = W / 2;
  const hangerTop = py + panel.h * 0.13;
  const lockupTop = py + panel.h * 0.33;
  const tagY = py + panel.h * 0.83;
  const foil = gold(hangerTop, tagY);
  drawHanger(ctx, cx, hangerTop, panel.w * 0.16, foil);
  drawLockup(ctx, cx, lockupTop, (panel.w * 0.62) / 1024, foil);
  ctx.fillStyle = foil;
  ctx.font = `700 ${Math.round(panel.h * 0.055)}px ${pageSans()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tag = "F I N E   T I M E P I E C E S";
  ctx.fillText(tag, cx, tagY);
  const tagHalf = ctx.measureText(tag).width / 2;
  ctx.fillRect(cx - tagHalf - 70, tagY - 1, 50, 2);
  ctx.fillRect(cx + tagHalf + 20, tagY - 1, 50, 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
