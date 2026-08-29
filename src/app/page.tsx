import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { fmtPrice, timeAgo, quotaLabel } from "@/lib/format";
import { LogoBadge } from "@/components/LogoBadge";
import { SectionHead } from "@/components/SectionHead";
import { SITE } from "@/lib/config";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await queryPublicData("home.dashboard", async () => {
    const [plans, models] = await Promise.all([
      db.plan.findMany({ where: { status: "published", officialUrl: { not: null } }, include: { provider: true }, orderBy: [{ lastVerifiedAt: "desc" }, { priceCny: "asc" }], take: 8 }),
      db.model.findMany({ where: { status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null }, score: { isNot: null } }, include: { provider: true, score: true } }),
    ]);
    return { plans, models };
  }, null);
  if (!result.available) return <DatabaseUnavailable />;
  const plans = result.data!.plans;
  const topModels = result.data!.models.filter((m) => m.score?.overall != null).sort((a,b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0)).slice(0,5);
  const nowMs = Date.now();

  return <div className="space-y-10">
    <section className="text-center pt-6 md:pt-12">
      <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{SITE.name}</h1>
      <p className="mt-3 text-lg md:text-2xl font-semibold text-blue-700">{SITE.slogan}</p>
      <p className="mt-2 text-sm text-gray-500">聚合 AI Coding 套餐公开参数与权威模型基准，不生成站内能力评分。</p>
      <form action="/search" className="mt-5 mx-auto max-w-md"><label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input name="q" aria-label="搜索" placeholder="搜索厂商、套餐或模型…" className="w-full pl-9 pr-24 py-2.5 rounded-xl border"/><button className="btn btn-primary absolute right-1.5 top-1.5 bottom-1.5 px-3">搜索</button></label></form>
      <div className="mt-4 flex justify-center gap-3"><Link href="/plans?budget=under-100&sort=price" className="btn btn-primary px-5 py-2.5">按预算浏览 <ArrowRight size={15}/></Link><Link href="/models" className="btn btn-secondary px-5 py-2.5">查看 AA 模型榜</Link></div>
    </section>

    <section><SectionHead title="按预算浏览" more={{href:"/plans",label:"全部套餐"}} sub="以价格条件筛选，不代表推荐或排名"/><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["免费","free"],["100 元以内","under-100"],["200 元以内","under-200"],["200 元以上","over-200"]].map(([label,key]) => <Link key={key} href={`/plans?budget=${key}&sort=price`} className="card card-hover p-5 text-center font-semibold text-gray-800">{label}<span className="block mt-1 text-xs text-gray-400">价格从低到高</span></Link>)}</div></section>

    <section><SectionHead title="套餐价格速览" more={{href:"/plans",label:"参数目录"}} sub="仅展示有具体套餐来源的近期核验记录"/><div className="card divide-y divide-gray-100">{plans.map((p) => <div key={p.id} className="flex items-center gap-3 p-3"><LogoBadge name={p.provider.name} color={p.provider.logoColor} size={28}/><Link href={`/plans/${p.slug}`} className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{p.provider.name} {p.name}</span><span className="block text-[11px] text-gray-400 truncate">{quotaLabel(p)}</span></Link><span className="num font-semibold">{fmtPrice(p.priceCny)}</span><a href={p.officialUrl!} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">套餐来源</a><span className="hidden sm:inline text-[10px] text-gray-400">{p.lastVerifiedAt ? timeAgo(p.lastVerifiedAt, nowMs) : "待复核"}</span></div>)}{!plans.length && <p className="p-6 text-center text-sm text-gray-400">暂无经具体套餐链接核验的公开记录。</p>}</div></section>

    <section><SectionHead title="AA Intelligence 模型榜" more={{href:"/models",label:"完整模型榜"}} sub="Artificial Analysis Intelligence 原始值"/><div className="card divide-y divide-gray-100">{topModels.map((m,i) => <Link key={m.id} href={`/models/${m.slug}`} className="flex items-center gap-3 p-3 hover:bg-gray-50"><span className="num w-8 text-gray-300">{String(i+1).padStart(2,"0")}</span><LogoBadge name={m.provider.name} color={m.provider.logoColor} size={28}/><span className="flex-1 text-sm font-medium">{m.name}</span><span className="num text-lg font-bold text-blue-600">{m.score!.overall!.toFixed(1)}</span></Link>)}{!topModels.length && <p className="p-6 text-center text-sm text-gray-400">暂无具备完整 AA 来源信息的模型快照。</p>}</div><p className="mt-2 text-[11px] text-gray-400">模型指标为 AA 原始快照；套餐参数不参与该榜单计算。</p></section>
  </div>;
}
