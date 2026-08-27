import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { fmtPrice } from "@/lib/format";
import { LogoBadge } from "@/components/LogoBadge";

export const dynamic = "force-dynamic";

const PAGES: Record<string, { title: string; h1: string; desc: string; max?: number; freeOnly?: boolean; min?: number }> = {
  "under-100": {
    title: "¥100 内最值得买的 AI Coding Plan（2026）",
    h1: "¥100 内最佳 AI Coding Plan",
    desc: "月预算 100 元以内，综合模型能力、额度与工具兼容性筛选出的最值得购买的 AI Coding 套餐。",
    max: 100,
  },
  "under-200": {
    title: "¥200 内最值得买的 AI Coding Plan（2026）",
    h1: "¥200 内最佳 AI Coding Plan",
    desc: "月预算 200 元以内，综合评分最高的 AI Coding 套餐排行，覆盖主流 Claude Code / OpenCode 兼容方案。",
    max: 200,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) return {};
  return { title: page.title, description: page.desc, alternates: { canonical: `/best/${slug}` } };
}

export default async function BestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  const rows = await db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } });
  let plans = rows.map(toPlanT);
  if (page.max != null) plans = plans.filter((p) => p.priceCny > 0 && p.priceCny <= page.max!);
  plans.sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0));
  plans = plans.slice(0, 8);

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{page.h1}</h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{page.desc}。榜单按综合推荐指数排序，每月复核。</p>

      <ol className="mt-5 space-y-2.5">
        {plans.map((p, i) => (
          <li key={p.id}>
            <Link href={`/plans/${p.slug}`} className="card card-hover flex items-center gap-4 p-4">
              <span className="num text-lg font-bold text-gray-300 w-7">{i + 1}</span>
              <LogoBadge name={p.provider.name} color={p.provider.logoColor} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-gray-900 truncate text-sm">{p.provider.name} {p.name}</span>
                <span className="block text-xs text-gray-400 mt-0.5">{p.recommendedFor[0] || p.tagline}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="num block font-bold text-blue-600">{p.score?.overall}</span>
                <span className="num block text-xs text-gray-500">{fmtPrice(p.priceCny)}/月</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: page.title,
            itemListElement: plans.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `/plans/${p.slug}`,
              name: `${p.provider.name} ${p.name}`,
            })),
          }),
        }}
      />
      <p className="mt-6 text-[11px] text-gray-400">价格与评分为本站示例数据，购买前请以官方定价页为准。</p>
      <div className="mt-3">
        <Link href="/recommend" className="btn btn-primary px-5 py-2.5 inline-flex">按我的需求定制选择 →</Link>
      </div>
    </article>
  );
}
