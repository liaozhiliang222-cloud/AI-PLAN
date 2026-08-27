/* 草稿生成共享逻辑：优先 LLM Extraction，失败回退规则解析。
   被 admin action 与 Source Monitor 流水线共用，保证两端行为一致。 */

import { extractDraft, type ExtractDraft } from "./extract";
import { extractDraftLLM } from "./llm";

export interface PlanRef {
  slug: string;
  name: string;
}

/** 从原始页面内容生成变化草稿：LLM 优先，规则兜底；两者都失败返回 null */
export async function generateDraft(
  rawContent: string,
  planNames: PlanRef[],
): Promise<ExtractDraft | null> {
  const draft = await extractDraftLLM(rawContent, planNames);
  if (draft) {
    return {
      ...draft,
      title: draft.title.slice(0, 20),
      summary: draft.summary || `LLM 解析自监控源页面，请核对后确认入库。`,
    };
  }
  return extractDraft(rawContent, planNames); // LLM 不可用时的规则兜底
}
