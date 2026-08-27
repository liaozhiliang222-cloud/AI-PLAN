import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { recommend, buildReasonText, type QuizAnswers } from "@/lib/recommendation";
import { fmtPrice } from "@/lib/format";
import { LogoBadge } from "@/components/LogoBadge";
import { ShareRow } from "@/components/ShareRow";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function val(sp: SP, k: string): string {
  const v = sp[k];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ["budget", "scenes", "usage", "prefs", "tool"]) {
    const v = val(sp, k);
    if (v) qs.set(k, v);
  }
  return {
    title: "推荐结果",
    robots: { index: false },
    openGraph: {
      title: "我的 AI Coding Stack - AI Plan Radar",
      images: qs.size ? [`/api/share/og?${qs.toString()}`] : undefined,
    },
  };
}

export default async function RecommendResultPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const answers: QuizAnswers = {
    budget: (["free", "50", "100", "200", "500", "500p"].includes(val(sp, "budget")) ? val(sp, "budget") : "200") as QuizAnswers["budget"],
    scenarios: val(sp, "scenes").split(",").filter(Boolean),
    usage: (["light", "medium", "heavy"].includes(val(sp, "usage")) ? val(sp, "usage") : "medium") as QuizAnswers["usage"],
    prefs: val(sp, "prefs").split(",").filter((p) => ["performance", "quota", "cost", "cnspeed", "context", "stability"].includes(p)),
    tool: val(sp, "tool"),
  };

  const rows = await db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } });
  const result = recommend(rows.map(toPlanT), answers);

  // 结果页链接（用于分享）
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/recommend/result?budget=${answers.budget}&scenes=${answers.scenarios.join(",")}&usage=${answers.usage}&prefs=${answers.prefs.join(",")}&tool=${encodeURIComponent(answers.tool)}`;

  if (!val(sp, "budget")) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-gray-700">还没有回答选型问题。</p>
        <Link href="/recommend" className="btn btn-primary px-5 py-2.5 mt-4 inline-flex">开始 30 秒选型</Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-gray-700">暂无可推荐的套餐（数据不足）。</p>
        <Link href="/plans" className="btn btn-primary px-5 py-2.5 mt-4 inline-flex">查看全部套餐</Link>
      </div>
    );
  }

  const reasonText = buildReasonText(result);

  return (
    <div className="max-w-3xl mx-auto pb-6">
      <h1 className="text-lg md:text-xl font-bold text-gray-900 text-center">你的推荐结果</h1>

      {/* 最推荐 */}
      <section className="card border-2 border-blue-600 p-5 md:p-6 mt-5 relative overflow-hidden">
        <span className="absolute top-0 right-0 bg-blue-600 text-white text-[11px] font-medium px-3 py-1 rounded-bl-lg">最推荐</span>
        <div className="flex items-start gap-4">
          <LogoBadge name={result.top.plan.provider.name} color={result.top.plan.provider.logoColor} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-400">{result.top.plan.provider.name}</div>
            <Link href={`/plans/${result.top.plan.slug}`} className="text-lg md:text-xl font-bold text-gray-900 hover:text-blue-700">{result.top.plan.name}</Link>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="num text-xl font-bold text-blue-600">{fmtPrice(result.top.plan.priceCny)}</span>
              <span className="text-xs text-gray-400">/月 · 匹配度</span>
              <span className="num font-bold text-blue-600">{result.top.matchScore}%</span>
            </div>
          </div>
          <Ring value={result.top.matchScore} />
        </div>
      </section>

      {/* 推荐理由 */}
      <section className="card p-4 md:p-5 mt-3">
        <h2 className="text-sm font-semibold text-gray-900">为什么推荐？</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{reasonText}</p>
        {result.top.reasons.length > 0 && (
          <ul className="mt-3 space-y-1">
            {result.top.reasons.map((r) => (
              <li key={r} className="flex gap-1.5 text-sm text-gray-700"><Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />{r}</li>
            ))}
          </ul>
        )}
        {result.top.tradeoffs.length > 0 && (
          <ul className="mt-2 space-y-1">
            {result.top.tradeoffs.map((r) => (<li key={r} className="text-sm text-orange-600">△ {r}</li>))}
          </ul>
        )}
      </section>

      {/* 备选 */}
      <section className="grid sm:grid-cols-2 gap-3 mt-3">
        <AltCard title="第二选择" item={result.second} />
        <AltCard title="性能优先" item={result.perf} />
      </section>

      {/* 为什么不是 X */}
      {result.notChosen && (
        <section className="card p-4 mt-3 bg-orange-50/40 border-orange-200">
          <h2 className="text-sm font-semibold text-gray-900">为什么没有推荐 {result.notChosen.planName}？</h2>
          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{result.notChosen.reason}</p>
        </section>
      )}

      {/* 分享 */}
      <section className="card p-4 mt-3">
        <h2 className="text-sm font-semibold text-gray-900">我的 AI Coding Stack</h2>
        <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
          {[["主力", shorten(result.top.plan.name)], ["辅助", shorten(result.second.plan.name)], ["预算", `${fmtPrice(result.top.plan.priceCny)}/月`], ["匹配度", `${result.top.matchScore}%`]].map(([k, v]) => (
            <div key={String(k)} className="bg-gray-50 rounded-lg py-2">
              <div className="text-[11px] text-gray-400">{String(k)}</div>
              <div className="num text-sm font-semibold text-gray-900 truncate px-1">{String(v)}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">AI Plan Radar</span>
          <ShareRow url={shareUrl} />
        </div>
      </section>

      <p className="mt-4 text-[11px] text-gray-400 leading-relaxed text-center">
        匹配度由权重模型计算：模型能力 35% · 预算 25% · 额度 20% · 工具兼容 10% · 地区稳定性 10%（按偏好动态调整）。分数为规则估算，仅供参考。
      </p>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const deg = Math.round(value * 3.6);
  return (
    <div
      className="w-14 h-14 rounded-full shrink-0 hidden sm:flex items-center justify-center"
      style={{ background: `conic-gradient(#2563EB ${deg}deg, #E5E7EB ${deg}deg)` }}
      aria-hidden
    >
      <span className="num w-11 h-11 rounded-full bg-white flex items-center justify-center text-sm font-bold text-blue-700">{value}%</span>
    </div>
  );
}

function AltCard({ title, item }: { title: string; item: { plan: ReturnType<typeof toPlanT>; matchScore: number; tradeoffs: string[] } }) {
  return (
    <Link href={`/plans/${item.plan.slug}`} className="card card-hover block p-4">
      <div className="tag inline-flex bg-gray-100 text-gray-500 border-gray-200">{title}</div>
      <div className="mt-2 flex items-center gap-2.5">
        <LogoBadge name={item.plan.provider.name} color={item.plan.provider.logoColor} size={32} />
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate text-sm">{item.plan.name}</div>
          <div className="num text-xs text-gray-500">{fmtPrice(item.plan.priceCny)}/月 · 匹配度 {item.matchScore}%</div>
        </div>
        <span className="num ml-auto text-lg font-bold text-blue-600 shrink-0">{item.matchScore}</span>
      </div>
      {item.tradeoffs[0] && <p className="mt-2 text-[11px] text-gray-400 truncate">注意：{item.tradeoffs[0]}</p>}
    </Link>
  );
}

function shorten(name: string) {
  return name.replace(/( Coding| 免费版| Pro| Plus)$/i, "").slice(0, 12);
}
