import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";
import { toPlanT } from "@/lib/serialize";
import { fmtPrice, quotaLabel } from "@/lib/format";
import { LogoBadge } from "@/components/LogoBadge";

export const dynamic = "force-dynamic";

const PAGES: Record<string, { title: string; h1: string; desc: string; max?: number; freeOnly?: boolean; min?: number }> = {
  "under-100": {
    title: "¥100 内 AI Coding 套餐清单",
    h1: "¥100 内 AI Coding 套餐",
    desc: "月标价 100 元以内的已发布套餐，按价格从低到高列出。",
    max: 100,
  },
  "under-200": {
    title: "¥200 内 AI Coding 套餐清单",
    h1: "¥200 内 AI Coding 套餐",
    desc: "月标价 200 元以内的已发布套餐，按价格从低到高列出。",
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

  const result = await queryPublicData("best.list", () => db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } }), []);
  if (!result.available) return <DatabaseUnavailable />;
  const rows = result.data;
  let plans = rows.map(toPlanT);
  if (page.max != null) plans = plans.filter((p) => p.priceCny > 0 && p.priceCny <= page.max!);
  plans.sort((a, b) => a.priceCny - b.priceCny);
  plans = plans.slice(0, 8);

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{page.h1}</h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{page.desc}仅作预算清单，不代表推荐或能力排名。</p>

      <ol className="mt-5 space-y-2.5">
        {plans.map((p, i) => (
          <li key={p.id}>
            <article className="card card-hover flex items-center gap-4 p-4">
              <span className="num text-lg font-bold text-gray-300 w-7">{i + 1}</span>
              <LogoBadge name={p.provider.name} color={p.provider.logoColor} size={34} />
              <span className="min-w-0 flex-1">
                <Link href={`/plans/${p.slug}`} className="block font-medium text-gray-900 truncate text-sm">{p.provider.name} {p.name}</Link>
                <span className="block text-xs text-gray-400 mt-0.5">{quotaLabel(p)}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="num block text-xs text-gray-500">{fmtPrice(p.priceCny)}/月</span>
                {p.officialUrl ? <a href={p.officialUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs text-blue-600">套餐来源</a> : <span className="block mt-1 text-xs text-orange-600">待来源复核</span>}
              </span>
            </article>
          </li>
        ))}
      </ol>
      {!plans.length && <p className="card mt-5 p-6 text-center text-sm text-gray-400">暂无该预算范围内的已核验公开套餐。</p>}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: page.title,
            hasPart: plans.map((p) => ({
              "@type": "WebPage",
              url: `/plans/${p.slug}`,
              name: `${p.provider.name} ${p.name}`,
            })),
          }),
        }}
      />
      <p className="mt-6 text-[11px] text-gray-400">购买前请通过「套餐来源」复核价格与限制；缺少来源的记录会标记为待复核。</p>
      <div className="mt-3">
        <Link href="/plans" className="btn btn-primary px-5 py-2.5 inline-flex">查看全部参数 →</Link>
      </div>
    </article>
  );
}
