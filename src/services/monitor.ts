/* Source Monitor 与价格采样服务（被 Admin Server Actions 与 Cron 路由共用） */

import { createHash } from "crypto";
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
      signal: AbortSignal.timeout(15000),
    });
    content = await res.text();
  } catch {
    return { id, status: "error" };
  }
  const hash = createHash("sha256").update(content).digest("hex");
  if (src.lastHash && src.lastHash !== hash) {
    await db.reviewItem.create({
      data: {
        sourceId: src.id,
        payload: JSON.stringify({
          url: src.url,
          oldHash: src.lastHash.slice(0, 12),
          newHash: hash.slice(0, 12),
          note: "检测到内容变化，待人工/AI 解析",
        }),
        status: "pending",
      },
    });
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
 */
export async function checkSourceWithDraft(id: number): Promise<CheckResult> {
  const result = await checkSourceCore(id);
  if (result.status !== "changed") return result;

  // 取最新入队的一条 pending 记录，自动生成草稿
  const plans = await db.plan.findMany({ where: { status: "published" }, select: { slug: true, name: true } });
  const src = await db.sourceMonitor.findUnique({ where: { id }, select: { lastContent: true } });
  const raw = src?.lastContent ?? "";

  const latest = await db.reviewItem.findFirst({
    where: { sourceId: id, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  const draft = await generateDraft(raw, plans);
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

/** 检查全部监控源并自动生成草稿（端到端流水线） */
export async function checkAllSourcesWithDraft(): Promise<CheckResult[]> {
  const sources = await db.sourceMonitor.findMany({ where: { enabled: true }, select: { id: true } });
  const out: CheckResult[] = [];
  for (const s of sources) out.push(await checkSourceWithDraft(s.id));
  return out;
}

/** 每日价格采样：为每个在售套餐补当天 PricePoint，返回新增条数 */
export async function samplePricesToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const plans = await db.plan.findMany({ where: { status: "published" }, select: { id: true, priceCny: true } });
  let inserted = 0;
  for (const p of plans) {
    const exists = await db.pricePoint.findFirst({
      where: { planId: p.id, date: { gte: start } },
      select: { id: true },
    });
    if (!exists) {
      await db.pricePoint.create({ data: { planId: p.id, date: new Date(), priceCny: p.priceCny } });
      inserted++;
    }
  }
  return inserted;
}

/**
 * 价格异常检测：对比最近两条 PricePoint，若价格变动超过阈值（如 20%），
 * 自动写入一条 pending ReviewItem 提醒管理员复核（不直接改正式数据）。
 * 返回检测到的异常条数。
 */
export async function detectPriceAnomalies(thresholdPct = 20): Promise<number> {
  const plans = await db.plan.findMany({
    where: { status: "published" },
    select: {
      id: true,
      slug: true,
      name: true,
      priceCny: true,
      pricePoints: { orderBy: { date: "desc" }, take: 2, select: { priceCny: true } },
    },
  });
  let anomalies = 0;
  for (const p of plans) {
    const [latest, prev] = p.pricePoints;
    if (!latest || !prev || prev.priceCny === 0) continue;
    const pct = Math.abs((latest.priceCny - prev.priceCny) / prev.priceCny) * 100;
    if (pct >= thresholdPct) {
      const exists = await db.reviewItem.findFirst({
        where: { sourceId: null, payload: { contains: p.slug }, status: "pending" },
      });
      if (!exists) {
        await db.reviewItem.create({
          data: {
            sourceId: null, // null 表示非监控源触发（价格异常检测）
            payload: JSON.stringify({
              note: `价格异常：${p.name} 由 ¥${prev.priceCny} 变动为 ¥${latest.priceCny}（${pct.toFixed(1)}%）`,
              planSlug: p.slug,
              oldValue: prev.priceCny,
              newValue: latest.priceCny,
            }),
            status: "pending",
          },
        });
        anomalies++;
      }
    }
  }
  return anomalies;
}
