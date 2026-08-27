"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { fmtTime } from "@/lib/format";

export default function OfflinePage() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem("apr:last-updated") || 0);
      if (t) setLastUpdated(fmtTime(new Date(t)));
    } catch {}
  }, []);

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <WifiOff size={40} className="mx-auto text-gray-300" />
      <h1 className="mt-4 font-semibold text-gray-900">当前处于离线状态</h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">
        无法连接网络。以下为最近一次缓存的数据快照，
        恢复联网后将自动刷新。
      </p>
      {lastUpdated && <p className="mt-3 num text-xs text-gray-400">最后更新时间：{lastUpdated}</p>}
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {[["/", "首页"], ["/plans", "Coding Plan"], ["/models", "模型榜"], ["/changes", "行情变化"]].map(([href, label]) => (
          <Link key={href} href={href} className="card card-hover px-4 py-2.5 text-sm text-gray-700">{label}</Link>
        ))}
      </div>
      <button onClick={() => window.location.reload()} className="btn btn-secondary px-4 py-2 mt-5 text-sm">重试连接</button>
    </div>
  );
}
