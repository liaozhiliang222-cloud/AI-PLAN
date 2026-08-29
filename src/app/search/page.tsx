import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { LogoBadge } from "@/components/LogoBadge";
import { fmtPrice, ctxLabel, quotaLabel } from "@/lib/format";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "搜索",
  robots: { index: false },
};

/** 大小写不敏感包含匹配（SQLite 的 contains 区分大小写，改在内存中过滤） */
function ciIncludes(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  // 数据量小，全量拉取后在内存做大小写不敏感过滤（避免 SQLite contains 大小写敏感问题）
  const result = await queryPublicData("search.all", async () => {
    if (!q) return null;
    const [providerRows, planRows, modelRows] = await Promise.all([
      db.provider.findMany({
        where: { plans: { some: { status: "published" } } },
        select: { id: true, name: true, slug: true, country: true, logoColor: true },
      }),
      db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } }),
      db.model.findMany({
        where: { status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null } },
        include: { provider: true, score: true },
      }),
    ]);
    return { providerRows, planRows, modelRows };
  }, null);
  if (!result.available) return <DatabaseUnavailable />;
  const providerRows = result.data?.providerRows ?? [];
  const planRows = result.data?.planRows ?? [];
  const modelRows = result.data?.modelRows ?? [];

  const providers = providerRows.filter((p) => ciIncludes(p.name, q) || ciIncludes(p.slug, q)).slice(0, 5);
  const plans = planRows
    .filter((p) => ciIncludes(p.name, q) || ciIncludes(p.slug, q) || ciIncludes(p.tagline, q))
    .slice(0, 8);
  const models = modelRows.filter((m) => ciIncludes(m.name, q) || ciIncludes(m.slug, q)).slice(0, 8);

  const total = providers.length + plans.length + models.length;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <form action="/search" className="relative mt-2">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="搜索 Claude / Kimi / K3 / GLM / Cursor…"
          aria-label="搜索套餐、模型与厂商"
          className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-blue-500"
        />
      </form>

      {!q && (
        <div className="mt-8 text-center text-sm text-gray-400">
          支持模糊匹配，例如：
          <span className="inline-flex gap-1.5 justify-center flex-wrap mt-3">
            {["Claude", "Kimi", "K3", "GLM", "Cursor", "Codex"].map((w) => (
              <Link key={w} href={`/search?q=${encodeURIComponent(w)}`} className="chip chip-idle">{w}</Link>
            ))}
          </span>
        </div>
      )}

      {q && total === 0 && (
        <div className="mt-10 text-center py-10">
          <p className="text-gray-700">没有找到「{q}」相关内容</p>
          <p className="text-sm text-gray-400 mt-1">试试品牌名或模型名（如 Kimi、K3、Claude）。</p>
          <Link href="/plans" className="btn btn-primary px-4 py-2 mt-4 inline-flex">查看全部套餐</Link>
        </div>
      )}

      {/* Plans */}
      {plans.length > 0 && (
        <Group title={`Coding Plans（${plans.length}）`}>
          {plans.map((p) => (
            <ResultRow
              key={p.id}
              href={`/plans/${p.slug}`}
              logo={{ name: p.provider.name, color: p.provider.logoColor }}
              title={`${p.provider.name} ${p.name}`}
              sub={`${fmtPrice(p.priceCny)}/月 · ${quotaLabel(p)}`}
              sourceHref={p.officialUrl}
            />
          ))}
        </Group>
      )}

      {/* Models */}
      {models.length > 0 && (
        <Group title={`Models（${models.length}）`}>
          {models.map((m) => (
            <ResultRow
              key={m.id}
              href={`/models/${m.slug}`}
              logo={{ name: m.provider.name, color: m.provider.logoColor }}
              title={m.name}
              sub={`${m.provider.name} · 上下文 ${ctxLabel(m.contextK)} · AA Intelligence ${m.score?.overall == null ? "暂无" : m.score.overall.toFixed(1)}`}
            />
          ))}
        </Group>
      )}

      {/* Providers */}
      {providers.length > 0 && (
        <Group title={`Providers（${providers.length}）`}>
          {providers.map((pv) => (
            <ResultRow
              key={pv.id}
              href={`/plans`}
              logo={{ name: pv.name, color: pv.logoColor }}
              title={pv.name}
              sub={pv.country === "domestic" ? "国内" : "海外"}
            />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{title}</h2>
      <div className="card divide-y divide-gray-100 overflow-hidden">{children}</div>
    </section>
  );
}

function ResultRow({ href, logo, title, sub, sourceHref }: { href: string; logo: { name: string; color: string }; title: string; sub: string; sourceHref?: string | null }) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
      <LogoBadge name={logo.name} color={logo.color} size={30} />
      <Link href={href} className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 truncate">{title}</span>
        <span className="block text-xs text-gray-400 truncate">{sub}</span>
      </Link>
      {sourceHref ? <a href={sourceHref} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 shrink-0">套餐来源</a> : href.startsWith("/plans/") ? <span className="text-xs text-orange-600 shrink-0">待来源复核</span> : null}
    </div>
  );
}
