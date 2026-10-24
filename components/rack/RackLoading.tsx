/** Covers the rack while the 3D code, shirt images and lighting load; fades out when ready. */
export default function RackLoading({ visible = true }: { visible?: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none absolute inset-0 grid place-items-center bg-[#ebe8e3] transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <p role="status" className="text-lg font-bold tracking-wide text-stone-900 motion-safe:animate-pulse">
        Opening closet…
      </p>
    </div>
  );
}
