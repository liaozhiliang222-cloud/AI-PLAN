/* 套餐对比的结构化结论（规则生成，MVP 不调用 LLM） */

import type { PublicPlanT } from "./serialize";
import { fmtPrice } from "./format";

export interface CompareConclusion {
  cheapest?: PublicPlanT;
  lines: string[]; // 一句话结论列表
  advice: string[]; // 场景化建议
}

export function comparePlans(plans: PublicPlanT[]): CompareConclusion {
  // 对比至少需要 2 个套餐才有意义
  if (plans.length < 2) return { lines: [], advice: [] };

  const sortedPrice = [...plans].sort((a, b) => a.priceCny - b.priceCny);

  const nameOf = (p: PublicPlanT) => `${p.provider.name} ${p.name}`;
  const lines: string[] = [];
  const advice: string[] = [];

  const cheapest = sortedPrice[0];
  lines.push(`标价最低：${nameOf(cheapest)}（${fmtPrice(cheapest.priceCny)}/月）。`);
  const free = plans.filter((p) => p.priceCny === 0);
  if (free.length) advice.push(`其中 ${free.map(nameOf).join("、")} 标记为免费；额度与限制请查看厂商官方页面。`);
  advice.push("本结论仅比较当前记录的公开参数，不代表能力或性价比判断。");
  return { cheapest, lines, advice };
}
