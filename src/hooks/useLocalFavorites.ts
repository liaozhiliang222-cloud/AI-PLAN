"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = (k: string) => `apr:${k}`;

export interface FavStore {
  fav: { plan: string[]; model: string[] };
  compare: string[];
}

function defaultStore(): FavStore {
  return { fav: { plan: [], model: [] }, compare: [] };
}

export function favKeyOf(k: string) {
  return KEY(k);
}

/** 写入并广播变更事件（组件内使用） */
export function writeAndSync(store: FavStore) {
  try {
    localStorage.setItem(KEY("store"), JSON.stringify(store));
    window.dispatchEvent(new Event("apr-store-change"));
  } catch {}
}

/** LocalStorage 收藏/对比状态读取（客户端专用，SSR 安全） */
export function readStore(): FavStore {
  try {
    const raw = localStorage.getItem(KEY("store"));
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw);
    return {
      fav: { plan: parsed?.fav?.plan ?? [], model: parsed?.fav?.model ?? [] },
      compare: Array.isArray(parsed?.compare) ? parsed.compare.slice(0, 3) : [],
    };
  } catch {
    return defaultStore();
  }
}

export function useFavStore() {
  const [store, setStore] = useState<FavStore>(defaultStore);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setStore(readStore());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
    const h = () => refresh();
    window.addEventListener("apr-store-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("apr-store-change", h);
      window.removeEventListener("storage", h);
    };
  }, [refresh]);

  return { store, ready };
}
