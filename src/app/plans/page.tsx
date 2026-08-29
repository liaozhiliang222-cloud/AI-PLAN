import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { toPlanT, type PlanT } from "@/lib/serialize";
import { PRICE_BANDS } from "@/lib/config";
import { FilterBar } from "@/components/FilterBar";
import { PlanRow, PlanCardMini } from "@/components/PlanRow";
import { EmptyState } from "@/components/EmptyState";
import { LogoBadge } from "@/components/LogoBadge";
import { fmtTime, fmtPrice } from "@/lib/format";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Coding 套餐参数目录",
  description: "按价格、厂商与官方公开参数浏览 AI Coding 套餐。",
  alternates: { canonical: "/plans" },
};

interface SP {
  budget?: string; region?: string; scene?: string; tool?: string; sort?: string;
}

export default async function PlansPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const result = await queryPublicData("plans.list", () => db.plan.findMany({
    where: { status: "published" },
    include: { provider: true, score: true },
  }), []);
  if (!result.available) return <DatabaseUnavailable />;
  const rows = result.data;
  const plans = rows.map(toPlanT).filter((p) => filterPlan(p, sp));

  const sort = sp.sort ?? "price";
  const sorters: Record<string, (a: PlanT, b: PlanT) => number> = {
    price: (a, b) => a.priceCny - b.priceCny,
    "price-desc": (a, b) => b.priceCny - a.priceCny,
    provider: (a, b) => `${a.provider.name} ${a.name}`.localeCompare(`${b.provider.name} ${b.name}`, "zh-CN"),
  };
  plans.sort(sorters[sort] || sorters.price);

  // 按厂商分组：组内保持当前排序结果，组间按该厂商最低价排序（选厂商排序时按名称）
  const groupMap = new Map<string, { provider: PlanT["provider"]; items: PlanT[] }>();
  for (const p of plans) {
    const g = groupMap.get(p.provider.slug) ?? { provider: p.provider, items: [] as PlanT[] };
    g.items.push(p);
    groupMap.set(p.provider.slug, g);
  }
  const groups = [...groupMap.values()];
  groups.sort((a, b) => {
    if (sort === "provider") return a.provider.name.localeCompare(b.provider.name, "zh-CN");
    return Math.min(...a.items.map((p) => p.priceCny)) - Math.min(...b.items.map((p) => p.priceCny));
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">AI Coding 套餐参数目录</h1>
        <p className="mt-1 text-sm text-gray-500">只展示价格、额度原文、工具兼容等可核验事实，不生成站内评分。</p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          共 {plans.length} 个套餐 · 来自 {groups.length} 个厂商 · 按厂商分组，点击厂商名可折叠 ·
          数据更新于 {rows[0]?.lastVerifiedAt ? fmtTime(rows[0].lastVerifiedAt).slice(0, 10) : "—"} ·
          购买前请通过详情页的厂商官方来源复核
        </p>
      </div>

      <FilterBar base="/plans" searchParams={sp as Record<string, string | undefined>} />

      {groups.length > 0 && (
        <div className="mt-5 space-y-2.5">
          {groups.map((g) => {
            const minPrice = Math.min(...g.items.map((p) => p.priceCny));
            return (
              <details key={g.provider.slug} open className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  <LogoBadge name={g.provider.name} color={g.provider.logoColor} size={22} />
                  <span className="text-sm font-semibold text-gray-900">{g.provider.name}</span>
                  <span className="tag bg-gray-50 text-gray-600 border-gray-200">{g.items.length} 个</span>
                  <span className="text-[11px] text-gray-400">{fmtPrice(minPrice)} 起</span>
                  <ChevronDown size={16} className="ml-auto shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-1.5">
                  <div className="hidden md:block">
                    {g.items.map((p, i) => (
                      <PlanRow key={p.id} rank={i + 1} plan={p} />
                    ))}
                  </div>
                  <div className="md:hidden grid gap-2.5">
                    {g.items.map((p, i) => (
                      <PlanCardMini key={p.id} rank={i + 1} plan={p} />
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {!plans.length && (
        <EmptyState title="没有符合条件的套餐" desc="试试放宽预算或场景筛选。" cta={{ href: "/plans", label: "重置筛选" }} />
      )}
    </div>
  );
}

function filterPlan(p: PlanT, sp: SP): boolean {
  if (sp.budget && sp.budget !== "all") {
    const band = PRICE_BANDS.find((b) => b.key === sp.budget);
    if (band) {
      if ("max" in band && band.max === 0 && p.priceCny !== 0) return false;
      if ("max" in band && band.max! > 0 && !(p.priceCny > 0 && p.priceCny <= band.max!)) return false;
      if ("min" in band && band.min! > 0 && p.priceCny < band.min!) return false;
    }
  }
  if (sp.region && sp.region !== "all" && p.region !== sp.region) return false;
  if (sp.scene && sp.scene !== "all" && !p.scenarios.includes(sp.scene)) return false;
  if (sp.tool && sp.tool !== "all") {
    const st = p.toolCompat[sp.tool];
    if (!st || st === "no" || st === "unverified") return false;
  }
  return true;
}
