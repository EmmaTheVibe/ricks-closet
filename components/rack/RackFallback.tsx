import { SHIRTS } from "./shirts";

/** Shown when WebGL is unavailable: a plain horizontal scroll of the shirt images. */
export default function RackFallback() {
  return (
    <ul className="flex h-full snap-x snap-mandatory items-center gap-6 overflow-x-auto px-[15vw]">
      {SHIRTS.map((shirt) => (
        <li key={shirt.id} className="w-[70vw] max-w-sm shrink-0 snap-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static transparent PNGs, no optimisation needed */}
          <img src={shirt.texture} alt={shirt.name} className="aspect-[4/5] w-full object-contain" />
          <p className="mt-3 text-sm font-medium text-stone-900">{shirt.name}</p>
          <p className="font-mono text-xs text-stone-500">{shirt.price}</p>
        </li>
      ))}
    </ul>
  );
}
