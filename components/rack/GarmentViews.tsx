import { useEffect, useRef, useState, type Ref } from "react";
import { BACKGROUND } from "./constants";
import GarmentImage from "./GarmentImage";
import type { ShirtConfig } from "./shirts";

/** What a view shows, as the rack draws it: the cloth front, or the side photo as is or mirrored. */
export type ViewKind = "front" | "side" | "sideMirrored";

type View = { label: string; kind: ViewKind; src: string; hook: "front" | "side" | null; mirror: boolean };

/**
 * The still views of a garment. Side photos are stored front-facing-left: as is, that shows the
 * wearer's left side; mirrored (as on the rack's left), the wearer's right. Pants show the front only.
 */
function viewsFor(shirt: ShirtConfig): View[] {
  const pants = shirt.kind === "pants";
  const views: View[] = [{ label: "Front", kind: "front", src: shirt.texture, hook: pants ? null : "front", mirror: false }];
  if (shirt.side && !pants) {
    views.push({ label: "Left side", kind: "side", src: shirt.side, hook: "side", mirror: false });
    views.push({ label: "Right side", kind: "sideMirrored", src: shirt.sideLeft ?? shirt.side, hook: "side", mirror: true });
  }
  return views;
}

const THUMB_SHRINK = 4; // thumbnails are drawn from the large captures at a quarter size

type GarmentViewsProps = {
  shirt: ShirtConfig;
  /** The large view's box: where the View trick flies the 3D shirt to. */
  mainRef?: Ref<HTMLDivElement>;
  /** Hide the large view (the 3D shirt is standing in for it). */
  hideMain?: boolean;
  /** Each view's canvas, for the View trick to draw the garment into as lit on the rack. */
  onCaptureCanvas?: (index: number, kind: ViewKind, canvas: HTMLCanvasElement | null) => void;
  /** Which views' captures have been drawn; those show instead of the flat photos. */
  drawn?: boolean[];
};

/**
 * Product images: the selected view large, with a thumbnail to pick each view. Each view shows
 * the garment as lit on the rack when the View trick has captured it, else its flat photo.
 */
export default function GarmentViews({ shirt, mainRef, hideMain = false, onCaptureCanvas, drawn = [] }: GarmentViewsProps) {
  const views = viewsFor(shirt);
  const [active, setActive] = useState(0);
  const mains = useRef<(HTMLCanvasElement | null)[]>([]);
  const thumbs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Thumbnails are copies of the large captures, once those are drawn.
  useEffect(() => {
    drawn.forEach((done, i) => {
      const src = mains.current[i];
      const dst = thumbs.current[i];
      if (!done || !src || !dst) return;
      dst.width = Math.round(src.width / THUMB_SHRINK);
      dst.height = Math.round(src.height / THUMB_SHRINK);
      dst.getContext("2d")?.drawImage(src, 0, 0, dst.width, dst.height);
    });
  }, [drawn]);

  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-5" style={{ background: BACKGROUND }}>
      {/* All views stay mounted (and loaded); switching just crossfades. */}
      {/* Hidden with visibility, not opacity, so the hand-over from the 3D shirt is instant. */}
      <div
        ref={mainRef}
        // Sized by width (capped at the column's width), so on a tall, narrow phone it never comes
        // out wider than the panel; the aspect ratio gives the height.
        className="relative aspect-[1024/1415] w-[min(100%,calc(min(52dvh,30rem)*1024/1415))]"
        style={{ visibility: hideMain ? "hidden" : "visible" }}
      >
        {views.map((view, i) => (
          <div
            key={view.label}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
          >
            {/* "inherit", not "visible": a visible child would show through the hidden main view. */}
            <div className="h-full w-full" style={{ visibility: drawn[i] ? "hidden" : "inherit" }}>
              <GarmentImage src={view.src} alt={`${shirt.name}, ${view.label.toLowerCase()}`} hook={view.hook} mirror={view.mirror} />
            </div>
            <canvas
              ref={(el) => {
                mains.current[i] = el;
                onCaptureCanvas?.(i, view.kind, el);
              }}
              aria-hidden
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ))}
      </div>

      {views.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Views">
          {views.map((view, i) => (
            <button
              key={view.label}
              type="button"
              aria-pressed={i === active}
              aria-label={view.label}
              onClick={() => setActive(i)}
              className={`relative h-20 w-16 rounded-xl border p-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${i === active ? "border-stone-900 bg-white/60" : "border-stone-900/10 hover:border-stone-900/40"}`}
            >
              <div className="h-full w-full" style={{ visibility: drawn[i] ? "hidden" : "inherit" }}>
                <GarmentImage src={view.src} alt="" hook={view.hook} mirror={view.mirror} />
              </div>
              <canvas
                ref={(el) => {
                  thumbs.current[i] = el;
                }}
                aria-hidden
                className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
