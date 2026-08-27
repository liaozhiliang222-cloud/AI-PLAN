import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PlanT } from "@/lib/serialize";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { comparePlans } from "@/lib/compare";
import { CompareTable } from "@/components/CompareTable";

export const dynamic = "force-dynamic";

const ALIAS_MAP: Record<string, string[]> = {
  kimi: ["moonshot"], glm: ["zhipu"], zhipu: ["zhipu"], moonshot: ["moonshot"],
  minimax: ["minimax"], deepseek: ["deepseek"], volcengine: ["volcengine"],
  claude: ["anthropic"], anthropic: ["anthropic"], codex: ["openai"], openai: ["openai"], gpt: ["openai"],
  cursor: ["cursor"], github: ["github"], copilot: ["github"], google: ["google"], gemini: ["google"],
  opencode: ["opencode"],
};

/** 一次性解析全部 token，避免 N+1 与 startsWith 误命中 */
async function resolvePlans(tokens: string[]): Promise<PlanT[] | null> {
  const [planRows, modelRows] = await Promise.all([
    db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } }),
    db.model.findMany({ where: { status: "active" }, include: { plans: { include: { plan: { include: { provider: true, score: true } } } } } }),
  ]);
  const all = planRows.map(toPlanT);
  if (!all.length) return null;

  // 模型 slug → 该模型下综合分最高的套餐（一次建好映射）
  const planByModelSlug = new Map<string, PlanT>();
  for (const m of modelRows) {
    const best = m.plans
      .map((pm) => pm.plan)
      .sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0))[0];
    if (best) planByModelSlug.set(m.slug, toPlanT(best));
  }

  const seen = new Set<string>();
  const out: PlanT[] = [];
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
          found = pool.sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0))[0];
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
  const plans = await resolvePlans(tokens);
  if (!plans || plans.length < 2) {
    return { title: "套餐对比", robots: { index: false } };
  }
  const names = plans.map((p) => `${p.provider.name}${p.name}`);
  const title = `${names.join(" vs ")} 对比｜价格、额度、性能 2026`;
  const description = `对比 ${names.join(" 与 ")} 的最新价格、支持模型、额度容量、Coding 性能与适用人群，给出结构化选购结论。`;
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
  const plans = await resolvePlans(tokens);
  if (!plans || plans.length < 2) notFound();

  const conclusion = comparePlans(plans);
  const faqs = [
    {
      q: `${plans.map((p) => `${p.provider.name} ${p.name}`).join(" 和 ")} 哪个更值得买？`,
      a: [
        ...conclusion.lines,
        ...(conclusion.advice.length ? [conclusion.advice[0]] : []),
      ].join(" "),
    },
    {
      q: `哪个套餐价格更低？`,
      a: `${conclusion.cheapest ? `${conclusion.cheapest.provider.name} ${conclusion.cheapest.name}` : plans.slice().sort((a, b) => a.priceCny - b.priceCny)[0].provider.name + " " + plans.slice().sort((a, b) => a.priceCny - b.priceCny)[0].name} 价格最低。注意低价方案通常在模型能力或额度上有取舍。`,
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
        <h2 className="text-sm font-semibold text-gray-900">一句话结论</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700 leading-relaxed">
          {conclusion.lines.map((l) => (<li key={l}>· {l}</li>))}
        </ul>
        {conclusion.advice.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-900 mt-4">场景建议</h2>
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
