import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CHANGE_TYPES } from "@/lib/config";
import { fmtTime } from "@/lib/format";
import { ChangeItem } from "@/components/ChangeItem";
import Link from "next/link";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export const metadata: Metadata = {
  title: "AI 大模型资讯 · 更新日志",
  description: "追踪国内外 AI Coding 套餐的新模型、价格变化、额度调整、上下线与规则变更。",
  alternates: { canonical: "/changes" },
};

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; before?: string }>;
}) {
  const sp = await searchParams;
  const before = sp.before ? Number(sp.before) : undefined;

  // 游标分页：以 id 为游标，取比 before 更旧的一页。
  // changeType "update" 是采集内部的待解析信号（LLM 解析后升级或删除），不上页面。
  const where = {
    sourceType: { not: "editorial" },
    sourceUrl: { not: null },
    sourceTitle: { not: null },
    checkedAt: { not: null },
    verified: true,
    changeType: { not: "update" },
    ...(sp.type && sp.type !== "all" ? { changeType: sp.type } : {}),
    ...(before ? { id: { lt: before } } : {}),
  };

  const result = await queryPublicData("changes.list", () => db.changeLog.findMany({
    where,
    orderBy: { detectedAt: "desc" },
    take: PAGE_SIZE + 1, // 多取一条判断是否还有下一页
  }), []);
  if (!result.available) return <DatabaseUnavailable />;
  const rows = result.data;

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = items.length ? items[items.length - 1].id : undefined;

  const nowMs = Date.now();
  // 「最新检测」读监控源的真实检查时间（含 RSS 源），而不是最新资讯条目时间——
  // 后者在没有新资讯时会显得"很久没检测"，具有误导性。
  const agg = await queryPublicData("changes.lastCheck", () =>
    db.sourceMonitor.aggregate({ _max: { lastCheckedAt: true } }), { _max: { lastCheckedAt: null } });
  const lastVerified = agg.data._max.lastCheckedAt ?? items[0]?.detectedAt;

  // 构造下一页链接，保留 type 筛选
  const nextParams = new URLSearchParams();
  if (sp.type && sp.type !== "all") nextParams.set("type", sp.type);
  if (hasMore && nextCursor) nextParams.set("before", String(nextCursor));
  const nextHref = hasMore ? ("/changes?" + nextParams.toString()) : "";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">AI 大模型资讯</h1>
      <p className="mt-1 text-sm text-gray-500">
        最近的价格、额度与模型能力变化{lastVerified ? ` · 最新检测于 ${fmtTime(lastVerified)}` : ""}。
      </p>

      <div className="flex gap-1.5 flex-wrap mt-4 mb-4">
        <Link href="/changes" className={`chip ${!sp.type || sp.type === "all" ? "chip-active" : "chip-idle"}`}>全部</Link>
        {Object.entries(CHANGE_TYPES).map(([k, label]) => (
          <Link key={k} href={`/changes?type=${k}`} className={`chip ${sp.type === k ? "chip-active" : "chip-idle"}`}>{label}</Link>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((c) => (<ChangeItem key={c.id} change={c} nowMs={nowMs} />))}
      </div>
      {!items.length && <p className="text-sm text-gray-400 py-10 text-center">暂无该类型的记录。</p>}

      {hasMore && (
        <div className="mt-6 text-center">
          <Link href={nextHref} className="btn btn-secondary px-6 py-2.5 text-sm">加载更多</Link>
        </div>
      )}

      <p className="mt-6 text-[11px] text-gray-400 leading-relaxed">
        仅展示已核验、非编辑类且具有可点击原始来源的变化记录。
      </p>
    </div>
  );
}
