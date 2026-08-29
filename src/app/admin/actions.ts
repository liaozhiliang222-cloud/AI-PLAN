"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { calcPlanOverall, calcModelOverall } from "@/lib/config";
import { checkSourceWithDraft, checkAllSourcesWithDraft, samplePricesToday, detectPriceAnomalies } from "@/services/monitor";
import { generateDraft } from "@/services/draft";
import { verifyOrigin } from "@/lib/csrf";
import { safeParseJson } from "@/lib/serialize";
import { hasCompleteSource, isValidMonitoredChangeValue, normalizeHttpUrl, normalizePlanSourceUrl, sourceMatchesProvider } from "@/lib/source-provenance";

/** 所有写操作统一 CSRF 校验；失败则中断（Server Action 直接抛出即中止） */
async function guard() {
  if (!(await verifyOrigin())) {
    throw new Error("CSRF check failed: origin mismatch");
  }
}

function s(f: FormData, k: string): string {
  return String(f.get(k) ?? "").trim();
}
function n(f: FormData, k: string): number | null {
  const v = s(f, k);
  if (!v) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}
export async function savePlan(f: FormData) {
  await guard();
  const id = n(f, "id");
  const providerId = Number(s(f, "providerId"));
  const provider = await db.provider.findUnique({ where: { id: providerId }, select: { website: true } });
  const scores = {
    ability: clamp(n(f, "ability"), 60),
    quota: clamp(n(f, "quota"), 50),
    price: clamp(n(f, "price"), 70),
    toolCompat: clamp(n(f, "toolCompatScore"), 60),
    stability: clamp(n(f, "stability"), 80),
    cnExperience: clamp(n(f, "cnExperience"), 60),
  };
  const officialUrl = normalizePlanSourceUrl(s(f, "officialUrl"), provider?.website);
  const requestedStatus = s(f, "status") || "draft";
  const data = {
    providerId,
    name: s(f, "name"),
    slug: s(f, "slug"),
    tagline: s(f, "tagline"),
    priceCny: n(f, "priceCny") ?? 0,
    priceNote: s(f, "priceNote"),
    region: s(f, "region") || "domestic",
    quotaType: s(f, "quotaType") || "credits",
    quotaAmount: n(f, "quotaAmount"),
    quotaUnit: s(f, "quotaUnit"),
    quotaWindow: s(f, "quotaWindow"),
    capacityIndex: clamp(n(f, "capacityIndex"), 50)!,
    contextNote: s(f, "contextNote"),
    tools: JSON.stringify(s(f, "tools").split(/[,，]/).map((x) => x.trim()).filter(Boolean)),
    scenarios: JSON.stringify(s(f, "scenarios").split(/[,，]/).map((x) => x.trim()).filter(Boolean)),
    status: requestedStatus === "published" && officialUrl ? "published" : "draft",
    officialUrl,
    lastVerifiedAt: officialUrl ? new Date() : null,
    score: {
      upsert: {
        create: { ...scores, overall: calcPlanOverall(scores) },
        update: { ...scores, overall: calcPlanOverall(scores) },
      },
    },
  };
  const scoreData = { ...scores, overall: calcPlanOverall(scores) };
  if (id) {
    await db.plan.update({ where: { id }, data: { ...data, score: { upsert: { create: scoreData, update: scoreData } } } });
  } else {
    await db.plan.create({ data: { ...data, score: { create: scoreData } } });
  }
  revalidatePath("/admin/plans");
  revalidatePath("/plans");
  redirect("/admin/plans");
}

export async function deletePlan(f: FormData) {
  await guard();
  const id = Number(s(f, "id"));
  await db.planScore.deleteMany({ where: { planId: id } });
  await db.plan.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/plans");
}

export async function saveModel(f: FormData) {
  await guard();
  const id = n(f, "id");
  const editorialData = {
    strengths: JSON.stringify(s(f, "strengths").split(/\n|；|;/).map((x) => x.trim()).filter(Boolean)),
    weaknesses: JSON.stringify(s(f, "weaknesses").split(/\n|；|;/).map((x) => x.trim()).filter(Boolean)),
    recommendedScenarios: JSON.stringify(s(f, "recommendedScenarios").split(/[,，]/).map((x) => x.trim()).filter(Boolean)),
  };

  // AA fields are immutable in Admin: a forged form submission must not overwrite raw synchronized metrics/provenance.
  if (id) {
    const existing = await db.model.findUnique({ where: { id }, select: { aaModelId: true, slug: true } });
    if (existing?.aaModelId) {
      await db.model.update({ where: { id }, data: editorialData });
      revalidatePath("/admin/models");
      revalidatePath(`/models/${existing.slug}`);
      redirect("/admin/models");
    }
  }
  const scores = {
    coding: clamp(n(f, "coding"), 75),
    agent: clamp(n(f, "agent"), 72),
    frontend: clamp(n(f, "frontend"), 74),
    backend: clamp(n(f, "backend"), 78),
    debug: clamp(n(f, "debug"), 76),
    longContext: clamp(n(f, "longContext"), 80),
    speed: clamp(n(f, "speed"), 85),
    cost: clamp(n(f, "cost"), 80),
  };
  const overall = calcModelOverall(scores);
  const data = {
    providerId: Number(s(f, "providerId")),
    name: s(f, "name"),
    slug: s(f, "slug"),
    contextK: n(f, "contextK"),
    inputPrice: n(f, "inputPrice"),
    outputPrice: n(f, "outputPrice"),
    releaseDate: s(f, "releaseDate"),
    ...editorialData,
    score: {
      upsert: { create: { ...scores, overall }, update: { ...scores, overall } },
    },
  };
  const scoreData = { ...scores, overall };
  if (id) {
    await db.model.update({ where: { id }, data: { ...data, score: { upsert: { create: scoreData, update: scoreData } } } });
  } else {
    await db.model.create({ data: { ...data, score: { create: scoreData } } });
  }
  revalidatePath("/admin/models");
  redirect("/admin/models");
}

export async function deleteModel(f: FormData) {
  await guard();
  const id = Number(s(f, "id"));
  const existing = await db.model.findUnique({ where: { id }, select: { aaModelId: true } });
  if (!existing) return;
  if (existing.aaModelId) throw new Error("Artificial Analysis 同步模型不可在后台删除");
  await db.$transaction(async (tx) => {
    await tx.modelScore.deleteMany({ where: { modelId: id } });
    await tx.model.delete({ where: { id } });
  });
  revalidatePath("/admin/models");
}

export async function saveProvider(f: FormData) {
  await guard();
  const id = n(f, "id");
  const data = {
    name: s(f, "name"),
    slug: s(f, "slug"),
    country: s(f, "country") || "domestic",
    logoColor: s(f, "logoColor") || "#2563EB",
    website: s(f, "website") || null,
    officialSource: s(f, "officialSource") || null,
  };
  if (id) await db.provider.update({ where: { id }, data });
  else await db.provider.create({ data });
  revalidatePath("/admin/providers");
  redirect("/admin/providers");
}

export async function saveChange(f: FormData) {
  await guard();
  const planSlug = s(f, "planSlug");
  const modelSlug = s(f, "modelSlug");
  const from = n(f, "impactFrom");
  const to = n(f, "impactTo");
  const sourceUrl = normalizeHttpUrl(s(f, "sourceUrl"));
  const sourceTitle = s(f, "sourceTitle") || null;
  const checkedRaw = s(f, "checkedAt");
  const checkedDate = checkedRaw ? new Date(checkedRaw) : null;
  const checkedAt = checkedDate && !Number.isNaN(checkedDate.getTime()) ? checkedDate : null;
  const verified = hasCompleteSource(sourceUrl, sourceTitle, checkedAt);

  // 根据 slug 反查外键，保证 Plan/Model 详情页能通过 planId/modelId 关联到本变化
  let planId: number | null = null;
  let modelId: number | null = null;
  if (planSlug) {
    const p = await db.plan.findUnique({ where: { slug: planSlug }, select: { id: true } });
    planId = p?.id ?? null;
  } else if (modelSlug) {
    const m = await db.model.findUnique({ where: { slug: modelSlug }, select: { id: true } });
    modelId = m?.id ?? null;
  }

  await db.changeLog.create({
    data: {
      entityType: planSlug ? "plan" : modelSlug ? "model" : "provider",
      entitySlug: planSlug || modelSlug || null,
      planId,
      modelId,
      changeType: s(f, "changeType") || "policy",
      title: s(f, "title"),
      summary: s(f, "summary"),
      importance: s(f, "importance") || "normal",
      impactFrom: from, impactTo: to,
      impactText: null,
      sourceType: s(f, "sourceType") || "editorial",
      sourceUrl,
      sourceTitle,
      checkedAt,
      verified,
    },
  });
  revalidatePath("/admin/changelog");
  revalidatePath("/changes");
  redirect("/admin/changelog");
}

export async function deleteChange(f: FormData) {
  await guard();
  await db.changeLog.delete({ where: { id: Number(s(f, "id")) } }).catch(() => {});
  revalidatePath("/admin/changelog");
  revalidatePath("/changes");
}

/* ---------- Source Monitor：概念验证 ---------- */

export async function addSource(f: FormData) {
  await guard();
  await db.sourceMonitor.create({
    data: { label: s(f, "label"), url: s(f, "url"), providerSlug: s(f, "providerSlug") || null },
  });
  revalidatePath("/admin/sources");
}

/** 拉取页面内容并比对 hash；变化写入 Review Queue 并自动生成草稿 */
export async function checkSource(f: FormData) {
  await guard();
  await checkSourceWithDraft(Number(s(f, "id")));
  revalidatePath("/admin/sources");
}

/** 全部监控源检查（后台按钮触发）：变化自动生成草稿 */
export async function checkAllSourcesAction() {
  await guard();
  await checkAllSourcesWithDraft();
  revalidatePath("/admin/sources");
}

/** 立即执行一次价格采样 + 价格异常检测 */
export async function runSamplingAction() {
  await guard();
  await samplePricesToday();
  await detectPriceAnomalies();
  revalidatePath("/admin/sources");
  revalidatePath("/admin/plans");
}

export async function dismissReview(f: FormData) {
  await guard();
  await db.reviewItem.update({ where: { id: Number(s(f, "id")) }, data: { status: "dismissed" } });
  revalidatePath("/admin/sources");
}

/** 对待审核项运行解析器生成草稿：优先 LLM Extraction（deepseek-v4-flash → glm-4.7-flash），失败回退规则解析 */
export async function generateDraftAction(f: FormData) {
  await guard();
  const id = Number(s(f, "id"));
  const item = await db.reviewItem.findUnique({ where: { id }, include: { source: true } });
  if (!item || item.status !== "pending") return;
  const plans = await db.plan.findMany({ select: { slug: true, name: true } });
  // 未抓取过内容时，用监控源上次的 lastContent；都没有则给空串
  const raw = item.source?.lastContent ?? "";

  const draft = await generateDraft(raw, plans);
  if (!draft) {
    revalidatePath("/admin/sources");
    redirect("/admin/sources?err=no-draft");
  }
  const payload = JSON.stringify({ ...safeParseJson<Record<string, unknown>>(item.payload, {}), draft });
  await db.reviewItem.update({ where: { id }, data: { payload } });
  revalidatePath("/admin/sources");
}

/** 管理员确认：应用草稿/手填值 → 更新套餐价格 + 写 ChangeLog → 标记 approved */
export async function applyReviewAction(f: FormData) {
  await guard();
  const id = Number(s(f, "id"));
  const item = await db.reviewItem.findUnique({ where: { id }, include: { source: true } });
  if (!item || item.status !== "pending") redirect("/admin/sources");

  const planId = n(f, "planId");
  const changeType = s(f, "changeType") || "price";
  const title = s(f, "title");
  const summary = s(f, "summary");
  const from = n(f, "oldValue");
  const to = n(f, "newValue");
  if (!planId) redirect("/admin/sources?err=missing-plan");
  if (!isValidMonitoredChangeValue(changeType, to)) redirect("/admin/sources?err=invalid-price-value");

  const plan = await db.plan.findUnique({
    where: { id: planId },
    select: { slug: true, provider: { select: { slug: true, website: true } } },
  });
  if (!plan) redirect("/admin/sources?err=missing-plan");
  if (!item.source || !sourceMatchesProvider(item.source.providerSlug, plan.provider.slug)) {
    redirect("/admin/sources?err=source-provider-mismatch");
  }
  const sourceUrl = normalizePlanSourceUrl(item.source.url, plan.provider.website);
  const sourceTitle = item.source.label.trim() || null;
  const checkedAt = new Date();
  if (!hasCompleteSource(sourceUrl, sourceTitle, checkedAt)) {
    redirect("/admin/sources?err=incomplete-plan-source");
  }

  await db.$transaction(async (tx) => {
    if (changeType === "price" && to != null && to > 0) {
      await tx.plan.update({
        where: { id: planId },
        data: { priceCny: to, lastVerifiedAt: checkedAt, trustLevel: "official_detected" },
      });
    }
    await tx.changeLog.create({
      data: {
        entityType: "plan", entitySlug: plan.slug, planId,
        changeType, title: title || `价格调整 ${from ?? "?"} → ${to ?? "?"}`,
        summary: `${summary}（来源：Source Monitor 审核，原记录 ${item.id}）`,
        importance: s(f, "importance") || "normal",
        impactFrom: from, impactTo: to, impactText: null,
        sourceType: "official", sourceUrl, sourceTitle, checkedAt, verified: true,
      },
    });
    await tx.reviewItem.update({ where: { id }, data: { status: "approved" } });
  });
  revalidatePath("/admin/sources");
  revalidatePath("/plans");
  revalidatePath("/changes");
  redirect("/admin/sources?ok=1");
}

function clamp(v: number | null, dflt: number): number {
  if (v == null) return dflt;
  return Math.max(0, Math.min(100, Math.round(v)));
}
