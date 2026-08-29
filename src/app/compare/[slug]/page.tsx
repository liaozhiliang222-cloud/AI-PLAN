import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PublicPlanT } from "@/lib/serialize";
import { db } from "@/lib/db";
import { toPublicPlanT } from "@/lib/serialize";
import { comparePlans } from "@/lib/compare";
import { CompareTable } from "@/components/CompareTable";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

const ALIAS_MAP: Record<string, string[]> = {
  kimi: ["moonshot"], glm: ["zhipu"], zhipu: ["zhipu"], moonshot: ["moonshot"],
  minimax: ["minimax"], deepseek: ["deepseek"], volcengine: ["volcengine"],
  claude: ["anthropic"], anthropic: ["anthropic"], codex: ["openai"], openai: ["openai"], gpt: ["openai"],
  cursor: ["cursor"], github: ["github"], copilot: ["github"], google: ["google"], gemini: ["google"],
  opencode: ["opencode"],
};

/** 一次性解析全部 token，避免 N+1 与 startsWith 误命中 */
async function resolvePlans(tokens: string[]): Promise<PublicPlanT[] | null> {
  const [planRows, modelRows] = await Promise.all([
    db.plan.findMany({ where: { status: "published" }, include: { provider: true } }),
    db.model.findMany({
      where: { status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null }, plans: { some: { plan: { status: "published" } } } },
      include: {
        plans: {
          where: { plan: { status: "published" } },
          include: { plan: { include: { provider: true } } },
        },
      },
    }),
  ]);
  const all = planRows.map(toPublicPlanT);
  if (!all.length) return null;

  // 模型 slug → 该模型下价格最低的已发布套餐。
  const planByModelSlug = new Map<string, PublicPlanT>();
  for (const m of modelRows) {
    const best = m.plans
      .map((pm) => pm.plan)
      .sort((a, b) => a.priceCny - b.priceCny)[0];
    if (best) planByModelSlug.set(m.slug, toPublicPlanT(best));
  }

  const seen = new Set<string>();
  const out: PublicPlanT[] = [];
  for (const t of tokens) {
    if (!t) continue;
    // 1) 精确 plan slug
    let found = all.find((p) => p.slug === t);
    // 2) provider 别名（仅当别名命中的 provider 唯一时）
    if (!found) {
      const providers = ALIAS_MAP[t];
      if (providers) {
        const pool = all.filter((p) => providers.includes(p.provider.slug));
        if (pool.length === 1) found = pool[0];
        else if (pool.length > 1) {
          found = pool.sort((a, b) => a.priceCny - b.priceCny)[0];
        }
      }
    }
    // 3) plan slug 前缀（仅当唯一命中，避免 kimi → kimi-k3 / kimi-presto 歧义）
    if (!found) {
      const prefixHits = all.filter((p) => p.slug.startsWith(t));
      if (prefixHits.length === 1) found = prefixHits[0];
    }
    // 4) 模型 slug 精确 / 前缀（唯一）反查
    if (!found) {
      if (planByModelSlug.has(t)) found = planByModelSlug.get(t);
      else {
        const modelHits = [...planByModelSlug.keys()].filter((s) => s.startsWith(t));
        if (modelHits.length === 1) found = planByModelSlug.get(modelHits[0]);
      }
    }
    if (!found || seen.has(found.slug)) return null;
    seen.add(found.slug);
    out.push(found);
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tokens = slug.split("-vs-").filter(Boolean);
  const result = await queryPublicData("compare.detail.metadata", () => resolvePlans(tokens), null);
  if (!result.available) return { title: "套餐对比暂时不可用", robots: { index: false } };
  const plans = result.data;
  if (!plans || plans.length < 2) {
    return { title: "套餐对比", robots: { index: false } };
  }
  const names = plans.map((p) => `${p.provider.name}${p.name}`);
  const title = `${names.join(" vs ")} 公开参数对比`;
  const description = `对比 ${names.join(" 与 ")} 的价格、计费周期、额度原文、支持模型与工具兼容。`;
  const canonical = `/compare/${plans.map((p) => p.slug).join("-vs-")}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "article" },
  };
}

export default async function SeoComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tokens = slug.split("-vs-").filter(Boolean).slice(0, 3);
  const result = await queryPublicData("compare.detail", () => resolvePlans(tokens), null);
  if (!result.available) return <DatabaseUnavailable />;
  const plans = result.data;
  if (!plans || plans.length < 2) notFound();

  const conclusion = comparePlans(plans);
  const faqs = [
    {
      q: `${plans.map((p) => `${p.provider.name} ${p.name}`).join(" 和 ")} 如何对比？`,
      a: [
        ...conclusion.lines,
        ...(conclusion.advice.length ? [conclusion.advice[0]] : []),
      ].join(" "),
    },
    {
      q: `哪个套餐价格更低？`,
      a: `${conclusion.cheapest ? `${conclusion.cheapest.provider.name} ${conclusion.cheapest.name}` : plans.slice().sort((a, b) => a.priceCny - b.priceCny)[0].provider.name + " " + plans.slice().sort((a, b) => a.priceCny - b.priceCny)[0].name} 当前记录的标价最低；额度与限制请复核官方页面。`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <nav className="text-xs text-gray-400 mb-3 flex items-center gap-1" aria-label="面包屑">
        <Link href="/" className="hover:text-gray-600">首页</Link><span>/</span>
        <Link href="/compare" className="hover:text-gray-600">套餐对比</Link><span>/</span>
        <span className="text-gray-700">{plans.map((p) => p.name).join(" vs ")}</span>
      </nav>

      <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
        {plans.map((p) => `${p.provider.name} ${p.name}`).join(" vs ")} 对比
      </h1>

      {/* 一句话结论 */}
      <section className="card border-l-[3px] border-l-blue-600 p-4 md:p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900">事实摘要</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700 leading-relaxed">
          {conclusion.lines.map((l) => (<li key={l}>· {l}</li>))}
        </ul>
        {conclusion.advice.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-900 mt-4">核验提示</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-700 leading-relaxed">
              {conclusion.advice.map((l) => (<li key={l}>{l}</li>))}
            </ul>
          </>
        )}
      </section>

      <div className="mt-4">
        <CompareTable plans={plans} />
      </div>

      {/* FAQ 结构化数据（不滥用，仅此页） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <section className="mt-6 space-y-2.5">
        <h2 className="font-semibold text-gray-900 text-sm">常见问题</h2>
        {faqs.map((f) => (
          <details key={f.q} className="card p-4">
            <summary className="text-sm font-medium text-gray-800 cursor-pointer">{f.q}</summary>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
