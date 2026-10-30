import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type CategoryTileProps = {
  name: string;
  href?: string;
  background: string;
  image?: { src: string; width: number; height: number };
  icon?: ReactNode;
  wide?: boolean;
};

export default function CategoryTile({ name, href, background, image, icon, wide = false }: CategoryTileProps) {
  const body = (
    <>
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
  const tile = `group flex ${wide ? "aspect-[2/1] sm:aspect-[5/2]" : "aspect-[4/5]"} flex-col overflow-hidden rounded-2xl`;

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
