import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";
import { LOW_MEMORY } from "../rack/device";

const SIZE = { width: 1024, height: 2048 };
export const DETAIL =
  LOW_MEMORY ||
  (typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches)
    ? 0.5
    : 1;
export const BOARDS_ACROSS = 8;
const SEAM = 3;

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type RGB = [number, number, number];
const fromHex = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const scaled = (c: RGB, k: number): RGB => c.map((v) => Math.min(255, v * k)) as RGB;
const css = (c: RGB, alpha = 1) => `rgba(${c.map(Math.round).join(",")},${alpha})`;
const grey = (v: number, alpha = 1) => `rgba(${v},${v},${v},${alpha})`;

function stroke(ctx: CanvasRenderingContext2D, points: [number, number][], style: string, width: number) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
}

export function createFloorBoards(anisotropy: number, base: string) {
  const { width, height } = SIZE;
  const canvas = (fill: string) => {
    const c = document.createElement("canvas");
    c.width = width * DETAIL;
    c.height = height * DETAIL;
    const ctx = c.getContext("2d")!;
    ctx.scale(DETAIL, DETAIL);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
    return { canvas: c, ctx };
  };
  const colour = canvas(base);
  const bump = canvas(grey(200));
  const rand = random(23);
  const oak = fromHex(base);
  const board = width / BOARDS_ACROSS;

  const drawBoard = (x: number, y: number, length: number) => {
    const light = 0.9 + rand() * 0.16;
    const warm = rand() * 2 - 1;
    const tone: RGB = [oak[0] * light + warm * 6, oak[1] * light + warm * 2, oak[2] * light - warm * 4];
    const endShade = 0.93 + rand() * 0.14;
    const wobble = (v: number, phase: number, amount: number) => Math.sin(v / 90 + phase) * amount;

    const lines: { points: [number, number][]; width: number; alpha: number }[] = [];
    if (rand() < 0.5) {
      const cx = board * (0.3 + rand() * 0.4);
      const apex = length * (0.15 + rand() * 0.5);
      const rings = 6 + Math.floor(rand() * 5);
      const spacing = 3 + rand() * 3;
      const gap = 14 + rand() * 18;
      const phase = rand() * Math.PI * 2;
      for (let k = 0; k < rings; k++) {
        const top = apex - k * gap;
        const reach = (k + 1) * spacing;
        const open = gap * (3 + k * 0.5);
        const side = (dir: number) => {
          const points: [number, number][] = [];
          for (let t = 0; t <= 1.0001; t += 0.05) points.push([cx + dir * reach * Math.sqrt(t), top + t * open]);
          for (let v = top + open + 24; v <= length + 24; v += 24) points.push([cx + dir * reach + wobble(v, phase, 1.5), v]);
          return points;
        };
        lines.push({ points: [...side(-1).reverse(), ...side(1)], width: 0.8 + rand() * 1.2, alpha: 0.3 + rand() * 0.25 });
      }
    } else {
      for (let i = 0; i < 16; i++) {
        const gx = 4 + rand() * (board - 8);
        const phase = rand() * Math.PI * 2;
        const amount = 1 + rand() * 2.5;
        const points: [number, number][] = [];
        for (let v = 0; v <= length; v += 24) points.push([gx + wobble(v, phase, amount), v]);
        lines.push({ points, width: 0.6 + rand() * 1.4, alpha: 0.25 + rand() * 0.3 });
      }
    }
    const pores = Array.from({ length: Math.round(length / 4) }, () => ({ x: rand() * board, v: rand() * length, len: 3 + rand() * 9 }));
    const knot = rand() < 0.12 ? { x: board * (0.25 + rand() * 0.5), v: length * (0.2 + rand() * 0.6), r: 4 + rand() * 4 } : null;

    for (const top of [y, y - height]) {
      for (const [ctx, isColour] of [
        [colour.ctx, true],
        [bump.ctx, false],
      ] as const) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, top, board, length);
        ctx.clip();
        ctx.translate(x, top);
        if (isColour) {
          const shading = ctx.createLinearGradient(0, 0, 0, length);
          shading.addColorStop(0, css(tone));
          shading.addColorStop(1, css(scaled(tone, endShade)));
          ctx.fillStyle = shading;
          ctx.fillRect(0, 0, board, length);
        }
        for (const line of lines) {
          stroke(ctx, line.points, isColour ? css(scaled(tone, 0.68), line.alpha) : grey(160, line.alpha), line.width);
        }
        ctx.fillStyle = isColour ? css(scaled(tone, 0.55), 0.35) : grey(140, 0.6);
        for (const p of pores) ctx.fillRect(p.x, p.v, 1, p.len);
        if (knot) {
          ctx.fillStyle = isColour ? css(scaled(tone, 0.4), 0.9) : grey(120);
          ctx.beginPath();
          ctx.ellipse(knot.x, knot.v, knot.r * 0.7, knot.r, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let ring = 1; ring <= 3; ring++) {
            ctx.strokeStyle = isColour ? css(scaled(tone, 0.6), 0.4) : grey(165, 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(knot.x, knot.v, knot.r * 0.7 + ring * 3, knot.r + ring * 6, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.fillStyle = isColour ? "rgb(45,30,20)" : grey(40);
        ctx.fillRect(0, length - SEAM, board, SEAM);
        if (isColour) {
          ctx.fillStyle = "rgba(255,235,210,0.18)";
          ctx.fillRect(0, length - SEAM - 1, board, 1);
        }
        ctx.restore();
      }
    }
  };

  for (let column = 0; column < BOARDS_ACROSS; column++) {
    const x = column * board;
    let y = rand() * height;
    let covered = 0;
    while (covered < height) {
      const length = Math.min(height * (0.4 + rand() * 0.4), height - covered);
      drawBoard(x, y % height, length);
      y += length;
      covered += length;
    }
  }
  for (let column = 0; column < BOARDS_ACROSS; column++) {
    const x = column * board;
    colour.ctx.fillStyle = "rgb(45,30,20)";
    colour.ctx.fillRect(x, 0, SEAM, height);
    colour.ctx.fillStyle = "rgba(255,235,210,0.18)";
    colour.ctx.fillRect(x + SEAM, 0, 1, height);
    bump.ctx.fillStyle = grey(40);
    bump.ctx.fillRect(x, 0, SEAM, height);
  }

  const texture = (c: HTMLCanvasElement, isColour: boolean) => {
    const t = new CanvasTexture(c);
    t.colorSpace = isColour ? SRGBColorSpace : NoColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = anisotropy;
    return t;
  };
  return { map: texture(colour.canvas, true), bump: texture(bump.canvas, false) };
}

export function createPanelGrain(anisotropy: number) {
  const width = 512;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rand = random(41);
  ctx.fillStyle = grey(222);
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 10; i++) {
    const x = rand() * width;
    const w = 20 + rand() * 50;
    ctx.fillStyle = grey(rand() < 0.5 ? 190 : 245, 0.12);
    ctx.fillRect(x - w / 2, 0, w, height);
  }
  for (let i = 0; i < 140; i++) {
    const x = rand() * width;
    const drift = 1 + rand() * 4;
    const phase = rand() * Math.PI * 2;
    const style = grey(150 + rand() * 60, 0.25 + rand() * 0.3);
    const lineWidth = 0.5 + rand() * 1.8;
    for (const offset of [-width, 0, width]) {
      const points: [number, number][] = [];
      for (let v = 0; v <= height; v += 16) points.push([x + offset + Math.sin((v / height) * Math.PI * 2 + phase) * drift, v]);
      stroke(ctx, points, style, lineWidth);
    }
  }
  ctx.fillStyle = grey(140, 0.35);
  for (let i = 0; i < 2500; i++) ctx.fillRect(rand() * width, rand() * height, 1, 2 + rand() * 6);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

export function pageSans() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim();
  return family ? `${family}, Arial, sans-serif` : "Arial, sans-serif";
}

export function drawLockup(ctx: CanvasRenderingContext2D, cx: number, top: number, scale: number, color: string | CanvasGradient) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  const capitals = 64 * scale;
  ctx.font = `800 ${capitals}px ${pageSans()}`;
  const letters = [..."RICK’S"];
  const tracking = 0.4 * capitals;
  const span = letters.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + tracking * (letters.length - 1);
  let x = cx - span / 2;
  for (const ch of letters) {
    ctx.fillText(ch, x, top + 100 * scale);
    x += ctx.measureText(ch).width + tracking;
  }
  ctx.font = `italic 700 ${250 * scale}px ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`;
  ctx.textAlign = "center";
  ctx.fillText("Closet", cx, top + 360 * scale);
  ctx.restore();
}

export function createBrandMark(color: string) {
  const width = 1024;
  const height = 420;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  drawLockup(canvas.getContext("2d")!, width / 2, 0, 1, color);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: width / height };
}

export function drawHanger(ctx: CanvasRenderingContext2D, cx: number, top: number, size: number, color: string | CanvasGradient) {
  const r = size * 0.09;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.045;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(cx, top + r, r, Math.PI * 0.95, Math.PI * 2.3);
  ctx.lineTo(cx, top + r * 3.2);
  ctx.moveTo(cx, top + r * 3.2);
  ctx.lineTo(cx + size / 2, top + size * 0.62);
  ctx.lineTo(cx - size / 2, top + size * 0.62);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function bagPaper(width: number, height: number, paper: string, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  const rand = random(seed);
  for (let i = 0; i < (width * height) / 60; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,240,220,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(rand() * width, rand() * height, 1, 2 + rand() * 4);
  }
  return { canvas, ctx };
}

export function createBagPrint(size: { width: number; height: number; depth: number }, paper: string, foil: string, pxPerMetre: number) {
  const front = bagPaper(Math.round(size.width * pxPerMetre), Math.round(size.height * pxPerMetre), paper, 51);
  const fw = front.canvas.width;
  const fh = front.canvas.height;
  drawHanger(front.ctx, fw / 2, fh * 0.2, fw * 0.36, foil);
  drawLockup(front.ctx, fw / 2, fh * 0.45, (fw * 0.82) / 1024, foil);

  const side = bagPaper(Math.round(size.depth * pxPerMetre), Math.round(size.height * pxPerMetre), paper, 53);
  const sw = side.canvas.width;
  const shade = side.ctx.createLinearGradient(0, 0, sw, 0);
  shade.addColorStop(0, "rgba(255,240,220,0.06)");
  shade.addColorStop(0.5, "rgba(0,0,0,0.35)");
  shade.addColorStop(0.5, "rgba(0,0,0,0.2)");
  shade.addColorStop(1, "rgba(0,0,0,0.1)");
  side.ctx.fillStyle = shade;
  side.ctx.fillRect(0, 0, sw, side.canvas.height);

  const texture = (c: HTMLCanvasElement) => {
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { front: texture(front.canvas), side: texture(side.canvas) };
}
