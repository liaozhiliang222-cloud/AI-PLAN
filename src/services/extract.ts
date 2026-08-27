/* 变化草稿解析器：MVP 用规则启发式；未来可在 extractDraft 中替换为 LLM Extraction，
   输出结构保持不变：{changeType, oldValue, newValue, summary, confidence} */

import type { ChangeTypeKey } from "@/lib/config";

export interface ExtractDraft {
  changeType: ChangeTypeKey;
  title: string;
  summary: string;
  oldValue: number | null;
  newValue: number | null;
  /** 建议关联的套餐 slug（LLM 可给出；规则解析器为 undefined） */
  planSlug?: string;
  /** 规则置信度说明（替换 LLM 后改为模型 confidence 0-1） */
  confidence: string;
}

function parseMoney(text: string): number[] {
  const out: number[] = [];
  const re = /[¥￥]\s?([\d][\d,]*(?:\.\d+)?)|\$\s?([\d][\d,]*(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = Number((m[1] ?? m[2]).replace(/,/g, ""));
    if (Number.isFinite(v) && v > 0 && v < 100000) out.push(v);
    if (out.length >= 8) break;
  }
  return out;
}

/** 从监控源最近一次抓取内容中提取变化草稿 */
export function extractDraft(
  rawContent: string,
  planNames: { slug: string; name: string }[],
): ExtractDraft | null {
  // 只分析正文里的中文/英文摘要片段，截断超长页面
  const content = String(rawContent || "").slice(0, 20000);
  if (!content.trim()) return null;

  // 1) 中文公告句式优先：“个人版从 199 下调至 179 元/月”
  let oldValue: number | null = null;
  let newValue: number | null = null;
  const verbPair = content.match(
    /[¥￥$]?\s?([\d][\d,.]*)\s*(?:元)?\s*(?:下调至|上调至|下调为|上调为|调整为|降到|涨到|降至|升至|到|至)\s*[¥￥$]?\s?([\d][\d,.]*)/,
  );
  if (verbPair && Number(verbPair[1].replace(/,/g, "")) !== Number(verbPair[2].replace(/,/g, ""))) {
    oldValue = Number(verbPair[1].replace(/,/g, ""));
    newValue = Number(verbPair[2].replace(/,/g, ""));
  } else {
    const arrow = content.match(/(?:CNY|RMB)?\s*[¥￥$]?\s?([\d][\d,.]+)\s*(?:元)?\s*(?:→|-{1,2}>)\s*(?:CNY|RMB)?\s*[¥￥$]?\s?([\d][\d,.]+)/);
    if (arrow) {
      oldValue = Number(arrow[1].replace(/,/g, ""));
      newValue = Number(arrow[2].replace(/,/g, ""));
    }
  }

  // 2) 回退：取页面上两个不同的货币数字
  if (oldValue == null || newValue == null || oldValue === newValue) {
    const nums = [...new Set(parseMoney(content))];
    if (nums.length >= 2) {
      oldValue = nums[0];
      newValue = nums[1];
    }
  }

  if (oldValue == null || newValue == null || oldValue === newValue) return null;

  // 关联套餐猜测：内容中出现的套餐名
  const hit = planNames.find((p) => content.includes(p.name.split(" ").slice(-1)[0]));
  const dir = newValue < (oldValue ?? 0) ? "下降" : "上升";
  return {
    changeType: "price",
    title: `${hit ? hit.name : "套餐"} 价格${dir}（自动解析草稿）`,
    summary: `解析自监控源页面：${oldValue} → ${newValue}。请核对后确认入库。`,
    oldValue,
    newValue,
    confidence: "rule-heuristic: 由『从X到Y/→』或页面货币数值推断，需人工核对",
  };
}

/** 从 payload 中读取已生成的草稿（无则返回 null） */
export function readDraft(payloadJson: string): ExtractDraft | null {
  try {
    const p = JSON.parse(payloadJson);
    return p?.draft ?? null;
  } catch {
    return null;
  }
}
