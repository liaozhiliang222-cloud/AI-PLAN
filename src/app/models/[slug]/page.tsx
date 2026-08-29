import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toModelT } from "@/lib/serialize";
import { ctxLabel, quotaLabel } from "@/lib/format";
import { AA_ORIGIN, isArtificialAnalysisUrl } from "@/lib/aa-sources";
import { LogoBadge } from "@/components/LogoBadge";
import { RowActions } from "@/components/RowActions";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await queryPublicData("models.detail.metadata", () => db.model.findFirst({
    where: { slug, status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null } },
    include: { provider: true },
  }), null);
  if (!result.available) return { title: "模型详情暂时不可用", robots: { index: false } };
  const model = result.data;
  if (!model) return { title: "未找到模型" };
  return {
    title: `${model.name} 能力评测与可用套餐`,
    description: `${model.name}（${model.provider.name}）的 Artificial Analysis 原始指标与本站可用套餐。`,
    alternates: { canonical: `/models/${slug}` },
    openGraph: { title: `${model.name} - AI Plan Radar 模型详情`, type: "article" },
  };
}

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await queryPublicData("models.detail", () => db.model.findFirst({
    where: { slug, status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null } },
    include: {
      provider: true,
      score: true,
      plans: {
        where: { plan: { status: "published" } },
        include: { plan: { include: { provider: true, score: true } } },
      },
    },
  }), null);
  if (!result.available) return <DatabaseUnavailable />;
  const row = result.data;
  if (!row) notFound();
  const model = toModelT(row);
  const aaUrl = isArtificialAnalysisUrl(row.aaSourceUrl) ? row.aaSourceUrl : AA_ORIGIN;
  const hasAaScore = Boolean(row.aaModelId && row.aaFetchedAt && row.aaSourceUrl && row.score);
  const benchmarks = [
    ["Intelligence", row.score?.overall],
    ["Coding", row.score?.coding],
    ["Agentic", row.score?.agent],
  ] as const;

  return (
    <div className="max-w-4xl mx-auto">
      <nav className="text-xs text-gray-400 mb-3 flex items-center gap-1" aria-label="面包屑">
        <Link href="/" className="hover:text-gray-600">首页</Link><span>/</span>
        <Link href="/models" className="hover:text-gray-600">模型榜单</Link><span>/</span>
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
              {model.inputPrice != null && <> · 输入 ${model.inputPrice}/1M tokens</>}
              {model.outputPrice != null && <> · 输出 ${model.outputPrice}/1M tokens</>}
            </p>
          </div>
          <RowActions kind="model" slug={model.slug} />
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {hasAaScore
              ? `AA Intelligence Index 版本 ${row.aaIndexVersion ?? "—"} · 快照 ${row.aaFetchedAt ? new Date(row.aaFetchedAt).toLocaleDateString("zh-CN") : "—"}`
              : "该模型暂无 AA 原始指标快照，以下为站内收录信息。"}
          </p>
          <a href={aaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary px-3 py-2 text-xs">
            查看 AA 官方页面 <ArrowUpRight size={14} />
          </a>
        </div>
      </header>

      {hasAaScore && (
        <section className="card p-4 md:p-5 mt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Artificial Analysis 原始指标</h2>
              <p className="mt-1 text-[11px] text-gray-400">未经本站加权；空值表示 AA 当前快照未提供该指标。</p>
            </div>
            <span className="tag bg-blue-50 text-blue-700 border-blue-200 shrink-0">AA raw</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {benchmarks.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-4 text-center">
                <div className="num text-xl md:text-2xl font-bold text-gray-900">{value == null ? "–" : Number(value.toFixed(1))}</div>
                <div className="mt-1 text-[11px] text-gray-500">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
            <Metric label="输出速度" value={row.score?.speed == null ? "–" : `${Number(row.score.speed.toFixed(1))} tok/s`} />
            <Metric label="任务成本" value={row.score?.cost == null ? "–" : `$${row.score.cost < 1 ? row.score.cost.toFixed(3) : row.score.cost.toFixed(2)}`} />
            <Metric label="API 定价" value={model.inputPrice == null ? "–" : `$${model.inputPrice}/1M 输入`} />
          </div>
        </section>
      )}

      <section className="card p-4 md:p-5 mt-3">
        <h2 className="font-semibold text-gray-900 text-sm">哪里可以用到 {model.name}？</h2>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {row.plans.slice().sort((a, b) => a.plan.priceCny - b.plan.priceCny).map(({ plan, multiplier }) => (
            <Link key={plan.id} href={`/plans/${plan.slug}`} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors block">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 text-sm truncate">{plan.provider.name} {plan.name}</span>
              </div>
              <div className="mt-1.5 num text-sm text-gray-700">
                {plan.priceCny === 0 ? "免费" : `¥${plan.priceCny}/月`}
                {multiplier && multiplier > 1 ? <span className="text-[11px] text-orange-500 ml-1.5">{multiplier}x 倍率</span> : null}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">{quotaLabel(plan)}</span>
                {plan.officialUrl && <span className="text-blue-600 text-xs">详情页有官方来源</span>}
              </div>
            </Link>
          ))}
          {row.plans.length === 0 && <p className="text-sm text-gray-400">暂未收录可用套餐</p>}
        </div>
        {model.inputPrice != null && (
          <p className="mt-3 text-xs text-gray-500">API 直连参考价：<b className="num text-gray-800">输入 ${model.inputPrice}/1M tokens{model.outputPrice != null ? ` · 输出 ${model.outputPrice}/1M tokens` : ""}</b>（USD）</p>
        )}
      </section>

      <footer className="card p-4 mt-3 text-xs text-gray-500 leading-relaxed">
        模型指标来源：Artificial Analysis 原始快照，空值不推断。关联套餐只展示公开参数，不参与 AA 模型排名。
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
      <div className="num text-sm font-semibold text-gray-800 truncate">{value}</div>
      <div className="mt-0.5 text-[11px] text-gray-400">{label}</div>
    </div>
  );
}
