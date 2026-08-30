/**
 * 资讯升级：把监控采集的原始「页面更新」信号交给 LLM 解析成具体资讯。
 *   有实质变化（新价格/额度/档位）→ 升级 ChangeLog 为 price/quota/launch 等类型，进入资讯流
 *   无实质内容（SPA 空壳 / 纯文案调整）→ 删除该信号，不进资讯流
 *   LLM 调用失败 → 保留信号，下次运行重试
 * 用法：node -r dotenv/config scripts/analyze-updates.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  }),
});

const VALID_TYPES = new Set(["price", "quota", "new_model", "policy", "capability", "launch", "delist"]);

function htmlToText(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

async function llmExtract(content, planList) {
  const base = (process.env.LLM_BASE_URL || "").replace(/\/$/, "");
  const key = process.env.LLM_API_KEY;
  if (!base || !key) return null;
  const models = (process.env.LLM_MODELS || "deepseek-v4-flash").split(",").map((m) => m.trim()).filter(Boolean);
  const system = `你是 AI Coding Plan 行情监控的数据抽取助手。根据给定的网页内容，只输出一个 JSON 对象（无 markdown 代码块），字段：
hasChange: 布尔值，页面是否包含与套餐/价格/额度相关的实质信息变化线索
changeType: "price"|"quota"|"new_model"|"policy"|"capability"|"launch"|"delist" 之一
planSlug: 从用户消息提供的套餐清单中选择最匹配的 slug；无法确定则为 null
oldValue: 变化前数值(number)，无法判断为 null
newValue: 变化后数值(number)，无法判断为 null
title: 中文标题，不超过 20 字
summary: 中文一句话摘要，需包含具体数字（如有）
confidence: 0 到 1 的小数
注意：只报告页面上明确可见的信息，禁止推测；若页面是空壳或无价格信息，hasChange=false。`;

  for (const model of models) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: `该厂商当前在库套餐（供对齐 planSlug）：\n${planList}\n\n抓取到的页面内容：\n${content}` },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) continue;
      const j = await res.json().catch(() => null);
      const raw = String(j?.choices?.[0]?.message?.content ?? "");
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
      if (s === -1 || e === -1) continue;
      const d = JSON.parse(cleaned.slice(s, e + 1));
      if (d && typeof d === "object") return d;
    } catch (e) {
      console.log("  LLM 调用失败(" + model + "):", String(e.message || e).slice(0, 80));
    }
  }
  return null;
}

(async () => {
  const signals = await db.changeLog.findMany({
    where: { changeType: "update", sourceType: "official", sourceUrl: { not: null } },
    orderBy: { detectedAt: "asc" },
  });
  console.log("待解析的页面更新信号:", signals.length, "条\n");
  if (!signals.length) { console.log("nothing to do"); await db.$disconnect(); return; }

  const sources = await db.sourceMonitor.findMany({ select: { url: true, providerSlug: true } });
  const provBySourceUrl = new Map(sources.map((s) => [s.url, s.providerSlug]));
  const plans = await db.plan.findMany({
    select: { slug: true, name: true, priceCny: true, provider: { select: { slug: true } } },
  });

  let upgraded = 0, deleted = 0, kept = 0, failed = 0;
  for (const sig of signals) {
    const provSlug = provBySourceUrl.get(sig.sourceUrl) ?? sig.entitySlug;
    const myPlans = plans.filter((p) => p.provider.slug === provSlug);
    const planList = myPlans.length
      ? myPlans.map((p) => `- ${p.slug}｜${p.name}｜当前 ¥${p.priceCny}/月`).join("\n")
      : "（该厂商暂无在库套餐）";

    const src = await db.sourceMonitor.findFirst({ where: { url: sig.sourceUrl }, select: { lastContent: true } });
    const text = htmlToText(src?.lastContent ?? "");

    // SPA 空壳：没有可见文本可解析，直接删信号
    if (text.length < 300) {
      await db.changeLog.delete({ where: { id: sig.id } });
      deleted++;
      console.log("  删（SPA 空壳）" + sig.title);
      continue;
    }

    const draft = await llmExtract(text, planList);
    if (!draft) { kept++; failed++; console.log("  留（LLM 失败，下次重试）" + sig.title); continue; }

    const conf = typeof draft.confidence === "number" ? draft.confidence : 0;
    const matchPlan = draft.planSlug && myPlans.some((p) => p.slug === draft.planSlug) ? draft.planSlug : null;

    if (draft.hasChange === false || conf < 0.5 || (!matchPlan && draft.newValue == null)) {
      await db.changeLog.delete({ where: { id: sig.id } });
      deleted++;
      console.log("  删（无实质变化）" + sig.title);
      continue;
    }

    // 升级为具体资讯
    const planRef = matchPlan ? await db.plan.findUnique({ where: { slug: matchPlan }, select: { id: true, name: true } }) : null;
    const type = VALID_TYPES.has(draft.changeType) ? draft.changeType : "policy";
    await db.changeLog.update({
      where: { id: sig.id },
      data: {
        changeType: type,
        entityType: planRef ? "plan" : "provider",
        entitySlug: matchPlan ?? provSlug,
        planId: planRef ? planRef.id : null,
        title: String(draft.title || sig.title).slice(0, 60),
        summary: String(draft.summary || "").slice(0, 300),
        importance: conf >= 0.8 ? "major" : "normal",
        impactFrom: typeof draft.oldValue === "number" ? draft.oldValue : null,
        impactTo: typeof draft.newValue === "number" ? draft.newValue : null,
        impactText: [draft.oldValue != null ? `旧值 ${draft.oldValue}` : null, draft.newValue != null ? `新值 ${draft.newValue}` : null]
          .filter(Boolean).join(" → ") || null,
      },
    });
    upgraded++;
    console.log("  升级 → [" + type + "] " + String(draft.title).slice(0, 30) + (planRef ? "（关联 " + matchPlan + "）" : ""));
  }

  console.log(`\n升级 ${upgraded} / 删除 ${deleted} / 保留待重试 ${kept}（失败 ${failed}）`);
  const remain = await db.changeLog.count({ where: { changeType: "update", sourceType: "official" } });
  console.log("剩余未解析信号:", remain, "条");
  await db.$disconnect();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
