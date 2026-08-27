import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toModelT } from "@/lib/serialize";
import { ctxLabel, stars, fmtPrice } from "@/lib/format";
import { SCENARIOS } from "@/lib/config";
import { LogoBadge } from "@/components/LogoBadge";
import { RowActions } from "@/components/RowActions";
import { ScoreBar } from "@/components/ScoreBar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = await db.model.findUnique({ where: { slug }, include: { provider: true, score: true } });
  if (!m) return { title: "未找到模型" };
  return {
    title: `${m.name} Coding 能力评分与可用套餐`,
    description: `${m.name}（${m.provider.name}）：综合 ${m.score?.overall ?? "—"} 分。查看 Coding / Agent / 长上下文多维评分、优劣势，以及哪些套餐可以使用该模型。`,
    alternates: { canonical: `/models/${slug}` },
    openGraph: { title: `${m.name} - AI Plan Radar 模型详情`, type: "article" },
  };
}

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await db.model.findUnique({
    where: { slug },
    include: { provider: true, score: true, plans: { include: { plan: { include: { provider: true, score: true } } } } },
  });
  if (!row) notFound();
  const model = toModelT(row);
  // score 可能缺失，提供安全默认值避免渲染崩溃
  const s = model.score ?? {
    overall: 0, coding: 0, agent: 0, frontend: 0, backend: 0,
    debug: 0, longContext: 0, speed: 0, cost: 0, trend: 0,
  };

  const dims: [string, number | null][] = [
    ["Coding", s.coding], ["Agent", s.agent], ["Frontend", s.frontend], ["Backend", s.backend],
    ["Debug", s.debug], ["Long Context", s.longContext], ["Speed", s.speed], ["Cost 性价比", s.cost],
  ];
  const scenLabels = new Map(SCENARIOS.map((x) => [x.key, x.label]));

  return (
    <div className="max-w-4xl mx-auto">
      <nav className="text-xs text-gray-400 mb-3 flex items-center gap-1" aria-label="面包屑">
        <Link href="/" className="hover:text-gray-600">首页</Link><span>/</span>
        <Link href="/models" className="hover:text-gray-600">模型榜</Link><span>/</span>
        <span className="text-gray-700">{model.name}</span>
      </nav>

      <header className="card p-5 md:p-6">
        <div className="flex items-start gap-4">
          <LogoBadge name={model.provider.name} color={model.provider.logoColor} size={52} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-400">Provider：{model.provider.name}{model.releaseDate ? ` · 发布于 ${model.releaseDate}` : ""}</div>
            <h1 className="mt-1 text-xl md:text-2xl font-bold text-gray-900">{model.name}</h1>
            <p className="mt-1 text-sm text-gray-500 num">
              上下文 {ctxLabel(model.contextK)}
              {model.inputPrice != null && <> · 输入 ¥{model.inputPrice}/M tokens</>}
              {model.outputPrice != null && <> · 输出 ¥{model.outputPrice}/M tokens</>}
              {model.inputPrice == null && <> · 无公开 API 定价</>}
            </p>
          </div>
          <RowActions kind="model" slug={model.slug} />
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-8 gap-y-2">
          <span className="num text-2xl font-bold text-blue-600">{s.overall}<span className="ml-1.5 text-[11px] font-normal text-gray-400">综合</span></span>
          <span className="text-sm text-gray-500 self-center">可信度 <span className="text-blue-600 tracking-widest">{stars(4)}</span></span>
        </div>
      </header>

      {/* 多维评分 */}
      <section className="card p-4 md:p-5 mt-3">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">能力评分</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {dims.map(([label, v]) => (
            <ScoreBar key={label} label={label} value={v ?? 0} />
          ))}
        </div>
      </section>

      {/* 推荐场景 + 弱项 */}
      <section className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="card p-4 md:p-5 border-t-[3px] border-t-emerald-500">
          <h2 className="font-semibold text-gray-900 text-sm">非常适合</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700 list-none">
            {model.recommendedScenarios.map((k) => (<li key={k}>✓ {scenLabels.get(k) ?? k}</li>))}
            {model.strengths.map((w) => (<li key={w} className="text-gray-600">· {w}</li>))}
          </ul>
        </div>
        <div className="card p-4 md:p-5 border-t-[3px] border-t-orange-400">
          <h2 className="font-semibold text-gray-900 text-sm">相对弱项</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-600 list-none">
            {model.weaknesses.length ? model.weaknesses.map((w) => (<li key={w}>× {w}</li>)) : <li>暂无明确弱项记录</li>}
          </ul>
        </div>
      </section>

      {/* 核心差异化：哪里可以用 */}
      <section className="card p-4 md:p-5 mt-3">
        <h2 className="font-semibold text-gray-900 text-sm">哪里可以用到 {model.name}？</h2>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {row.plans
            .slice()
            .sort((a, b) => (b.plan.score?.overall ?? 0) - (a.plan.score?.overall ?? 0))
            .map(({ plan: pr, multiplier, recommended }) => (
              <Link key={pr.id} href={`/plans/${pr.slug}`} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors block">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 text-sm truncate">{pr.provider.name} {pr.name}</span>
                  {recommended && <span className="tag bg-blue-50 text-blue-700 border-blue-200 shrink-0">推荐</span>}
                </div>
                <div className="mt-1.5 num text-sm text-gray-700">
                  {pr.priceCny === 0 ? "免费" : `¥${pr.priceCny}/月`}
                  {multiplier && multiplier > 1 ? <span className="text-[11px] text-orange-500 ml-1.5">{multiplier}x 倍率</span> : null}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">推荐指数 {pr.score?.overall}</span>
                  <span className="text-blue-600 text-xs tracking-widest">{stars(Math.round((pr.score?.overall ?? 60) / 20))}</span>
                </div>
              </Link>
            ))}
          {row.plans.length === 0 && <p className="text-sm text-gray-400">暂未收录可用套餐</p>}
        </div>
        {model.inputPrice != null && (
          <p className="mt-3 text-xs text-gray-500">API 直连：<b className="num text-gray-800">输入 {fmtPrice(model.inputPrice)} / M tokens · 输出 {fmtPrice(model.outputPrice)} / M tokens</b></p>
        )}
      </section>

      <footer className="card p-4 mt-3 text-xs text-gray-500">
        数据来源：Benchmark 与编辑部实测综合估算（非官方）。
      </footer>
    </div>
  );
}
