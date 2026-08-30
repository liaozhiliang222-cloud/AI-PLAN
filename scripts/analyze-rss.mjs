/**
 * 媒体 RSS 条目筛选（GitHub Actions 侧执行，Workers 侧无 LLM 调用）：
 *   对 fetchRssSources 入队的待审条目（sourceType=media, verified=false, changeType=update）：
 *   - 含具体事实（价格数字/模型名/档位/日期）→ 改写为具体资讯，verified=true 上页面
 *   - 纯观点 / 软文 / 周报盘点 / 与套餐和模型无关 → 删除
 *   - LLM 失败 → 保留待下次重试（不上页面）
 * 用法：node -r dotenv/config scripts/analyze-rss.mjs
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
const RUN_CAP = 60; // 单次最多处理条数，防 Actions 超时（每条一次 LLM 调用）

async function llmJudge(item, providerList) {
  const base = (process.env.LLM_BASE_URL || "").replace(/\/$/, "");
  const key = process.env.LLM_API_KEY;
  if (!base || !key) return null;
  const models = (process.env.LLM_MODELS || "deepseek-v4-flash").split(",").map((m) => m.trim()).filter(Boolean);
  const system = `你是 AI Coding Plan 资讯编辑。根据给定的媒体文章标题与摘要，只输出一个 JSON 对象（无 markdown 代码块），字段：
relevant: 布尔值，是否是与 AI 大模型 / coding 套餐相关的实质资讯（需含具体事实：模型名、价格数字、额度数字、档位或明确日期）。纯观点、软文、盘点周报、活动通稿一律 false
changeType: "price"|"quota"|"new_model"|"policy"|"capability"|"launch"|"delist" 之一
providerSlug: 从用户消息提供的厂商清单中选择最匹配的 slug；无法确定则为 null
title: 中文标题，不超过 20 字，概括事实本身
summary: 中文一句话摘要，保留具体数字与模型名，注明这是媒体报道（如「媒体报道称…」）
confidence: 0 到 1 的小数
注意：媒体可能有误报或夸大，confidence 保守打分；summary 禁止照抄营销话术。`;

  for (const model of models) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: `厂商清单（slug｜名称）：\n${providerList}\n\n文章标题：${item.title}\n文章摘要：${item.summary}\n来源：${item.sourceTitle}` },
          ],
          temperature: 0.1,
          max_tokens: 1000,
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
  const pending = await db.changeLog.findMany({
    where: { sourceType: "media", verified: false, changeType: "update" },
    orderBy: { detectedAt: "asc" },
    take: RUN_CAP,
  });
  console.log("待筛选的媒体条目:", pending.length, "条\n");
  if (!pending.length) { console.log("nothing to do"); await db.$disconnect(); return; }

  const providers = await db.provider.findMany({ select: { slug: true, name: true } });
  const providerList = providers.map((p) => `${p.slug}｜${p.name}`).join("\n");
  const provBySlug = new Map(providers.map((p) => [p.slug, p]));

  let published = 0, deleted = 0, kept = 0;
  for (const item of pending) {
    const d = await llmJudge(item, providerList);
    if (!d) { kept++; console.log("  留（LLM 失败，下次重试）" + item.title.slice(0, 40)); continue; }

    if (d.relevant !== true) {
      await db.changeLog.delete({ where: { id: item.id } });
      deleted++;
      console.log("  删（无实质内容）" + item.title.slice(0, 40));
      continue;
    }

    const type = VALID_TYPES.has(d.changeType) ? d.changeType : "policy";
    const conf = typeof d.confidence === "number" ? d.confidence : 0;
    const prov = d.providerSlug && provBySlug.has(d.providerSlug) ? d.providerSlug : null;
    if (conf < 0.5) {
      // 置信度过低（疑似误报/夸大）：直接删除，避免堆积无限重试
      await db.changeLog.delete({ where: { id: item.id } });
      deleted++;
      console.log("  删（置信度低 conf=" + conf.toFixed(2) + "）" + item.title.slice(0, 40));
      continue;
    }

    await db.changeLog.update({
      where: { id: item.id },
      data: {
        changeType: type,
        entityType: "provider",
        entitySlug: prov, // 厂商归属不明时允许为 null，标题/摘要已含上下文
        title: String(d.title || item.title).slice(0, 60),
        summary: String(d.summary || item.summary).slice(0, 300),
        importance: conf >= 0.85 ? "major" : "normal",
        verified: true,
      },
    });
    published++;
    console.log("  发布 → [" + type + "] " + String(d.title).slice(0, 30) + (prov ? "（" + prov + "）" : ""));
  }

  console.log(`\n发布 ${published} / 删除 ${deleted} / 保留待重试 ${kept}`);
  const remain = await db.changeLog.count({ where: { sourceType: "media", verified: false, changeType: "update" } });
  console.log("剩余待筛选:", remain, "条");
  await db.$disconnect();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
