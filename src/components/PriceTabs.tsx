"use client";

import { useState } from "react";
import { PriceLine } from "./PriceLine";

export function PriceTabs({ points }: { points: { date: Date | string; priceCny: number }[] }) {
  const [range, setRange] = useState<"30d" | "90d" | "all">("90d");
  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {([["30d", "近 30 天"], ["90d", "近 90 天"], ["all", "全部"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setRange(k)} className={`chip ${range === k ? "chip-active" : "chip-idle"}`}>
            {label}
          </button>
        ))}
      </div>
      <PriceLine points={points} range={range} />
    </div>
  );
}
