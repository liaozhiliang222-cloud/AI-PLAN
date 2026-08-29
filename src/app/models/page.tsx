import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";
import { AA_ORIGIN, isArtificialAnalysisUrl } from "@/lib/aa-sources";
import { ctxLabel } from "@/lib/format";
import { paginateModels } from "@/lib/model-list";
import { LogoBadge } from "@/components/LogoBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 模型排行榜",
  description: "按 Artificial Analysis Intelligence、Coding、Agentic、速度与任务成本原始指标查看本站套餐可用模型。",
  alternates: { canonical: "/models" },
};

const TABS = [
  { key: "intelligence", label: "Intelligence", title: "Intelligence Index", description: "通用推理、知识与综合能力", direction: "desc" },
  { key: "coding", label: "Coding", title: "Coding Index", description: "代码生成、修复与工程任务能力", direction: "desc" },
  { key: "agentic", label: "Agentic", title: "Agentic Index", description: "工具调用、规划与自主任务能力", direction: "desc" },
  { key: "speed", label: "速度", title: "输出速度", description: "AA 实测中位输出速度，单位 tokens/s", direction: "desc" },
  { key: "cost", label: "任务成本", title: "Intelligence Index 任务成本", description: "完成 AA Intelligence 评测任务的成本，单位 USD/任务，越低越靠前", direction: "asc" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function tabFrom(value: string | undefined): TabKey {
  return TABS.some((tab) => tab.key === value) ? (value as TabKey) : "intelligence";
}

type ModelRow = Awaited<ReturnType<typeof loadModels>>[number];

function scoreFor(model: ModelRow, tab: TabKey): number | null {
  if (tab === "coding") return model.score?.coding ?? null;
  if (tab === "agentic") return model.score?.agent ?? null;
  if (tab === "speed") return model.score?.speed ?? null;
  if (tab === "cost") return model.score?.cost ?? null;
  return model.score?.overall ?? null;
}

function fmtScore(value: number | null | undefined, tab: TabKey): string {
  if (value == null) return "–";
  if (tab === "speed") return `${Number(value.toFixed(1))} tok/s`;
  if (tab === "cost") return `$${value < 1 ? value.toFixed(3) : value.toFixed(2)}`;
  return Number(value.toFixed(1)).toString();
}

function loadModels() {
  return db.model.findMany({
    where: { status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null } },
    select: {
      id: true,
      name: true,
      slug: true,
      contextK: true,
      aaFetchedAt: true,
      aaSourceUrl: true,
      provider: { select: { name: true, logoColor: true } },
      score: { select: { overall: true, coding: true, agent: true, speed: true, cost: true } },
      _count: { select: { plans: { where: { plan: { status: "published" } } } } },
    },
    orderBy: [{ name: "asc" }],
  });
}

function pageHref(tab: TabKey, page: number): string {
  const params = new URLSearchParams();
  if (tab !== "intelligence") params.set("tab", tab);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/models?${query}` : "/models";
}

export default async function ModelsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const sp = await searchParams;
  const activeTab = tabFrom(sp.tab);
  const result = await queryPublicData("models.available", loadModels, []);
  if (!result.available) return <DatabaseUnavailable />;

  const models = result.data;
  const source = TABS.find((tab) => tab.key === activeTab)!;
  const ranked = models
    .filter((model) => scoreFor(model, activeTab) != null)
    .sort((a, b) => {
      const delta = (scoreFor(a, activeTab) ?? 0) - (scoreFor(b, activeTab) ?? 0);
      return (source.direction === "asc" ? delta : -delta) || a.name.localeCompare(b.name);
    });
  const unranked = models.filter((model) => scoreFor(model, activeTab) == null);
  const rows = [
    ...ranked.map((model, index) => ({ model, rank: index + 1 })),
    ...unranked.map((model) => ({ model, rank: null })),
  ];
  const paginated = paginateModels(rows, sp.page);
  const rankedPage = paginated.items.filter((row): row is typeof row & { rank: number } => row.rank != null);
  const unrankedPage = paginated.items.filter((row) => row.rank == null);
  const fetchedAt = models.reduce<Date | null>((latest, model) => (
    !latest || (model.aaFetchedAt && model.aaFetchedAt > latest) ? model.aaFetchedAt : latest
  ), null);

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 md:p-8">
        <span className="tag inline-flex bg-white text-blue-700 border-blue-200">Artificial Analysis 原始指标</span>
        <h1 className="mt-3 text-xl md:text-3xl font-bold text-gray-900 tracking-tight">AI 模型排行榜</h1>
        <p className="mt-2 max-w-3xl text-sm md:text-base text-gray-600 leading-relaxed">
          榜单展示已同步的 active 模型，按 AA 官方 {source.title} 原始值排序；不重新加权，不修改原始分数。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "intelligence" ? "/models" : `/models?tab=${tab.key}`}
              aria-current={tab.key === activeTab ? "page" : undefined}
              className={tab.key === activeTab ? "chip chip-active" : "chip chip-idle bg-white"}
            >
              {tab.label}
            </Link>
          ))}
          <a href={AA_ORIGIN} target="_blank" rel="noopener noreferrer" className="btn btn-secondary px-3 py-2 text-xs bg-white/80">
            AA 官方说明 <ExternalLink size={13} />
          </a>
        </div>
      </header>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{source.title}</h2>
            <p className="mt-1 text-xs text-gray-500">{source.description} · 共 {ranked.length} 个模型有 AA 数据</p>
          </div>
          <span className="text-[11px] text-gray-400 shrink-0">
            {fetchedAt ? `快照 ${new Date(fetchedAt).toLocaleDateString("zh-CN")}` : "等待首次同步"}
          </span>
        </div>

        {rankedPage.length ? (
          <div className="card mt-3 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-400">
                    <th className="py-3 px-4 font-normal w-14">名次</th>
                    <th className="py-3 px-3 font-normal">模型</th>
                    <th className="py-3 px-3 font-normal text-center">{source.label}</th>
                    <th className="py-3 px-3 font-normal text-center">上下文</th>
                    <th className="py-3 px-3 font-normal text-center">套餐</th>
                    <th className="py-3 px-4 font-normal text-right">来源</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankedPage.map(({ model, rank }) => {
                    const value = scoreFor(model, activeTab);
                    const sourceUrl = isArtificialAnalysisUrl(model.aaSourceUrl) ? model.aaSourceUrl : AA_ORIGIN;
                    return (
                      <tr key={model.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 num text-gray-400 font-semibold">#{rank}</td>
                        <td className="py-3 px-3">
                          <Link href={`/models/${model.slug}`} className="flex items-center gap-3 min-w-0 group">
                            <LogoBadge name={model.provider.name} color={model.provider.logoColor} size={32} />
                            <span className="min-w-0">
                              <span className="block text-[11px] text-gray-400 truncate">{model.provider.name}</span>
                              <span className="block font-medium text-gray-900 truncate group-hover:text-blue-700">{model.name}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="num inline-flex min-w-12 justify-center rounded-lg bg-blue-50 px-2.5 py-1 text-base font-bold text-blue-700">
                            {fmtScore(value, activeTab)}
                          </span>
                        </td>
                        <td className="py-3 px-3 num text-center text-gray-600">{model.contextK ? ctxLabel(model.contextK) : "—"}</td>
                        <td className="py-3 px-3 text-center"><span className="tag bg-gray-50 text-gray-600 border-gray-200">{model._count.plans}</span></td>
                        <td className="py-3 px-4 text-right">
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                            AA 原始数据 <ArrowUpRight size={13} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
              数据来源：Artificial Analysis API 快照；空值不推断、不补分。排名仅用于内部套餐选型，不代表模型在所有场景下绝对优劣。
            </div>
          </div>
        ) : ranked.length === 0 ? (
          <div className="card mt-3 p-8 text-center">
            <p className="text-sm font-medium text-gray-700">暂无该指标的 AA 原始数据</p>
            <p className="mt-1 text-xs text-gray-400">等待模型同步完成后展示。</p>
          </div>
        ) : null}
      </section>

      {unrankedPage.length > 0 && (
        <section>
          <div>
            <h2 className="text-base font-semibold text-gray-900">未评测 / 暂无 {source.label} 数据</h2>
            <p className="mt-1 text-xs text-gray-500">以下模型已进入本站模型库，但当前 AA 快照没有 {source.title} 原始值。</p>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {unrankedPage.map(({ model }) => (
              <Link key={model.id} href={`/models/${model.slug}`} className="card card-hover p-4 flex items-center gap-3">
                <LogoBadge name={model.provider.name} color={model.provider.logoColor} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900 truncate">{model.name}</span>
                  <span className="block mt-0.5 text-[11px] text-gray-400 truncate">{model.provider.name} · 暂无 {source.label} 分数</span>
                </span>
                <span className="tag bg-gray-50 text-gray-600 border-gray-200 shrink-0">{model._count.plans} 套餐</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {paginated.totalPages > 1 && (
        <nav aria-label="模型榜分页" className="flex items-center justify-center gap-3">
          {paginated.page > 1 ? (
            <Link href={pageHref(activeTab, paginated.page - 1)} className="btn btn-secondary px-4 py-2 text-sm">上一页</Link>
          ) : <span className="btn btn-secondary px-4 py-2 text-sm opacity-40" aria-disabled="true">上一页</span>}
          <span className="text-sm text-gray-500">第 {paginated.page} / {paginated.totalPages} 页</span>
          {paginated.page < paginated.totalPages ? (
            <Link href={pageHref(activeTab, paginated.page + 1)} className="btn btn-secondary px-4 py-2 text-sm">下一页</Link>
          ) : <span className="btn btn-secondary px-4 py-2 text-sm opacity-40" aria-disabled="true">下一页</span>}
        </nav>
      )}
    </div>
  );
}
