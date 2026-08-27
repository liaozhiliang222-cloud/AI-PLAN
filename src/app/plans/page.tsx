import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toPlanT, type PlanT } from "@/lib/serialize";
import { PRICE_BANDS, valuePct } from "@/lib/config";
import { FilterBar } from "@/components/FilterBar";
import { PlanRow, PlanCardMini } from "@/components/PlanRow";
import { EmptyState } from "@/components/EmptyState";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Coding Plan 排行榜 - 价格、额度与推荐指数",
  description: "综合模型能力、额度、价格、工具兼容性与使用体验评估的 AI Coding 套餐排行榜。",
  alternates: { canonical: "/plans" },
};

interface SP {
  budget?: string; region?: string; scene?: string; tool?: string; sort?: string;
}

export default async function PlansPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rows = await db.plan.findMany({
    where: { status: "published" },
    include: { provider: true, score: true },
  });
  const plans = rows.map(toPlanT).filter((p) => filterPlan(p, sp));

  const sort = sp.sort ?? "overall";
  const sorters: Record<string, (a: PlanT, b: PlanT) => number> = {
    overall: cmp((p) => p.score?.overall),
    value: cmp((p) => valuePct(p.priceCny) * 0.4 + (p.score?.price ?? 0) * 0.6),
    coding: cmp((p) => p.score?.ability),
    agent: cmp((p) => p.score?.ability), // Agent 能力以模型能力为主要代理指标
    quota: cmp((p) => p.score?.quota ?? p.capacityIndex),
    price: (a, b) => a.priceCny - b.priceCny,
    heat: cmp((p) => p.score?.heat),
  };
  plans.sort(sorters[sort] || sorters.overall);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">AI Coding Plan 排行榜</h1>
        <p className="mt-1 text-sm text-gray-500">综合模型能力、额度、价格、工具兼容性与使用体验进行评估。</p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          共 {plans.length} 个套餐 · 数据更新于 {rows[0]?.lastVerifiedAt ? fmtTime(rows[0].lastVerifiedAt).slice(0, 10) : "—"} ·
          Demo 示例数据，以官方页面为准
        </p>
      </div>

      <FilterBar base="/plans" searchParams={sp as Record<string, string | undefined>} />

      <div className="mt-5 hidden md:flex items-center gap-5 px-4 text-[11px] text-gray-400 pb-2">
        <span className="w-7">#</span><span className="flex-1">Provider / Plan</span><span className="w-20 text-right">价格</span>
        <span className="w-56 text-center">Coding · 额度 · 性价比</span><span className="text-center">综合</span><span className="w-36">适合场景</span>
      </div>

      <div className="hidden md:block">
        {plans.map((p, i) => (
          <PlanRow key={p.id} rank={i + 1} plan={p} />
        ))}
      </div>
      <div className="md:hidden grid gap-2.5">
        {plans.map((p, i) => (
          <PlanCardMini key={p.id} rank={i + 1} plan={p} />
        ))}
      </div>

      {!plans.length && (
        <EmptyState title="没有符合条件的套餐" desc="试试放宽预算或场景筛选。" cta={{ href: "/plans", label: "重置筛选" }} />
      )}
    </div>
  );
}

function cmp(get: (p: PlanT) => number | null | undefined) {
  return (a: PlanT, b: PlanT) => (get(b) ?? 0) - (get(a) ?? 0);
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
