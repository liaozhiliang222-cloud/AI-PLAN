import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { toModelT } from "@/lib/serialize";
import { MODEL_CATEGORIES } from "@/lib/config";
import { ctxLabel } from "@/lib/format";
import { LogoBadge } from "@/components/LogoBadge";
import { TrendBadge } from "@/components/ScoreBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Coding 模型排行榜 - Coding / Agent / 性价比",
  description: "面向 Coding 场景的 AI 模型排行榜：Coding、Agent、前端、后端、Debug、长上下文、速度与性价比多维评分。",
  alternates: { canonical: "/models" },
};

type CatKey = (typeof MODEL_CATEGORIES)[number]["key"];

export default async function ModelsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  const cat = (MODEL_CATEGORIES.find((c) => c.key === sp.cat)?.key ?? "overall") as CatKey;

  const rows = await db.model.findMany({ where: { status: "active" }, include: { provider: true, score: true } });
  const models = rows.map(toModelT).sort((a, b) => ((b.score?.[cat] ?? 0) - (a.score?.[cat] ?? 0)));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">AI Coding 模型排行榜</h1>
        <p className="mt-1 text-sm text-gray-500">评分区间 0–100，来源于 Benchmark、编辑部实测与社区反馈的综合。</p>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {[{ key: "all", label: "全部" }, ...MODEL_CATEGORIES].map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/models" : `/models?cat=${c.key}`}
            className={`chip ${(sp.cat ?? "all") === c.key || (c.key === "overall" && !sp.cat) ? "chip-active" : "chip-idle"}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* 桌面表格 */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-200 bg-gray-50">
              <th className="py-2.5 px-4 font-normal text-left w-12">#</th>
              <th className="py-2.5 font-normal text-left">模型</th>
              <th className="py-2.5 font-normal text-left">Provider</th>
              <th className="py-2.5 font-normal text-center w-16">综合</th>
              <th className="py-2.5 font-normal text-center w-16">Coding</th>
              <th className="py-2.5 font-normal text-center w-16">Agent</th>
              <th className="py-2.5 font-normal text-center w-16 hidden xl:table-cell">前端</th>
              <th className="py-2.5 font-normal text-center w-20">上下文</th>
              <th className="py-2.5 font-normal text-center w-16">性价比</th>
              <th className="py-2.5 px-4 font-normal text-center w-14">趋势</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {models.map((m, i) => {
              return (
                <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-4 num font-semibold text-gray-400">{i + 1}</td>
                  <td className="py-3">
                    <Link href={`/models/${m.slug}`} className="font-medium text-gray-900 hover:text-blue-700">{m.name}</Link>
                    {(m.score?.coding ?? 0) >= 93 && <span className="tag ml-2 bg-red-50 text-red-600 border-red-100">S 级</span>}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 text-gray-600 text-[13px]">
                      <LogoBadge name={m.provider.name} color={m.provider.logoColor} size={18} />{m.provider.name}
                    </span>
                  </td>
                  <td className="num text-center"><b className="text-blue-700">{m.score?.overall}</b></td>
                  <td className="num text-center text-gray-700">{m.score?.coding}</td>
                  <td className="num text-center text-gray-700">{m.score?.agent}</td>
                  <td className="num text-center text-gray-700 hidden xl:table-cell">{m.score?.frontend}</td>
                  <td className="num text-center text-gray-600">{ctxLabel(m.contextK)}</td>
                  <td className="num text-center text-gray-700">{m.score?.cost}</td>
                  <td className="px-4 text-center"><TrendBadge trend={m.score?.trend} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片 */}
      <div className="md:hidden grid gap-2.5">
        {models.map((m, i) => (
          <Link key={m.id} href={`/models/${m.slug}`} className="card card-hover p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="num text-sm font-bold text-gray-300 w-6">{i + 1}</span>
              <LogoBadge name={m.provider.name} color={m.provider.logoColor} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                <div className="text-[11px] text-gray-400">{m.provider.name} · 上下文 {ctxLabel(m.contextK)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="num text-lg font-bold text-blue-600">{m.score?.overall}</div>
                <TrendBadge trend={m.score?.trend} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
              {[["综合", m.score?.overall], ["Coding", m.score?.coding], ["Agent", m.score?.agent], ["性价比", m.score?.cost]].map(([l, v]) => (
                <div key={String(l)} className="bg-gray-50 rounded py-1.5">
                  <div className="num text-[13px] font-semibold text-gray-800">{v == null ? "–" : Math.round(Number(v))}</div>
                  <div className="text-[10px] text-gray-400">{String(l)}</div>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
        说明：评分为编辑团队基于公开基准（Benchmark）、编辑部实测与社区反馈的综合估算，非官方数据；点击「按分类查看」可切换排序维度。
      </p>
    </div>
  );
}
