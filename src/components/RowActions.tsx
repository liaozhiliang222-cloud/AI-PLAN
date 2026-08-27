"use client";

import { useEffect, useState } from "react";
import { Heart, GitCompareArrows, Check } from "lucide-react";
import { readStore, writeAndSync } from "@/hooks/useLocalFavorites";
import { toast } from "./toast";

export function RowActions({ kind, slug }: { kind: "plan" | "model"; slug: string }) {
  const [fav, setFav] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  useEffect(() => {
    const s = readStore();
    setFav(s.fav[kind].includes(slug));
    setInCompare(s.compare.includes(slug));
  }, [kind, slug]);

  function toggleFav() {
    const s = readStore();
    const list = new Set(s.fav[kind]);
    if (list.has(slug)) list.delete(slug);
    else list.add(slug);
    s.fav[kind] = [...list];
    writeAndSync(s);
    setFav(list.has(slug));
  }
  function toggleCompare() {
    if (kind !== "plan") return;
    const s = readStore();
    let list = s.compare.filter((x) => x !== slug);
    if (!inCompare && list.length >= 3) {
      toast("最多同时对比 3 个套餐", "warn");
      return;
    }
    if (!inCompare) list = [...list, slug];
    s.compare = list;
    writeAndSync(s);
    setInCompare(list.includes(slug));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleFav}
        aria-label={fav ? "取消收藏" : "收藏"}
        className={`p-1.5 rounded-md transition-colors ${fav ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}
      >
        <Heart size={15} fill={fav ? "currentColor" : "none"} />
      </button>
      {kind === "plan" && (
        <button
          onClick={toggleCompare}
          aria-label={inCompare ? "移出对比" : "加入对比"}
          className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
            inCompare ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          {inCompare ? <Check size={13} /> : <GitCompareArrows size={13} />}
          {inCompare ? "已对比" : "对比"}
        </button>
      )}
    </div>
  );
}
