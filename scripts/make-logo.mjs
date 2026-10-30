import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const S = 1024;
const ARMS = "M 150 600 Q 330 470 512 420 Q 694 470 874 600";

function hangerSvg(background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b07a45"/>
      <stop offset="0.5" stop-color="#8a5629"/>
      <stop offset="1" stop-color="#6a3f1c"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8c8c8c"/>
      <stop offset="0.45" stop-color="#e6e6e6"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
  </defs>
  ${background ? `<rect width="${S}" height="${S}" fill="${background}"/>` : ""}

  <!-- Chrome hook -->
  <path d="M 512 430 L 512 300 C 512 200 610 175 645 240 C 668 285 642 322 606 312"
        fill="none" stroke="#5f5f5f" stroke-width="30" stroke-linecap="round"/>
  <path d="M 512 430 L 512 300 C 512 200 610 175 645 240 C 668 285 642 322 606 312"
        fill="none" stroke="url(#chrome)" stroke-width="22" stroke-linecap="round"/>

  <!-- Trouser bar and its uprights -->
  <path d="M 196 590 L 196 720 M 828 590 L 828 720" stroke="#5a3417" stroke-width="30" stroke-linecap="round"/>
  <rect x="172" y="700" width="680" height="42" rx="21" fill="url(#wood)" stroke="#4a2a12" stroke-width="6"/>
  <path d="M 200 714 L 824 714" stroke="#c8925a" stroke-opacity="0.45" stroke-width="5" stroke-linecap="round"/>

  <!-- Wooden shoulder arms, with a highlight and grain following the curve -->
  <path d="${ARMS}" fill="none" stroke="#4a2a12" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${ARMS}" fill="none" stroke="url(#wood)" stroke-width="84" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 170 578 Q 336 458 512 410 Q 688 458 854 578" fill="none" stroke="#d9a873" stroke-opacity="0.55"
        stroke-width="10" stroke-linecap="round"/>
  <path d="M 180 612 Q 340 494 512 446 Q 684 494 844 612" fill="none" stroke="#4a2a12" stroke-opacity="0.25"
        stroke-width="4" stroke-dasharray="90 40 30 50" stroke-linecap="round"/>
  <path d="M 200 628 Q 350 516 512 470 Q 674 516 824 628" fill="none" stroke="#4a2a12" stroke-opacity="0.2"
        stroke-width="3" stroke-dasharray="60 70 120 30" stroke-linecap="round"/>

  <!-- Brass collar where the hook enters the wood -->
  <rect x="490" y="398" width="44" height="34" rx="8" fill="#b8955a" stroke="#6b5530" stroke-width="5"/>
</svg>`;
}

const root = process.cwd();
await mkdir(path.join(root, "public", "logo"), { recursive: true });

const transparent = Buffer.from(hangerSvg(null));
await sharp(transparent).png().toFile(path.join(root, "public", "logo", "hanger.png"));
await sharp(transparent)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(root, "app", "icon.png"));
await sharp(Buffer.from(hangerSvg("#ebe8e3"))).resize(180, 180).png().toFile(path.join(root, "app", "apple-icon.png"));

console.log("wrote public/logo/hanger.png, app/icon.png, app/apple-icon.png");
