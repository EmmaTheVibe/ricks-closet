import { useState } from "react";
import { BACKGROUND } from "./constants";
import GarmentImage from "./GarmentImage";
import type { ShirtConfig } from "./shirts";

type View = { label: string; src: string; hook: "front" | "side" | null; mirror: boolean };

/**
 * The still views of a garment. Side photos are stored front-facing-left: as is, that shows the
 * wearer's left side; mirrored (as on the rack's left), the wearer's right. Pants show the front only.
 */
function viewsFor(shirt: ShirtConfig): View[] {
  const pants = shirt.kind === "pants";
  const views: View[] = [{ label: "Front", src: shirt.texture, hook: pants ? null : "front", mirror: false }];
  if (shirt.side && !pants) {
    views.push({ label: "Left side", src: shirt.side, hook: "side", mirror: false });
    views.push({ label: "Right side", src: shirt.sideLeft ?? shirt.side, hook: "side", mirror: true });
  }
  return views;
}

/** Static product images: the selected view large, with a thumbnail to pick each view. */
export default function GarmentViews({ shirt }: { shirt: ShirtConfig }) {
  const views = viewsFor(shirt);
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-5" style={{ background: BACKGROUND }}>
      {/* All views stay mounted (and loaded); switching just crossfades. */}
      <div className="relative aspect-[1024/1415] h-[min(52dvh,30rem)]">
        {views.map((view, i) => (
          <div
            key={view.label}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
          >
            <GarmentImage src={view.src} alt={`${shirt.name}, ${view.label.toLowerCase()}`} hook={view.hook} mirror={view.mirror} />
          </div>
        ))}
      </div>

      {views.length > 1 && (
        <div className="flex gap-2" role="group" aria-label="Views">
          {views.map((view, i) => (
            <button
              key={view.label}
              type="button"
              aria-pressed={i === active}
              aria-label={view.label}
              onClick={() => setActive(i)}
              className={`h-20 w-16 rounded-xl border p-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${i === active ? "border-stone-900 bg-white/60" : "border-stone-900/10 hover:border-stone-900/40"}`}
            >
              <GarmentImage src={view.src} alt="" hook={view.hook} mirror={view.mirror} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
