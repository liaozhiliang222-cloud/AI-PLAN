"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { PublicPlanT } from "@/lib/serialize";
import { readStore, writeAndSync, useFavStore } from "@/hooks/useLocalFavorites";
import { toast } from "./toast";
import { fmtPrice, quotaLabel } from "@/lib/format";
import { LogoBadge } from "./LogoBadge";

const FIELD_LABELS = ["价格", "计费周期", "额度原文", "支持模型", "上下文", "工具兼容"] as const;

export function CompareSection({ allPlans }: { allPlans: PublicPlanT[] }) {
  const { store, ready } = useFavStore();

  const toggle = (slug: string) => {
    const s = readStore();
    let list = s.compare.filter((x) => x !== slug);
    if (!s.compare.includes(slug) && s.compare.length >= 3) {
      toast("最多同时对比 3 个套餐", "warn");
      return;
    }
    if (!s.compare.includes(slug)) list = [...list, slug];
    s.compare = list;
    writeAndSync(s);
  };

  const picked = store.compare.map((sl) => allPlans.find((p) => p.slug === sl)).filter(Boolean) as PublicPlanT[];

  return (
    <div className="space-y-4">
      {/* 已选区 */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900">已选套餐（{picked.length}/3）</h2>
        <div className="mt-2.5 flex gap-2 flex-wrap min-h-10">
          {!ready ? (
            <Skeletons />
          ) : picked.length === 0 ? (
            <p className="text-sm text-gray-400 self-center">从下方选择最多 3 个套餐对比公开参数。</p>
          ) : (
            picked.map((p) => (
              <span key={p.slug} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg pl-2 pr-1 py-1 text-sm text-blue-900">
                <LogoBadge name={p.provider.name} color={p.provider.logoColor} size={18} />
                {p.name}
                <button onClick={() => toggle(p.slug)} aria-label="移除" className="p-0.5 hover:text-red-500"><X size={13} /></button>
              </span>
            ))
          )}
          {picked.length >= 2 && (
            <Link href={`/compare/${picked.map((p) => p.slug).join("-vs-")}`} className="btn btn-primary px-3 py-1.5 text-xs self-center ml-auto">
              固定为分享链接
            </Link>
          )}
        </div>
      </div>

      {/* 候选网格 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2.5">全部套餐</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {allPlans.sort((a, b) => a.priceCny - b.priceCny).map((p) => {
            const active = ready && store.compare.includes(p.slug);
            return (
              <div key={p.slug} className={`card p-3 transition-colors ${active ? "!border-blue-500 bg-blue-50/50" : "hover:border-gray-300"}`}>
                <button onClick={() => toggle(p.slug)} aria-pressed={active} className="text-left w-full">
                <div className="flex items-center gap-2">
                  <LogoBadge name={p.provider.name} color={p.provider.logoColor} size={22} />
                  <span className="font-medium text-sm text-gray-900 truncate flex-1">{p.name}</span>
                  <span className={`num text-xs ${active ? "text-blue-700" : "text-gray-400"} font-semibold`}>{fmtPrice(p.priceCny)}</span>
                </div>
                  <div className="mt-1 num text-xs text-gray-500">{fmtPrice(p.priceCny)}/月 · {p.region === "domestic" ? "国内" : "海外"}</div>
                </button>
                <div className="mt-2">{p.officialUrl ? <a href={p.officialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">套餐来源</a> : <span className="text-xs text-orange-600">待来源复核</span>}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 对比表 */}
      {picked.length >= 2 && <CompareTable plans={picked} />}
    </div>
  );
}

export function CompareTable({ plans }: { plans: PublicPlanT[] }) {
  const rows: { label: string; cells: React.ReactNode[] }[] = [
    {
      label: "价格",
      cells: plans.map((p) => (
        <span key={p.slug} className="num font-semibold text-gray-900">{fmtPrice(p.priceCny)}<span className="text-[10px] text-gray-400 font-normal">/月</span>{p.priceNote && <div className="text-[10px] text-gray-400 font-normal">{p.priceNote}</div>}</span>
      )),
    },
    {
      label: "计费周期",
      cells: plans.map((p) => p.billingCycle || "—"),
    },
    {
      label: "额度原文",
      cells: plans.map((p) => quotaLabel(p)),
    },
    {
      label: "支持模型 / 上下文",
      cells: plans.map((p) => p.contextNote || "—"),
    },
    {
      label: "工具兼容",
      cells: plans.map((p) => (
        <span key={p.slug} className="block max-w-44 truncate text-[11px] leading-snug" title={Object.entries(p.toolCompat).map(([t, s]) => `${t}:${s}`).join(" ")}>
          {Object.keys(p.toolCompat).slice(0, 4).join("、")}
        </span>
      )),
    },
    {
      label: "套餐来源",
      cells: plans.map((p) => p.officialUrl ? <a key={p.slug} href={p.officialUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">打开套餐来源</a> : <span key={p.slug} className="text-orange-600">待来源复核</span>),
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-3 text-left text-xs font-normal text-gray-400 w-32 shrink-0">字段</th>
              {plans.map((p) => (
                <th key={p.slug} className="py-3 px-3 text-left min-w-36">
                  <Link href={`/plans/${p.slug}`} className="flex items-center gap-1.5 group">
                    <LogoBadge name={p.provider.name} color={p.provider.logoColor} size={20} />
                    <span className="group-hover:text-blue-700 text-gray-900 font-medium text-[13px]">{p.provider.name} {p.name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-2.5 px-3 text-xs text-gray-400 align-top">{r.label}</td>
                {r.cells.map((c, i) => (<td key={i} className="py-2.5 px-3 align-top text-gray-700">{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">左右滑动查看完整参数</div>
    </div>
  );
}

function Skeletons() {
  return Array.from({ length: 3 }).map((_, i) => <span key={i} className="h-7 w-28 bg-gray-100 rounded-lg animate-pulse" />);
}

// 未使用常量导出以维持语义（供未来字段扩展）
void FIELD_LABELS;
