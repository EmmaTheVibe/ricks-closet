import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type CategoryTileProps = {
  name: string;
  /** The room's route; none while it's still to come. */
  href?: string;
  background: string;
  /** A product image (transparent WebP), or an icon for a room that's coming. */
  image?: { src: string; width: number; height: number };
  icon?: ReactNode;
};

/** One room of the shop on the welcome card: a picture, its name, and a way in (or "Coming soon"). */
export default function CategoryTile({ name, href, background, image, icon }: CategoryTileProps) {
  const body = (
    <>
      {/* Centred in the space above the label, and never bigger than it (min-h-0 lets it shrink). */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-5">
        {image ? (
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 20rem, 45vw"
            className="h-auto max-h-full w-auto max-w-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className="text-stone-900/30">{icon}</div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 px-4 pb-4">
        <span className="text-base font-bold tracking-wide text-stone-900">{name}</span>
        <span className="text-xs font-bold whitespace-nowrap text-stone-900/60">{href ? "Enter →" : "Coming soon"}</span>
      </div>
    </>
  );
  const tile = "group flex aspect-[4/5] flex-col overflow-hidden rounded-2xl";

  return href ? (
    <Link
      href={href}
      className={`${tile} transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900`}
      style={{ background }}
    >
      {body}
    </Link>
  ) : (
    <div className={tile} style={{ background }} aria-label={`${name}, coming soon`}>
      {body}
    </div>
  );
}
