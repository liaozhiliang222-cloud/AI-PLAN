"use client";

/* 轻量 Toast：通过自定义事件广播，ToastHost 统一渲染。
   替代原生 alert()，体验更友好且不阻塞。 */

export interface ToastMsg {
  text: string;
  tone?: "info" | "warn" | "error";
}

export function toast(text: string, tone: ToastMsg["tone"] = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMsg>("apr-toast", { detail: { text, tone } }));
}
