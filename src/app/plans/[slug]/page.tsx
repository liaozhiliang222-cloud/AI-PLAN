import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { fmtPrice, fmtTime, ctxLabel, quotaLabel } from "@/lib/format";
import { TOOL_STATUS } from "@/lib/config";
import { LogoBadge } from "@/components/LogoBadge";
import { RowActions } from "@/components/RowActions";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await queryPublicData("plans.detail.metadata", () => db.plan.findFirst({ where: { slug, status: "published" }, include: { provider: true } }), null);
  const plan = result.data;
  if (!plan) return { title: "未找到套餐", robots: { index: false } };
  const title = `${plan.provider.name} ${plan.name} 价格与套餐参数`;
  return { title, description: `${fmtPrice(plan.priceCny)}/月；查看额度原文、支持模型、工具兼容与厂商官方来源。`, alternates: { canonical: `/plans/${slug}` } };
}

export default async function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await queryPublicData("plans.detail", () => db.plan.findFirst({
    where: { slug, status: "published" },
    include: {
      provider: true,
      models: { where: { model: { status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null } } }, include: { model: { include: { provider: true, score: true } } } },
      changes: { where: { sourceType: { not: "editorial" } }, orderBy: { detectedAt: "desc" }, take: 6 },
    },
  }), null);
  if (!result.available) return <DatabaseUnavailable />;
  if (!result.data) notFound();
  const row = result.data;
  const plan = toPlanT({ ...row, score: null });
  const siblingResult = await queryPublicData("plans.detail.siblings", () => db.plan.findMany({ where: { providerId: row.providerId, status: "published" }, include: { provider: true, score: true } }), []);
  const siblings = siblingResult.data.map(toPlanT).sort((a, b) => a.priceCny - b.priceCny);

  return <div className="max-w-4xl mx-auto">
    <nav className="text-xs text-gray-400 mb-3"><Link href="/">首页</Link> / <Link href="/plans">套餐参数目录</Link> / {plan.name}</nav>
    <header className="card p-5 md:p-6">
      <div className="flex gap-4 items-start">
        <LogoBadge name={plan.provider.name} color={plan.provider.logoColor} size={52} />
        <div className="flex-1 min-w-0"><p className="text-xs text-gray-400">{plan.provider.name} · {plan.region === "domestic" ? "国内" : "海外"}</p><h1 className="mt-1 text-xl md:text-2xl font-bold">{plan.provider.name} {plan.name}</h1></div>
        <div className="text-right"><div className="num text-xl font-bold">{fmtPrice(plan.priceCny)}</div><div className="text-[11px] text-gray-400">{plan.priceNote || `/${plan.billingCycle}`}</div></div>
        <RowActions kind="plan" slug={plan.slug} />
      </div>
      {!plan.officialUrl && <p className="mt-4 text-xs text-orange-700 bg-orange-50 rounded-lg p-3">当前记录缺少可点击的厂商官方来源，全部参数待官方复核。</p>}
    </header>

    {siblings.length > 1 && <Section title="同厂商套餐"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-400 border-b"><th className="py-2">套餐</th><th>价格</th><th>计费说明</th></tr></thead><tbody>{siblings.map((p) => <tr key={p.slug} className="border-b border-gray-50"><td className="py-2"><Link className="text-blue-700" href={`/plans/${p.slug}`}>{p.name}</Link></td><td>{fmtPrice(p.priceCny)}</td><td>{p.priceNote || p.billingCycle}</td></tr>)}</tbody></table></div></Section>}

    <Section title="额度与计费原文" note="未经官方链接复核的字段应视为待核验">
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Info k="计费周期" v={plan.billingCycle || "待复核"}/><Info k="额度类型" v={plan.quotaType || "待复核"}/>
        <Info k="额度数量" v={quotaLabel(plan)}/><Info k="重置周期" v={plan.quotaWindow === "payg" ? "按量结算" : plan.quotaWindow || "待复核"}/>
        <Info k="高速额度" v={plan.fastQuota || "待官方复核"}/><Info k="普通额度" v={plan.normalQuota || "待官方复核"}/>
      </div>
    </Section>

    <Section title="支持模型"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-400 border-b"><th className="py-2">模型</th><th>AA Intelligence</th><th>上下文</th><th>额度倍率</th></tr></thead><tbody>{row.models.map(({model, multiplier}) => <tr key={model.id} className="border-b border-gray-50"><td className="py-2"><Link className="text-blue-700" href={`/models/${model.slug}`}>{model.name}</Link></td><td>{model.score?.overall == null ? "未测" : model.score.overall.toFixed(1)}</td><td>{ctxLabel(model.contextK)}</td><td>{multiplier == null ? "—" : `${multiplier}x`}</td></tr>)}</tbody></table></div></Section>

    <Section title="工具兼容"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{Object.entries(plan.toolCompat).map(([tool, status]) => { const c = TOOL_STATUS[status] ?? TOOL_STATUS.unverified; return <div key={tool} className="border rounded-lg px-3 py-2 flex justify-between"><span>{tool}</span><span className={`tag ${c.tone}`}>{c.label}</span></div>; })}</div></Section>
    <footer className="card p-4 mt-4 text-xs text-gray-500">
      <p>最后核验：{plan.lastVerifiedAt ? fmtTime(plan.lastVerifiedAt) : "待官方复核"}</p>
      {plan.officialUrl ? <a href={plan.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-blue-700 font-semibold">厂商官方来源 <ExternalLink size={12}/></a> : <p className="mt-2 text-orange-700">暂无可点击官方来源。</p>}
    </footer>
  </div>;
}

function Section({title, note, children}:{title:string; note?:string; children:React.ReactNode}) { return <section className="card p-4 md:p-5 mt-3"><div className="flex justify-between mb-3"><h2 className="font-semibold text-sm">{title}</h2>{note && <span className="text-[11px] text-gray-400">{note}</span>}</div>{children}</section>; }
function Info({k,v}:{k:string;v:string}) { return <div><span className="text-xs text-gray-400 block">{k}</span><span className="text-gray-800">{v}</span></div>; }
