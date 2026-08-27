"use client";

import { useState } from "react";
import { Check, Share2, Link2 } from "lucide-react";

export function ShareRow({ url, title }: { url: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const full = typeof window !== "undefined" ? new URL(url, window.location.origin).href : url;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  function nativeShare() {
    if (navigator.share) navigator.share({ title: title || "AI Plan Radar", url: full }).catch(() => {});
    else copy();
  }

  return (
    <span className="flex gap-1.5">
      <button onClick={copy} className="btn btn-secondary px-2.5 py-1.5 text-xs">
        {copied ? <Check size={12} /> : <Link2 size={12} />} 复制链接
      </button>
      <button onClick={nativeShare} className="btn btn-secondary px-2.5 py-1.5 text-xs">
        <Share2 size={12} /> 分享
      </button>
    </span>
  );
}
