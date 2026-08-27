import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { toPlanT, toModelT } from "@/lib/serialize";
import { timeAgo, fmtPrice } from "@/lib/format";
import { ChangeItem } from "@/components/ChangeItem";
import { LogoBadge } from "@/components/LogoBadge";
import { TrendBadge } from "@/components/ScoreBadge";
import { Sparkline } from "@/components/Sparkline";
import { SectionHead } from "@/components/SectionHead";
import { SITE, valuePct } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [changeRows, planRows, modelRows] = await Promise.all([
    db.changeLog.findMany({ orderBy: { detectedAt: "desc" }, take: 5 }),
    db.plan.findMany({
      where: { status: "published" },
      include: { provider: true, score: true, pricePoints: { orderBy: { date: "desc" }, take: 8 } },
    }),
    db.model.findMany({ where: { status: "active" }, include: { provider: true, score: true }, take: 40 }),
  ]);

  const plans = planRows.map(toPlanT).sort((a, b) => (b.score?.heat ?? 0) - (a.score?.heat ?? 0));
  const models = modelRows.map(toModelT).sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0));
  const nowMs = Date.now();
  const updatedAt = planRows.reduce<Date | null>(
    (acc, p) => (!acc || (p.lastVerifiedAt && p.lastVerifiedAt > acc) ? p.lastVerifiedAt : acc),
    null,
  );

  // 今日值得买：按预算带取综合分最高者
  const bands: { title: string; filter: (p: ReturnType<typeof toPlanT>) => boolean }[] = [
    { title: "¥100 内", filter: (p) => p.priceCny > 0 && p.priceCny <= 100 },
    { title: "¥200 内", filter: (p) => p.priceCny > 0 && p.priceCny <= 200 },
    { title: "重度 Coding", filter: () => true },
    { title: "性能优先", filter: () => true },
  ];
  const worth = [
    pickBest(plans.filter((p) => p.priceCny > 0 && p.priceCny <= 100), "overall"),
    pickBest(plans.filter((p) => p.priceCny > 0 && p.priceCny <= 200), "overall"),
    pickBest([...plans].sort((a, b) => (b.score?.quota ?? 0) - (a.score?.quota ?? 0)), "quota"),
    pickBest(plans, "ability"),
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center pt-6 md:pt-12">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-900">{SITE.name}</h1>
        <p className="mt-3 text-lg md:text-2xl font-semibold text-blue-700">{SITE.slogan}</p>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          实时追踪国内外 AI Coding 套餐、模型、价格与额度变化。
        </p>
        <form action="/search" className="mt-5 mx-auto max-w-md">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              placeholder="搜索 Claude / Kimi / GLM / Cursor…"
              aria-label="搜索"
              className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-blue-500 transition-colors"
            />
            <button type="submit" className="btn btn-primary absolute right-1.5 top-1.5 bottom-1.5 px-3 py-0 rounded-lg">
              搜索
            </button>
          </label>
        </form>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/recommend" className="btn btn-primary px-5 py-2.5">
            帮我选套餐 <ArrowRight size={15} />
          </Link>
          <Link href="/plans" className="btn btn-secondary px-5 py-2.5">
            查看 Coding Plan
          </Link>
        </div>
        {updatedAt && (
          <p className="mt-3 text-[11px] text-gray-400">数据更新于 {timeAgo(updatedAt, nowMs)}（Demo 示例数据）</p>
        )}
      </section>

      {/* 今日 AI 行情 */}
      <section>
        <SectionHead
          title="今日 AI 行情"
          more={{ href: "/changes", label: "全部变化" }}
          sub="最近发生的价格、额度与模型能力变化"
        />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {changeRows.map((c) => (
            <ChangeItem key={c.id} change={c} nowMs={nowMs} />
          ))}
        </div>
      </section>

      {/* 今日值得买 */}
      <section>
        <SectionHead
          title="今日值得买"
          more={{ href: "/recommend", label: "按我的需求选" }}
          sub="不同预算与场景下的当前最优解"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {bands.map((b, i) =>
            worth[i] ? (
              <BudgetCard key={b.title} title={b.title} plan={worth[i]} reason={worthReason(worth[i])} />
            ) : null,
          )}
        </div>
      </section>

      {/* Coding Plan 热榜 */}
      <section>
        <SectionHead title="Coding Plan 热榜" more={{ href: "/plans", label: "完整榜单" }} sub="按热度排序的当前热门套餐" />
        <div className="hidden md:block space-y-2">
          {plans.slice(0, 6).map((p, i) => (
            <HotRow key={p.id} rank={i + 1} plan={p} spark={reverse(planRows, p.id)} />
          ))}
        </div>
        <div className="md:hidden grid grid-cols-1 gap-2.5">
          {plans.slice(0, 5).map((p, i) => (
            <HotRow key={p.id} rank={i + 1} plan={p} compact spark={reverse(planRows, p.id)} />
          ))}
        </div>
      </section>

      {/* 模型榜 */}
      <section>
        <SectionHead title="Coding 模型榜 TOP 5" more={{ href: "/models", label: "全部模型" }} sub="面向 Coding 场景的综合模型排行" />
        <div className="card divide-y divide-gray-100 overflow-hidden">
          {models.slice(0, 5).map((m, i) => (
            <Link key={m.id} href={`/models/${m.slug}`} className="flex items-center gap-3 md:gap-4 p-3.5 hover:bg-gray-50 transition-colors">
              <span className="num w-6 text-sm font-bold text-gray-400 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <LogoBadge name={m.provider.name} color={m.provider.logoColor} size={30} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate text-sm">{m.name}</div>
                <div className="text-xs text-gray-400">{m.provider.name}</div>
              </div>
              <MiniStat v={m.score?.coding} l="Coding" hideSm />
              <MiniStat v={m.score?.agent} l="Agent" hideSm />
              <MiniStat v={m.score?.cost} l="性价比" hideSm />
              <TrendBadge trend={m.score?.trend} />
            </Link>
          ))}
        </div>
      </section>

      {/* 帮我选 CTA */}
      <section>
        <Link
          href="/recommend"
          className="block card card-hover bg-blue-600 border-blue-600 hover:bg-blue-700 text-white p-7 md:p-10 text-center transition-colors"
        >
          <h2 className="text-xl md:text-2xl font-bold">不知道买哪个？</h2>
          <p className="mt-2 text-blue-100 text-sm md:text-base">30 秒回答 5 个问题，找到更适合你的 AI Coding Plan</p>
          <span className="inline-flex items-center gap-1.5 mt-5 bg-white text-blue-700 font-semibold text-sm px-6 py-2.5 rounded-lg">
            开始选型 <ArrowRight size={15} />
          </span>
        </Link>
      </section>
    </div>
  );
}

function reverse(rows: { id: number; pricePoints: { date: Date; priceCny: number }[] }[], id: number): number[] {
  const r = rows.find((x) => x.id === id);
  return r ? r.pricePoints.map((pp) => pp.priceCny).slice(0, 7).reverse() : [];
}

function pickBest<T extends ReturnType<typeof toPlanT>>(list: T[], key: "overall" | "quota" | "ability"): T | null {
  if (!list.length) return null;
  return [...list].sort((a, b) => ((b.score?.[key] ?? 0) - (a.score?.[key] ?? 0)))[0];
}

function worthReason(p: ReturnType<typeof toPlanT>): string {
  if (p.slug.startsWith("kimi-allegretto")) return "适合中重度全栈开发与 Agent Coding";
  if (p.slug.startsWith("glm-pro")) return "同价位模型能力最强，Claude Code 官方可接";
  if (p.name.includes("Max")) return "Agent 重度工作流的天花板方案";
  if (p.slug.startsWith("claude-pro")) return "追求 Coding 上限的第一梯队选择";
  if (p.slug.startsWith("minimax")) return "额度宽松的中端全栈选择";
  return p.recommendedFor[0] || "综合表现均衡";
}

function BudgetCard({ title, plan, reason }: { title: string; plan: ReturnType<typeof toPlanT>; reason: string }) {
  return (
    <Link href={`/plans/${plan.slug}`} className="card card-hover block p-4">
      <div className="tag inline-flex bg-blue-50 text-blue-700 border-blue-200 font-medium">{title}</div>
      <div className="mt-3 flex items-center gap-2.5">
        <LogoBadge name={plan.provider.name} color={plan.provider.logoColor} size={34} />
        <div className="min-w-0">
          <div className="text-xs text-gray-400 truncate">{plan.provider.name}</div>
          <div className="font-semibold text-gray-900 truncate">{plan.name}</div>
        </div>
        <div className="ml-auto num font-bold text-blue-600 shrink-0 text-sm">{fmtPrice(plan.priceCny)}<span className="text-[10px] text-gray-400 font-normal">/月</span></div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="num text-3xl font-bold text-gray-900">{plan.score?.overall ?? "–"}</span>
        <span className="text-[11px] text-gray-400">综合推荐</span>
      </div>
      <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2">{reason}</p>
    </Link>
  );
}

function HotRow({ rank, plan, compact, spark }: { rank: number; plan: ReturnType<typeof toPlanT>; compact?: boolean; spark: number[] }) {
  const s = plan.score ?? { ability: 0, quota: 0, overall: 0, trend: 0, price: 0, toolCompat: 0, stability: 0, cnExperience: 0, heat: 0 };
  return (
    <Link href={`/plans/${plan.slug}`} className="card card-hover flex items-center gap-3 md:gap-5 p-3 md:p-4">
      <span className={`num font-bold text-gray-300 ${compact ? "w-6 text-xs" : "w-8 text-base"}`}>{String(rank).padStart(2, "0")}</span>
      <LogoBadge name={plan.provider.name} color={plan.provider.logoColor} size={compact ? 28 : 32} />
      <div className="min-w-0 w-32 md:w-44 shrink-0">
        <div className={compact ? "text-xs text-gray-400 truncate" : "text-xs text-gray-400"}>{plan.provider.name}</div>
        <div className={`font-medium text-gray-900 truncate ${compact ? "text-sm" : ""}`}>{plan.name}</div>
      </div>
      {!compact && <span className="num text-sm text-gray-900 w-20 shrink-0 hidden lg:block">{fmtPrice(plan.priceCny)}/月</span>}
      <div className="hidden lg:flex items-center gap-3 ml-auto">
        {[["Coding", s.ability], ["额度", s.quota], ["性价比", valuePct(plan.priceCny)]].map(([l, v]) => (
          <span key={String(l)} className="num text-xs text-gray-500">
            {String(l)} <b className="text-gray-800">{v}</b>
          </span>
        ))}
      </div>
      <Sparkline values={spark.length >= 2 ? spark : [1, 1]} width={52} height={18} />
      <div className="flex items-center gap-2 ml-auto lg:ml-0">
        <span className="num text-lg font-bold text-blue-600">{s.overall}</span>
        <TrendBadge trend={s.trend} />
      </div>
    </Link>
  );
}

function MiniStat({ v, l, hideSm }: { v?: number; l: string; hideSm?: boolean }) {
  return (
    <span className={`num text-xs text-gray-400 ${hideSm ? "hidden sm:inline-flex" : ""}`}>
      {l} <b className="text-gray-800">{v == null ? "–" : Math.round(v)}</b>
    </span>
  );
}

