/* Source Monitor 与价格采样服务（被 Admin Server Actions 与 Cron 路由共用） */

import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateDraft } from "./draft";
import { safeParseJson } from "@/lib/serialize";

export type CheckResult = {
  id: number;
  status: "changed" | "same" | "error";
  draftGenerated?: boolean;
};

/** 拉取单个监控源页面并比对 Content Hash；变化写审核队列，不直接改正式数据 */
export async function checkSourceCore(id: number): Promise<CheckResult> {
  const src = await db.sourceMonitor.findUnique({ where: { id } });
  if (!src) return { id, status: "error" };
  let content = "";
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": "AIPlanRadarBot/0.1 (+monitor)" },
      signal: AbortSignal.timeout(10000),
    });
    content = await res.text();
  } catch {
    return { id, status: "error" };
  }
  const hash = createHash("sha256").update(content).digest("hex");
  if (src.lastHash && src.lastHash !== hash) {
    // 自动入库模式（用户要求免人工审核）：官方源页面变化直接写入资讯流。
    // 同一源当天只记一条，避免动态内容噪音刷屏。
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dup = await db.changeLog.findFirst({
      where: { sourceUrl: src.url, detectedAt: { gte: startOfDay } },
      select: { id: true },
    });
    if (!dup) {
      const now = new Date();
      await db.changeLog.create({
        data: {
          entityType: "provider",
          entitySlug: src.providerSlug,
          changeType: "update",
          title: `${src.label} 页面有更新`,
          summary: "监测到官方页面内容发生变化；具体调整（价格 / 额度 / 档位）请点击下方来源查看官方页面。",
          importance: "normal",
          sourceType: "official",
          sourceUrl: src.url,
          sourceTitle: src.label,
          checkedAt: now,
          detectedAt: now,
          verified: true,
        },
      });
    }
  }
  await db.sourceMonitor.update({
    where: { id },
    data: { lastHash: hash, lastContent: content.slice(0, 20000), lastCheckedAt: new Date() },
  });
  return { id, status: src.lastHash ? (src.lastHash === hash ? "same" : "changed") : "same" };
}

export async function checkAllSources(): Promise<CheckResult[]> {
  const sources = await db.sourceMonitor.findMany({ where: { enabled: true }, select: { id: true } });
  const out: CheckResult[] = [];
  for (const s of sources) out.push(await checkSourceCore(s.id));
  return out;
}

/**
 * 检查单个监控源，并在检测到变化时自动生成草稿（LLM 优先、规则兜底）。
 * 供 cron 端到端自动化使用：变化 → 入队 → 自动解析草稿 → 等待管理员确认入库。
 * `plans` 可由批量调用方预取后传入，避免每个源重复查一次套餐表。
 */
export async function checkSourceWithDraft(
  id: number,
  plans?: { slug: string; name: string }[],
): Promise<CheckResult> {
  const result = await checkSourceCore(id);
  if (result.status !== "changed") return result;

  // 取最新入队的一条 pending 记录，自动生成草稿
  const known = plans ?? (await db.plan.findMany({ where: { status: "published" }, select: { slug: true, name: true } }));
  const src = await db.sourceMonitor.findUnique({ where: { id }, select: { lastContent: true } });
  const raw = src?.lastContent ?? "";

  const latest = await db.reviewItem.findFirst({
    where: { sourceId: id, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  const draft = await generateDraft(raw, known);
  if (latest && draft) {
    const prev = safeParseJson<Record<string, unknown>>(latest.payload, {});
    await db.reviewItem.update({
      where: { id: latest.id },
      data: { payload: JSON.stringify({ ...prev, draft }) },
    });
    result.draftGenerated = true;
  }
  return result;
}

/** 有限并发：Workers 子请求有限（默认并发 6），全量并发会被丢弃 */
async function mapLimit<T>(items: T[], limit: number, fn: (x: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (;;) {
      const item = queue.shift();
      if (item === undefined) return;
      await fn(item);
    }
  });
  await Promise.all(runners);
}

/**
 * 检查全部监控源并自动生成草稿。并发 4，套餐列表只查一次。
 *
 * 受 Cloudflare Workers 单次请求的时间/子请求限制，一次性抓完 16 个页面会超时
 * （实测 43s 后 500）。因此支持分批：
 *   - `limit`：本次最多检查几个源
 *   - `onlyUncheckedToday`：跳过今天已检查过的源，重复调用不会重复抓取（幂等）
 * 调度方可在一轮内多次调用完成全部源。
 */
export async function checkAllSourcesWithDraft(
  opts: { limit?: number; onlyUncheckedToday?: boolean } = {},
): Promise<CheckResult[]> {
  // 注意：只UncheckedToday 时必须包含 lastCheckedAt=null 的新源，
  // 否则新建源永远轮不到首次检查（与 countUncheckedToday 的口径保持一致）
  const where: Prisma.SourceMonitorWhereInput = { enabled: true, kind: "page" };
  if (opts.onlyUncheckedToday) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.OR = [{ lastCheckedAt: null }, { lastCheckedAt: { lt: start } }];
  }
  const sources = await db.sourceMonitor.findMany({
    where,
    select: { id: true },
    orderBy: [{ lastCheckedAt: "asc" }, { id: "asc" }],
    ...(opts.limit ? { take: opts.limit } : {}),
  });
  if (!sources.length) return [];
  const plans = await db.plan.findMany({ where: { status: "published" }, select: { slug: true, name: true } });
  const out: CheckResult[] = [];
  await mapLimit(sources, 4, async (s) => {
    try {
      out.push(await checkSourceWithDraft(s.id, plans));
    } catch (e) {
      console.error("[monitor] 检查失败:", e instanceof Error ? e.message : String(e));
      out.push({ id: s.id, status: "error" });
    }
  });
  return out;
}

/** 检查全部监控源（只抓取+比对+入队，不生成草稿）。供 cron 使用：LLM 草稿生成耗时不可控（实测一次变化拖慢 40s+ 且可能失败），改由管理员在后台手动触发。 */
export async function checkAllSourcesCore(
  opts: { limit?: number; onlyUncheckedToday?: boolean } = {},
): Promise<CheckResult[]> {
  // 与 countUncheckedToday 口径一致：null（从未检查）也算未检查
  const where: Prisma.SourceMonitorWhereInput = { enabled: true, kind: "page" };
  if (opts.onlyUncheckedToday) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.OR = [{ lastCheckedAt: null }, { lastCheckedAt: { lt: start } }];
  }
  const sources = await db.sourceMonitor.findMany({
    where,
    select: { id: true },
    orderBy: [{ lastCheckedAt: "asc" }, { id: "asc" }],
    ...(opts.limit ? { take: opts.limit } : {}),
  });
  if (!sources.length) return [];
  const out: CheckResult[] = [];
  await mapLimit(sources, 4, async (s) => {
    try {
      out.push(await checkSourceCore(s.id));
    } catch (e) {
      console.error("[monitor] 检查失败:", e instanceof Error ? e.message : String(e));
      out.push({ id: s.id, status: "error" });
    }
  });
  return out;
}

/** 剩余今天尚未检查的启用源数量（调度方循环调用直到为 0；只统计 page 类源） */
export async function countUncheckedToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return db.sourceMonitor.count({
    where: { enabled: true, kind: "page", OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: start } }] },
  });
}

/** 每日价格采样：为每个在售套餐补当天 PricePoint，返回新增条数。
 *  批量实现（2 次查询 + 1 次 createMany）——逐条 findFirst+create 在 Cloudflare Workers
 *  上会产生上百次数据库往返，实测 48s 后超时返回 500。 */
export async function samplePricesToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const plans = await db.plan.findMany({
    where: { status: "published" },
    select: { id: true, priceCny: true },
  });
  if (!plans.length) return 0;

  const today = await db.pricePoint.findMany({
    where: { date: { gte: start } },
    select: { planId: true },
  });
  const have = new Set(today.map((t) => t.planId));

  const missing = plans.filter((p) => !have.has(p.id));
  if (!missing.length) return 0;

  const now = new Date();
  await db.pricePoint.createMany({
    data: missing.map((p) => ({ planId: p.id, date: now, priceCny: p.priceCny })),
  });
  return missing.length;
}

/**
 * 价格异常检测：对比最近两条 PricePoint，若价格变动超过阈值（如 20%），
 * 自动写入一条 pending ReviewItem 提醒管理员复核（不直接改正式数据）。
 * 批量实现：Prisma 的 `pricePoints: { take: 2 }` 会退化成 N+1 查询，这里改成
 * 一次查全部再在内存分组，避免 Workers 超时。
 */
export async function detectPriceAnomalies(thresholdPct = 20): Promise<number> {
  const plans = await db.plan.findMany({
    where: { status: "published" },
    select: { id: true, slug: true, name: true, priceCny: true },
  });
  if (!plans.length) return 0;
  const planIds = plans.map((p) => p.id);

  const points = await db.pricePoint.findMany({
    where: { planId: { in: planIds } },
    orderBy: [{ planId: "asc" }, { date: "desc" }],
    select: { planId: true, priceCny: true },
  });
  const recent = new Map<number, number[]>();
  for (const pt of points) {
    const arr = recent.get(pt.planId);
    if (!arr) recent.set(pt.planId, [pt.priceCny]);
    else if (arr.length < 2) arr.push(pt.priceCny);
  }

  // 已存在的 pending 提醒（sourceId 为 null 表示价格异常触发），避免重复入队
  const pending = await db.reviewItem.findMany({
    where: { sourceId: null, status: "pending" },
    select: { payload: true },
  });
  const pendingSlugs = new Set<string>();
  for (const r of pending) {
    const mm = r.payload.match(/"planSlug"\s*:\s*"([^"]+)"/);
    if (mm) pendingSlugs.add(mm[1]);
  }

  const rows: { payload: string; status: string }[] = [];
  for (const p of plans) {
    const [latest, prev] = recent.get(p.id) ?? [];
    if (latest == null || prev == null || prev === 0) continue;
    const pct = Math.abs((latest - prev) / prev) * 100;
    if (pct < thresholdPct || pendingSlugs.has(p.slug)) continue;
    rows.push({
      payload: JSON.stringify({
        note: `价格异常：${p.name} 由 ¥${prev} 变动为 ¥${latest}（${pct.toFixed(1)}%）`,
        planSlug: p.slug,
        oldValue: prev,
        newValue: latest,
      }),
      status: "pending",
    });
  }
  if (rows.length) await db.reviewItem.createMany({ data: rows });
  return rows.length;
}

/* ==================== 媒体 RSS 采集 ==================== */

/** 关键词预筛（小写匹配）：命中任一才入待审队列，其余直接丢弃，节省 LLM 筛选成本 */
const RSS_KEYWORDS = [
  // 厂商 / 模型（中英）
  "openai", "anthropic", "claude", "gemini", "deepseek", "kimi", "moonshot", "qwen", "通义", "阿里",
  "glm", "智谱", "zhipu", "混元", "hunyuan", "minimax", "豆包", "doubao", "trae", "cursor",
  "copilot", "windsurf", "devin", "cline", "replit", "grok", "xiaomi", "mi-mo", "mimo",
  "文心", "ernie", "comate", "qoder", "codebuddy", "volcengine", "llama", "mistral",
  // 套餐 / 商业化词
  "定价", "价格", "订阅", "套餐", "额度", "积分", "提价", "降价", "收费",
  "pricing", "subscription", "plan", "credit", "quota", "rate limit",
  // 发布词
  "发布", "上线", "模型", "release", "launch", "announc",
];

/** 每源每日入库上限（LLM 筛选前），防止泛科技源刷屏 */
const RSS_DAILY_CAP = 5;
/** 单次拉取每源最多入库条数 */
const RSS_RUN_CAP = 10;

type FeedItem = { guid: string; title: string; link: string; description: string };

function xmlText(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 轻量 RSS2/Atom 解析（受控源列表，正则足够；不引第三方 XML 依赖） */
function parseFeedItems(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  const blocks = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/gi)];
  for (const b of blocks) {
    const blk = b[0];
    const pick = (re: RegExp): string | undefined => {
      const m = blk.match(re);
      return m ? xmlText(m[1]) : undefined;
    };
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? "";
    const link =
      pick(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i) ?? pick(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? "";
    const description =
      pick(/<description[^>]*>([\s\S]*?)<\/description>/i) ??
      pick(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ??
      pick(/<content[^>]*>([\s\S]*?)<\/content>/i) ?? "";
    const guid = pick(/<guid[^>]*>([\s\S]*?)<\/guid>/i) ?? pick(/<id[^>]*>([\s\S]*?)<\/id>/i) ?? (link || title);
    if (!guid || !title) continue;
    out.push({ guid, title, link, description });
  }
  return out;
}

/**
 * 拉取全部 RSS 媒体源：新条目 → 关键词预筛 → 入 ChangeLog 待审队列。
 * LLM 筛选（scripts/analyze-rss.mjs）在 GitHub Actions 侧执行，通过 verified=true 上页面，
 * 不入页面（verified=false 且 changeType=update 双重隐藏），Workers 侧无 LLM 调用。
 * 已见条目 guid 存 SourceMonitor.lastContent（JSON），跨次去重。
 */
export async function fetchRssSources(): Promise<{ feeds: number; inserted: number }> {
  const feeds = await db.sourceMonitor.findMany({ where: { enabled: true, kind: "rss" } });
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  let inserted = 0;

  for (const feed of feeds) {
    let ok = false;
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "AIPlanRadarBot/0.1 (+monitor)" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        ok = true;
        const xml = await res.text();
        const items = parseFeedItems(xml);
        const prev = safeParseJson<{ seen?: string[] }>(feed.lastContent ?? "", {});
        const seen = new Set(prev.seen ?? []);
        const fresh = items.filter((it) => !seen.has(it.guid));
        for (const it of items) seen.add(it.guid);

        const todayCount = await db.changeLog.count({
          where: { sourceType: "media", sourceUrl: feed.url, detectedAt: { gte: startOfDay } },
        });
        let feedInserted = 0;
        for (const it of fresh) {
          if (feedInserted >= RSS_RUN_CAP || todayCount + feedInserted >= RSS_DAILY_CAP) break;
          const hay = (it.title + " " + it.description).toLowerCase();
          if (!RSS_KEYWORDS.some((k) => hay.includes(k))) continue;
          const now = new Date();
          await db.changeLog.create({
            data: {
              entityType: "provider",
              changeType: "update",
              title: it.title.slice(0, 120),
              summary: (it.description || it.title).slice(0, 300),
              importance: "normal",
              sourceType: "media",
              sourceUrl: it.link || feed.url,
              sourceTitle: feed.label,
              checkedAt: now,
              detectedAt: now,
              verified: false, // 待 LLM 筛选：通过后置 true 并改写为具体资讯
            },
          });
          feedInserted++;
        }
        inserted += feedInserted;

        await db.sourceMonitor.update({
          where: { id: feed.id },
          data: { lastContent: JSON.stringify({ seen: [...seen].slice(-300) }), lastCheckedAt: new Date() },
        });
      }
    } catch {
      /* 抓取失败：仅更新检查时间，下轮重试 */
    }
    if (!ok) {
      await db.sourceMonitor.update({ where: { id: feed.id }, data: { lastCheckedAt: new Date() } });
    }
  }
  return { feeds: feeds.length, inserted };
}
