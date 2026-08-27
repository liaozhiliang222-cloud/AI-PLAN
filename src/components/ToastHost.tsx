"use client";

import { useEffect, useState } from "react";
import type { ToastMsg } from "./toast";

/** 监听 apr-toast 事件并渲染 Toast（挂在 layout，全局可用） */
export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastMsg>).detail;
      if (!detail?.text) return;
      setMsg(detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2200);
    };
    window.addEventListener("apr-toast", handler);
    return () => {
      window.removeEventListener("apr-toast", handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  const toneCls =
    msg.tone === "error"
      ? "bg-red-600 text-white"
      : msg.tone === "warn"
        ? "bg-orange-500 text-white"
        : "bg-gray-900 text-white";

  return (
    <div className="fixed bottom-[76px] md:bottom-5 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className={`${toneCls} px-4 py-2 rounded-lg text-sm shadow-lg`} role="status">
        {msg.text}
      </div>
    </div>
  );
}
