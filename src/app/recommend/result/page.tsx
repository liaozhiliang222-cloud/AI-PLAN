import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { toPublicPlanT } from "@/lib/serialize";
import { recommend, buildReasonText, INTENSITY_LABELS, type QuizAnswers, type IntensityKey } from "@/lib/recommendation";
import { fmtPrice, quotaLabel } from "@/lib/format";
import { SCENARIOS } from "@/lib/config";
import { LogoBadge } from "@/components/LogoBadge";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;
const val = (sp: SP, k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] ?? "" : v ?? ""; };
const oneOf = <T extends string>(v: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

export const metadata: Metadata = { title: "帮我选 · 候选套餐", robots: { index: false } };

const SCENARIO_LABELS: Record<string, string> = Object.fromEntries(SCENARIOS.map((s) => [s.key, s.label]));

export default async function RecommendResultPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (!val(sp, "budget")) {
    return (
      <div className="text-center py-16">
        <p>还没有填写筛选条件。</p>
        <Link href="/recommend" className="btn btn-primary mt-4 px-5 py-2.5 inline-flex">开始筛选</Link>
      </div>
    );
  }

  // 旧链接可能没有 scenario / intensity，给默认值以保持向后兼容
  const answers: QuizAnswers = {
    scenario: oneOf(val(sp, "scenario"), ["all", ...SCENARIOS.map((s) => s.key)], "all"),
    intensity: oneOf(val(sp, "intensity"), ["light", "medium", "heavy"] as const, "medium") as IntensityKey,
    budget: oneOf(val(sp, "budget"), ["free", "100", "200", "500", "500p"] as const, "200"),
    region: oneOf(val(sp, "region"), ["all", "domestic", "overseas"] as const, "all"),
    tool: val(sp, "tool") || "无所谓",
  };

  const dbResult = await queryPublicData("recommend.result", () => db.plan.findMany({
    where: { status: "published" }, include: { provider: true },
  }), []);
  if (!dbResult.available) return <DatabaseUnavailable />;
  const result = recommend(dbResult.data.map(toPublicPlanT), answers);
  if (!result) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-600">没有套餐同时满足你选的硬条件。</p>
        <p className="mt-1.5 text-sm text-gray-400">试试放宽预算，或把「必须官方支持的工具」改成无所谓。</p>
        <Link href="/recommend" className="btn btn-primary mt-5 px-5 py-2.5 inline-flex">重新筛选</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-center">帮你选出的候选套餐</h1>
      <p className="mt-2 text-sm text-gray-500 text-center">{buildReasonText(result)}</p>

      {/* 本次筛选条件回显 */}
      <div className="mt-4 card p-3.5">
        <p className="text-[11px] text-gray-400 mb-2">本次条件</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip chip-active">场景：{result.profile.scenarioLabel}</span>
          <span className="chip chip-active">强度：{INTENSITY_LABELS[answers.intensity]}</span>
          <span className="chip chip-active">预算：{result.profile.budgetLabel}</span>
          <span className="chip chip-active">区域：{result.profile.regionLabel}</span>
          <span className="chip chip-active">工具：{result.profile.toolLabel}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {result.candidates.map((item, idx) => {
          const tone = item.intensity.verdict.tone;
          const toneCls =
            tone === "ok" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : tone === "warn" ? "text-amber-700 bg-amber-50 border-amber-200"
                : "text-red-700 bg-red-50 border-red-200";
          return (
            <article key={item.plan.id} className="card p-4">
              <div className="flex gap-3 items-start">
                <LogoBadge name={item.plan.provider.name} color={item.plan.provider.logoColor} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">最匹配</span>}
                    <Link href={`/plans/${item.plan.slug}`} className="font-semibold text-gray-900 hover:text-blue-700 truncate">
                      {item.plan.provider.name} {item.plan.name}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{quotaLabel(item.plan)}</p>
                  {/* 使用强度 */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] text-gray-400 border-b border-dotted border-gray-300 cursor-help"
                      title="编辑部按套餐额度量级归一化到 0-100 的指标，用于比较额度大小，不是厂商官方数据"
                    >
                      额度容量
                    </span>
                    <span className="num text-sm text-blue-600">{item.intensity.stars}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded border ${toneCls}`}
                      title={`对比你选的「${INTENSITY_LABELS[answers.intensity]}」需求（阈值 ${item.intensity.demand}）`}
                    >
                      {item.intensity.verdict.text}
                    </span>
                    {item.scenarioMatch && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                        覆盖「{SCENARIO_LABELS[answers.scenario] ?? answers.scenario}」
                      </span>
                    )}
                  </div>
                  {/* 场景标签 */}
                  {item.plan.scenarios.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.plan.scenarios.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
                          {SCENARIO_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="num font-semibold text-gray-900">{fmtPrice(item.plan.priceCny)}</p>
                  <p className="text-[10px] text-gray-400">/月</p>
                  {item.plan.officialUrl && (
                    <a href={item.plan.officialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">
                      官方来源
                    </a>
                  )}
                </div>
              </div>

              {item.matchedConditions.length > 0 && (
                <ul className="mt-3 text-sm text-gray-600 space-y-1">
                  {item.matchedConditions.map((x) => <li key={x}>· {x}</li>)}
                </ul>
              )}
              {item.notices.length > 0 && (
                <ul className="mt-2 text-xs text-orange-700 space-y-1">
                  {item.notices.map((x) => <li key={x}>注意：{x}</li>)}
                </ul>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
        规则：预算、区域、指定工具为硬条件，不满足直接排除；使用场景与额度容量为排序依据，额度不足时给出提醒但不排除。
        排序按命中条件数、价格升序。全程未使用任何主观能力评分。
      </p>
      <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
        说明：「额度容量」是编辑部把各家套餐的额度量级归一化到 0-100 后的比较指标（各家单位不同：积分 / 次数 / token，无法直接对比），
        <strong className="text-gray-500">不是厂商官方数据</strong>，仅供判断「够不够用」；具体额度请以套餐详情页的额度原文与官方来源为准。
      </p>
    </div>
  );
}
