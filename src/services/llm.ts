/* LLM Extraction：调用 OpenAI 兼容网关（New API），把监控源页面内容解析为结构化变化草稿。
   模型链：LLM_MODELS 逗号分隔，依次尝试（首选 deepseek-v4-flash，次选 glm-4.7-flash）。
   全部失败时返回 null，由调用方回退到规则解析器 extractDraft。 */

import type { ExtractDraft } from "./extract";
import { isChangeTypeKey } from "@/lib/config";

const SYSTEM_PROMPT = `你是 AI Coding Plan 行情监控的数据抽取助手。根据给定的网页内容，只输出一个 JSON 对象（无多余文本、无 markdown 代码块），字段：
changeType: "price"|"quota"|"new_model"|"policy"|"capability"|"launch"|"delist"
planSlug: 该变化关联的套餐英文短横线 slug（若能确定）；否则 null
oldValue: 变化前数值(number)，无法判断为 null
newValue: 变化后数值(number)，无法判断为 null
title: 中文标题，不超过20字
summary: 中文一句话摘要
confidence: 0 到 1 的小数置信度`;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function parseModelJson(raw: string): ExtractDraft | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const j = JSON.parse(cleaned.slice(start, end + 1));
    if (!j || typeof j !== "object") return null;
    return {
      changeType: isChangeTypeKey(j.changeType) ? j.changeType : "price",
      planSlug: typeof j.planSlug === "string" && j.planSlug ? j.planSlug : undefined,
      title: String(j.title ?? "价格变化").slice(0, 40),
      summary: String(j.summary ?? "").slice(0, 300),
      oldValue: typeof j.oldValue === "number" && j.oldValue > 0 ? j.oldValue : null,
      newValue: typeof j.newValue === "number" && j.newValue > 0 ? j.newValue : null,
      confidence:
        typeof j.confidence === "number" && j.confidence > 0 && j.confidence <= 1
          ? `llm(${j.confidence.toFixed(2)})`
          : "llm",
    };
  } catch {
    return null;
  }
}

function dbg(...args: unknown[]) {
  if (process.env.LLM_DEBUG === "1") console.error("[llm]", ...args);
}

/** 模型链依次尝试；任一成功即返回。planNames 用于 LLM 省略 planSlug 时的本地兜底匹配 */
export async function extractDraftLLM(
  rawContent: string,
  planNames?: { slug: string; name: string }[],
): Promise<ExtractDraft | null> {
  const base = process.env.LLM_BASE_URL?.replace(/\/$/, "");
  const key = process.env.LLM_API_KEY;
  if (!base || !key) return null;
  const models = (process.env.LLM_MODELS || "deepseek-v4-flash")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const content = htmlToText(rawContent);
  if (!content) return null;

  const attempts = 2; // 限流(429)时轻量重试一次
  for (const model of models) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `抓取到的页面内容：\n${content}` },
            ],
            temperature: 0.1,
            max_tokens: 2000, // deepseek-v4-flash 为推理模型，需预留 reasoning tokens
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) {
          dbg(model, "HTTP", res.status, (await res.text()).slice(0, 200));
          if (res.status === 429 && attempt < attempts) {
            await new Promise((r) => setTimeout(r, 6000));
            continue;
          }
          break; // 该模型不可用，换下一个
        }
        const j = await res.json().catch(() => null);
        if (!j || j.error) {
          dbg(model, "gateway error:", JSON.stringify(j?.error ?? {}).slice(0, 200));
          continue; // 网关上游错误（如限流）也可能 HTTP 200
        }
        const msg = j?.choices?.[0]?.message ?? {};
        // 推理模型可能把正文放在 content 且被截断；空间给足后再解析
        dbg(model, "content:", String(msg.content ?? "").slice(0, 120));
        const draft = parseModelJson(String(msg.content ?? ""));
        if (!draft) dbg(model, "parse failed");
        if (draft && draft.newValue != null) {
          if (!draft.planSlug && planNames) {
            const hit = planNames.find((p) => {
              const tail = p.name.split(" ").slice(-1)[0];
              return tail && tail.length > 3 && content.includes(tail);
            });
            if (hit) draft.planSlug = hit.slug;
          }
          // 记录实际使用的模型，便于排障
          (draft as ExtractDraft & { usedModel?: string }).usedModel = model;
          return draft;
        }
      } catch (e) {
        // 尝试下一个模型
        dbg(model, "exception:", e instanceof Error ? e.message : String(e));
      }
    }
  }
  return null;
}
