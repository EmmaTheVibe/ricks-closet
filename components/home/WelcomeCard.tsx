import Image from "next/image";
import CategoryTile from "./CategoryTile";
import { BACKGROUND, SIGN_INK, SIGN_PAPER } from "../rack/constants";
import { WALL_COLOR } from "../shoes/constants";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const WatchIcon = (
  <svg viewBox="0 0 48 48" className="size-20" aria-hidden {...stroke}>
    <path d="M18 9h12l1 6H17zM18 39h12l1-6H17z" />
    <circle cx="24" cy="24" r="10" />
    <path d="M24 18v6l4 3" />
  </svg>
);

export default function WelcomeCard() {
  return (
    <main
      className="flex min-h-dvh w-full flex-col items-center px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      style={{ background: BACKGROUND }}
    >
      <header className="flex flex-col items-center text-center" style={{ color: SIGN_INK }}>
        <Image src="/logo/hanger.png" alt="" width={72} height={72} priority />
        <h1 className="mt-3 leading-none">
          <span className="block text-sm font-extrabold tracking-[0.4em]">RICK’S</span>
          <span className="mt-1 block font-serif text-6xl font-bold italic">Closet</span>
        </h1>
        <p className="mt-4 max-w-sm text-sm text-stone-600">Clothes off the rack, shoes off the wall, watches from the box. Pick a room.</p>
      </header>

      <nav aria-label="Rooms" className="mt-10 w-full max-w-3xl rounded-3xl bg-white p-3 shadow-xl sm:p-4">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          <li>
            <CategoryTile
              name="Clothes"
              href="/rack"
              background={BACKGROUND}
              image={{ src: "/shirts/line-face-shirt.webp", width: 1024, height: 1280 }}
            />
          </li>
          <li>
            <CategoryTile
              name="Shoes"
              href="/shoes"
              background={WALL_COLOR}
              image={{ src: "/home/shoe.webp", width: 900, height: 533 }}
            />
          </li>
          <li className="col-span-2">
            <CategoryTile name="Accessories" href="/accessories" background={SIGN_PAPER} icon={WatchIcon} wide />
          </li>
        </ul>
      </nav>
    </main>
  );
}
