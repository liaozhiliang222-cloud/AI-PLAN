"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { RadarGlyph } from "./RadarGlyph";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/plans", label: "套餐参数" },
  { href: "/models", label: "模型榜" },
  { href: "/compare", label: "套餐对比" },
  { href: "/recommend", label: "帮我选" },
  { href: "/changes", label: "行情变化" },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* 桌面顶栏 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 hidden md:block">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <RadarGlyph />
            <span className="font-bold text-[15px] tracking-tight text-gray-900">AI Plan Radar</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(n.href) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <form
            className="ml-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <label className="relative block w-56 lg:w-64">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索 Claude / Kimi / GLM…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:bg-white focus:border-blue-400 transition-colors"
                aria-label="搜索套餐与模型"
              />
            </label>
          </form>
        </div>
      </header>

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 md:hidden">
        <div className="h-12 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RadarGlyph size={22} />
            <span className="font-bold text-[15px] text-gray-900">AI Plan Radar</span>
          </Link>
          <Link
            href="/search"
            aria-label="搜索"
            className="p-2 -mr-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Search size={19} />
          </Link>
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-14">
          {[
            { href: "/", label: "首页", icon: RadarGlyph },
            { href: "/plans", label: "Plan", icon: null },
            { href: "/models", label: "模型", icon: null },
            { href: "/recommend", label: "帮我选", icon: null },
          ].map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                  active ? "text-blue-700 font-medium" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <BottomIcon href={item.href} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function BottomIcon({ href }: { href: string }) {
  // 简单几何底导航图标（与品牌视觉一致，避免引入过多图标）
  const cls = "mb-0.5";
  if (href === "/")
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
      </svg>
    );
  if (href === "/plans")
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="13.5" width="18" height="6" rx="1.5" />
      </svg>
    );
  if (href === "/models")
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}
