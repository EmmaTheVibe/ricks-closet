import { HOOK_POINTS, HOOK_RADIUS } from "./hangers";
import { HANGER_DROP, SHIRT_HEIGHT } from "./constants";

const IMAGE_W = 1024;
const IMAGE_H = 1280;
const PX = IMAGE_H / SHIRT_HEIGHT;
const HEADROOM = 135;
export const IMAGE_TOP_SHARE = HEADROOM / (IMAGE_H + HEADROOM);

function hookPath(side: boolean) {
  const pts = HOOK_POINTS.map(([y, z]) => [
    IMAGE_W / 2 - (side ? z * PX : 0),
    (-HANGER_DROP - y) * PX,
  ]);
  const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return d;
}

const HOOK = { front: hookPath(false), side: hookPath(true) };

type GarmentImageProps = {
  src: string;
  alt: string;
  hook: "front" | "side" | null;
  mirror?: boolean;
};

export default function GarmentImage({ src, alt, hook, mirror = false }: GarmentImageProps) {
  return (
    <svg
      viewBox={`0 ${-HEADROOM} ${IMAGE_W} ${IMAGE_H + HEADROOM}`}
      role="img"
      aria-label={alt}
      className="h-full w-full"
    >
      <g transform={mirror ? `matrix(-1 0 0 1 ${IMAGE_W} 0)` : undefined}>
        {hook && (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={HOOK[hook]} stroke="#8c8c8c" strokeWidth={HOOK_RADIUS * 2 * PX} />
            <path d={HOOK[hook]} stroke="#e4e4e4" strokeWidth={HOOK_RADIUS * 0.7 * PX} />
          </g>
        )}
        <image href={src} width={IMAGE_W} height={IMAGE_H} />
      </g>
    </svg>
  );
}
