import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { fmtPrice, fmtTime, stars, intensityStars, intensityVerdict, ctxLabel } from "@/lib/format";
import { TOOL_STATUS, TRUST_STARS, USAGE_DEMAND, SOURCE_TYPE, PLAN_SCORE_LABELS } from "@/lib/config";
import { LogoBadge } from "@/components/LogoBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { PriceTabs } from "@/components/PriceTabs";
import { RowActions } from "@/components/RowActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const plan = await db.plan.findUnique({ where: { slug }, include: { provider: true } });
  if (!plan) return { title: "未找到套餐" };
  const title = `${plan.provider.name} ${plan.name} 价格、额度与推荐指数`;
  return {
    title,
    description: `${plan.provider.name} ${plan.name}：${fmtPrice(plan.priceCny)}/月。${plan.tagline}。查看额度估算、支持模型、工具兼容性与适合人群。`,
    alternates: { canonical: `/plans/${slug}` },
    openGraph: { title, description: plan.tagline, type: "article" },
  };
}

export default async function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await db.plan.findUnique({
    where: { slug },
    include: {
      provider: true, score: true,
      models: { include: { model: { include: { provider: true, score: true } } } },
      pricePoints: { orderBy: { date: "asc" } },
      changes: { orderBy: { detectedAt: "desc" }, take: 6 },
    },
  });
  if (!row) notFound();
  const plan = toPlanT(row);
  const s = plan.score;

  // 同 Provider 其他套餐
  const siblingRows = await db.plan.findMany({ where: { providerId: row.providerId, status: "published" }, include: { provider: true, score: true } });
  const siblings = siblingRows.map(toPlanT);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 面包屑 */}
      <nav className="text-xs text-gray-400 mb-3 flex items-center gap-1" aria-label="面包屑">
        <Link href="/" className="hover:text-gray-600">首页</Link>
        <span>/</span><Link href="/plans" className="hover:text-gray-600">Coding Plan</Link>
        <span>/</span><span className="text-gray-700">{plan.name}</span>
      </nav>

      {/* 头部 */}
      <header className="card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <LogoBadge name={plan.provider.name} color={plan.provider.logoColor} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
              <Link href={`/plans`} className="hover:text-blue-600">{plan.provider.name}</Link>
              <span>·</span><span>{plan.region === "domestic" ? "国内" : "海外"} · AI Coding</span>
              <span>·</span><span>{stars(TRUST_STARS[plan.trustLevel] ?? 2)}</span>
            </div>
            <h1 className="mt-1 text-xl md:text-2xl font-bold text-gray-900">{plan.provider.name} {plan.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="num text-xl font-bold text-gray-900">{fmtPrice(plan.priceCny)}</div>
              <div className="text-[11px] text-gray-400">/{plan.billingCycle === "free" ? "永久" : "月"}{plan.priceNote ? ` · ${plan.priceNote}` : ""}</div>
            </div>
            <RowActions kind="plan" slug={plan.slug} />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-4 md:gap-7 overflow-x-auto no-scrollbar">
          <ScoreBadge value={s?.overall} label="综合推荐" size="lg" />
          {[["Coding", s?.ability], ["Agent", s?.ability && Math.min(99, s.ability + 1)], ["额度", s?.quota], ["性价比", s?.price], ["稳定性", s?.stability], ["国内体验", s?.cnExperience], ["工具兼容", s?.toolCompat]].map(([l, v]) => (
            <ScoreBadge key={String(l)} value={typeof v === "number" ? v : null} label={String(l)} />
          ))}
        </div>
      </header>

      {/* 推荐判断 */}
      <section className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="card p-4 md:p-5 border-t-[3px] border-t-emerald-500">
          <h2 className="font-semibold text-gray-900 text-sm">推荐给谁</h2>
          <ul className="mt-2.5 space-y-1.5">
            {plan.recommendedFor.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-gray-700"><Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />{r}</li>
            ))}
          </ul>
        </div>
        <div className="card p-4 md:p-5 border-t-[3px] border-t-red-300">
          <h2 className="font-semibold text-gray-900 text-sm">不推荐给谁</h2>
          <ul className="mt-2.5 space-y-1.5">
            {plan.notRecommendedFor.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-gray-500"><X size={15} className="text-red-400 shrink-0 mt-0.5" />{r}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 优势 / 局限 */}
      <section className="grid md:grid-cols-2 gap-3 mt-3">
        <ProsCons title="优势" list={plan.pros} tone="ok" />
        <ProsCons title="局限" list={plan.cons} tone="warn" />
      </section>

      {/* 套餐结构 */}
      {siblings.length > 1 && (
        <Section title="套餐结构" note={`${plan.provider.name} 全系列`}>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 font-normal">Plan</th><th className="py-2 font-normal text-right">价格</th>
                  <th className="py-2 font-normal text-right">额度</th><th className="py-2 font-normal text-center">推荐分</th>
                  <th className="py-2 pl-4 font-normal">推荐人群</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {siblings.sort((a, b) => a.priceCny - b.priceCny).map((sp) => (
                  <tr key={sp.slug} className={sp.slug === plan.slug ? "bg-blue-50/40" : ""}>
                    <td className="py-2.5"><Link href={`/plans/${sp.slug}`} className={`hover:text-blue-700 ${sp.slug === plan.slug ? "font-semibold text-blue-700" : "text-gray-800"}`}>{sp.name}</Link></td>
                    <td className="py-2.5 num text-right text-gray-800">{fmtPrice(sp.priceCny)}</td>
                    <td className="py-2.5 num text-right text-gray-600">{sp.capacityIndex}/100</td>
                    <td className="py-2.5 num text-center"><b className="text-blue-700">{sp.score?.overall ?? "–"}</b></td>
                    <td className="py-2.5 pl-4 text-xs text-gray-500 max-w-48 truncate">{sp.recommendedFor[0] || sp.tagline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 额度信息 */}
      <Section title="额度信息" note="使用容量为估算值，实际使用量受模型、任务和上下文长度影响">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
          <InfoLine k="计费类型" v={{ token: "按 Token", tokens: "Token 包", credits: "Credits", points: "Points", requests: "请求次数" }[plan.quotaType] || plan.quotaType} />
          <InfoLine k="总额度" v={plan.quotaAmount != null ? `${plan.quotaAmount.toLocaleString()} ${plan.quotaUnit ?? ""}` : plan.quotaUnit ?? "按量付费"} />
          <InfoLine k="重置周期" v={{ h5: "每 5 小时", daily: "每日", weekly: "每周", monthly: "每月", payg: "无固定周期" }[plan.quotaWindow ?? ""] ?? plan.quotaWindow ?? "—"} />
          <InfoLine k="高速额度" v={plan.fastQuota ?? "—"} />
          <InfoLine k="普通额度" v={plan.normalQuota ?? "跟随总额度"} />
          <InfoLine k="官方原始规则" v={plan.fastQuota || plan.normalQuota ? `${plan.quotaAmount ?? "按量"} ${plan.quotaUnit ?? ""}` : "见官网"} />
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-medium text-gray-500">使用强度估算（容量指数 {plan.capacityIndex}/100）</h3>
          {(["light", "medium", "heavy"] as const).map((u) => {
            const demand = USAGE_DEMAND[u];
            const v = intensityVerdict(plan.capacityIndex, demand);
            return (
              <div key={u} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{{ light: "轻度开发", medium: "中度开发", heavy: "重度 Agent" }[u]}</span>
                <span className="flex items-center gap-3">
                  <span className="tracking-widest text-blue-600 text-sm">{intensityStars(plan.capacityIndex, demand)}</span>
                  <span className={`tag w-14 justify-center ${v.tone === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : v.tone === "warn" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-red-50 text-red-600 border-red-200"}`}>{v.text}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 支持模型 */}
      <Section title="支持模型">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 font-normal">模型</th><th className="py-2 font-normal text-center">能力等级</th>
                <th className="py-2 font-normal text-center">上下文</th><th className="py-2 font-normal text-center">倍率</th>
                <th className="py-2 font-normal text-center pr-2">是否推荐</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {row.models.map(({ model, multiplier, recommended }) => (
                <tr key={model.id}>
                  <td className="py-2.5">
                    <Link href={`/models/${model.slug}`} className="text-gray-900 hover:text-blue-700 font-medium">{model.name}</Link>
                    <span className="ml-2 text-[11px] text-gray-400">{model.provider.name}</span>
                  </td>
                  <td className="py-2.5 num text-center text-gray-800"><b>{model.score?.coding ?? "–"}</b> <span className="text-[10px] text-gray-400">Coding</span></td>
                  <td className="py-2.5 num text-center text-gray-600">{ctxLabel(model.contextK)}</td>
                  <td className="py-2.5 num text-center text-gray-600">{multiplier == null ? "—" : `${multiplier}x`}</td>
                  <td className="py-2.5 text-center pr-2">{recommended ? <span className="tag bg-blue-50 text-blue-700 border-blue-200">推荐</span> : <span className="text-gray-400 text-xs">可用</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 工具兼容性 */}
      <Section title="工具兼容性">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Object.entries(plan.toolCompat).map(([tool, st]) => {
            const conf = TOOL_STATUS[st] ?? TOOL_STATUS.unverified;
            return (
              <div key={tool} className="border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-800 truncate">{tool}</span>
                <span className={`tag shrink-0 ${conf.tone}`}>{conf.label}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 价格历史 */}
      <Section title="价格历史">
        <PriceTabs points={row.pricePoints} />
      </Section>

      {/* 最近变化 */}
      <Section title="最近变化" note={<Link href="/changes" className="text-blue-600 hover:text-blue-700 text-xs normal-case font-normal">全部行情 →</Link>}>
        <ol className="space-y-0 divide-y divide-gray-100">
          {row.changes.map((c) => (
            <li key={c.id} className="py-3 flex items-start gap-4">
              <time className="num text-xs text-gray-400 w-20 shrink-0 pt-0.5">{new Date(c.detectedAt).toLocaleDateString("zh-CN")}</time>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.summary}</p>
              </div>
              <span className={`tag shrink-0 ${c.importance === "major" ? "bg-red-50 text-red-700 border-red-200" : c.importance === "normal" ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                {{ major: "重大", normal: "一般", minor: "轻微" }[c.importance]}
              </span>
            </li>
          ))}
          {!row.changes.length && <li className="py-4 text-sm text-gray-400">暂无记录</li>}
        </ol>
      </Section>

      {/* 数据来源 */}
      <footer className="card p-4 mt-4 text-xs text-gray-500 space-y-1.5">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>最后验证时间：<b className="text-gray-700 num">{plan.lastVerifiedAt ? fmtTime(plan.lastVerifiedAt) : "—"}</b></span>
          <span>来源：<b className="text-gray-700">{SOURCE_TYPE[row.changes[0]?.sourceType] || "官方"}</b></span>
          <span>可信度：<b className="text-gray-700">{stars(TRUST_STARS[plan.trustLevel] ?? 2)}</b></span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">评分依据（{PLAN_SCORE_LABELS.price}{Math.round(s?.price ?? 0)} 等）由价格水平、额度容量、模型质量与套餐限制计算得出；完整公式见「帮我选」页脚说明。</p>
        {plan.officialUrl && (
          <a href={plan.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
            查看官方来源 <ExternalLink size={12} />
          </a>
        )}
      </footer>
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <section className="card p-4 md:p-5 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {note && typeof note === "string" ? <span className="text-[11px] text-gray-400 text-right max-w-[60%]">{note}</span> : note}
      </div>
      {children}
    </section>
  );
}

function InfoLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-gray-400 text-xs w-20 shrink-0">{k}</span>
      <span className="text-gray-800 min-w-0 break-words">{v}</span>
    </div>
  );
}

function ProsCons({ title, list, tone }: { title: string; list: string[]; tone: "ok" | "warn" }) {
  return (
    <div className="card p-4 md:p-5">
      <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      <ul className="mt-2 space-y-1.5">
        {list.length ? list.map((x) => (
          <li key={x} className={`text-sm ${tone === "ok" ? "text-gray-700" : "text-gray-500"}`}>
            · {x}
          </li>
        )) : <li className="text-sm text-gray-400">暂无</li>}
      </ul>
    </div>
  );
}
