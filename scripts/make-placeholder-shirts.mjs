// Generates placeholder t-shirt PNGs (1024×1280, transparent background) into public/shirts/.
// Run with: npm run shirts
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1024;
const H = 1280;
const OUT_DIR = path.join(process.cwd(), "public", "shirts");

// Shoulders sit near the top edge so the top grid row lines up with the hanger.
const SILHOUETTE = `
  M 400 24
  C 440 56 584 56 624 24
  L 854 110 L 1004 360 L 880 450 L 792 400
  L 800 1236 Q 512 1258 224 1236
  L 232 400 L 144 450 L 20 360 L 170 110 Z`;

// Inside of the back panel, seen through the neck opening.
const NECK_INSIDE = "M 400 24 C 440 56 584 56 624 24 C 594 120 430 120 400 24 Z";
const NECKLINE = "M 400 24 C 430 120 594 120 624 24";
const ARMHOLES = "M 170 110 Q 215 250 232 400 M 854 110 Q 809 250 792 400";
const SLEEVE_HEMS = "M 41 333 L 165 423 M 983 333 L 859 423";
const SLEEVE_BANDS = "M 20 360 L 144 450 L 165 423 L 41 333 Z M 1004 360 L 880 450 L 859 423 L 983 333 Z";
const BODY_HEM = "M 226 1200 Q 512 1222 798 1200";

const DESIGNS = [
  { file: "shirt-01.png", base: "#e8e1d3", stitch: "#b9af9c" },
  { file: "shirt-02.png", base: "#1f2a44", stitch: "#0f1628", stripes: "#e9e4d8" },
  { file: "shirt-03.png", base: "#b5532f", stitch: "#7d3418", pocket: true },
  { file: "shirt-04.png", base: "#9fb39a", stitch: "#73876f" },
  { file: "shirt-05.png", base: "#3b5378", stitch: "#d08a3a", twill: true, pocket: true },
  { file: "shirt-06.png", base: "#2f3033", stitch: "#1a1b1d", ringer: "#d8d2c4" },
  { file: "shirt-07.png", base: "#f0d77a", stitch: "#c4a94a" },
  { file: "shirt-08.png", base: "#2e4a3a", stitch: "#1a2e22", pocket: true },
  { file: "shirt-09.png", base: "#23252a", stitch: "#c98a45", twill: true },
];

function shirtSvg({ base, stitch, stripes, twill, pocket, ringer }) {
  const dashed = `fill="none" stroke="${stitch}" stroke-width="4" stroke-dasharray="14 10" stroke-linecap="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="shirt"><path d="${SILHOUETTE}"/></clipPath>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.14"/>
    </linearGradient>
    <pattern id="stripes" width="${W}" height="72" patternUnits="userSpaceOnUse">
      <rect y="0" width="${W}" height="26" fill="${stripes ?? "none"}"/>
    </pattern>
    <pattern id="twill" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="8" fill="#fff" fill-opacity="0.08"/>
    </pattern>
  </defs>
  <g clip-path="url(#shirt)">
    <rect width="${W}" height="${H}" fill="${base}"/>
    ${stripes ? `<rect width="${W}" height="${H}" fill="url(#stripes)"/>` : ""}
    ${twill ? `<rect width="${W}" height="${H}" fill="url(#twill)"/>` : ""}
    ${ringer ? `<path d="${SLEEVE_BANDS}" fill="${ringer}"/>` : ""}
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <path d="${NECK_INSIDE}" fill="#000" fill-opacity="0.35"/>
    <path d="${NECKLINE}" fill="none" stroke="${ringer ?? stitch}" stroke-width="24"/>
    <path d="${ARMHOLES}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="3"/>
    <path d="${SLEEVE_HEMS}" ${dashed}/>
    <path d="${BODY_HEM}" ${dashed}/>
    ${
      pocket
        ? `<rect x="610" y="300" width="120" height="135" rx="6" fill="#000" fill-opacity="0.06"/>
           <rect x="618" y="308" width="104" height="119" rx="4" ${dashed}/>`
        : ""
    }
    <path d="${SILHOUETTE}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="10"/>
  </g>
</svg>`;
}

await mkdir(OUT_DIR, { recursive: true });
for (const design of DESIGNS) {
  await sharp(Buffer.from(shirtSvg(design))).png().toFile(path.join(OUT_DIR, design.file));
  console.log(`wrote public/shirts/${design.file}`);
}
