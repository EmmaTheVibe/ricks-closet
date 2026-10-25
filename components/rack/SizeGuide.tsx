import { useState } from "react";
import { formatMeasure, SIZE_GUIDES } from "./sizeGuideData";
import type { SizedKind } from "./shirts";

type SizeGuideProps = { id: string; kind: SizedKind; selected: string | null };

/** The size guide table, with UK/US/EU sizes and body measurements in cm or inches. */
export default function SizeGuide({ id, kind, selected }: SizeGuideProps) {
  const guide = SIZE_GUIDES[kind];
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const unitButton = (u: "cm" | "in") =>
    `rounded-full px-2.5 py-1 text-xs font-bold transition ${unit === u ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-900/5"}`;

  return (
    <div id={id} className="rounded-2xl border border-stone-900/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Size guide</p>
        <div className="flex rounded-full border border-stone-900/15 p-0.5" role="group" aria-label="Units">
          {(["cm", "in"] as const).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)} className={unitButton(u)}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Size guide: UK, US and EU sizes, and body measurements in {unit === "cm" ? "centimetres" : "inches"}
          </caption>
          <thead className="text-xs text-stone-500">
            <tr>
              {["Size", "UK", "US", "EU", ...guide.measures].map((h) => (
                <th key={h} scope="col" className="pb-2 pr-3 font-bold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {guide.rows.map((row) => {
              const picked = row.size === selected;
              return (
                <tr key={row.size} className={picked ? "bg-stone-900/5 font-bold" : ""} aria-current={picked ? "true" : undefined}>
                  <th scope="row" className="rounded-l-lg py-1.5 pr-3 pl-1 font-sans font-bold">
                    {row.size}
                  </th>
                  <td className="py-1.5 pr-3">{row.uk}</td>
                  <td className="py-1.5 pr-3">{row.us}</td>
                  <td className="py-1.5 pr-3">{row.eu}</td>
                  {row.cm.map((m, i) => (
                    <td key={guide.measures[i]} className="py-1.5 pr-3 whitespace-nowrap last:rounded-r-lg">
                      {formatMeasure(m, unit)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">Body measurements. {guide.note}</p>
    </div>
  );
}
