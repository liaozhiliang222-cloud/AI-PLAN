/* 套餐对比的结构化结论（规则生成，MVP 不调用 LLM） */

import type { PlanT } from "./serialize";
import { fmtPrice } from "./format";

export interface CompareConclusion {
  cheapest?: PlanT;
  balanced?: PlanT;
  ceiling?: PlanT;
  lines: string[]; // 一句话结论列表
  advice: string[]; // 场景化建议
}

export function comparePlans(plans: PlanT[]): CompareConclusion {
  // 对比至少需要 2 个套餐才有意义
  if (plans.length < 2) return { lines: [], advice: [] };

  const sortedPrice = [...plans].sort((a, b) => a.priceCny - b.priceCny);
  const sortedOverall = [...plans].sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0));
  const sortedAbility = [...plans].sort((a, b) => (b.score?.ability ?? 0) - (a.score?.ability ?? 0));

  const nameOf = (p: PlanT) => `${p.provider.name} ${p.name}`;
  const lines: string[] = [];
  const advice: string[] = [];

  const cheapest = sortedPrice[0];
  const ceiling = sortedAbility[0];
  // 均衡：在“非最便宜”档位里综合分最高者（若所有价格相同则取综合分最高）
  const midPool = plans.filter((p) => p.slug !== cheapest.slug);
  const balanced = (midPool.length ? midPool : [sortedOverall[0]]).sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0))[0];

  if (cheapest.slug !== sortedOverall[0]?.slug) {
    lines.push(`追求最低成本：${nameOf(cheapest)}（${fmtPrice(cheapest.priceCny)}/月）。`);
  }
  if (balanced) lines.push(`综合均衡：${nameOf(balanced)}。`);
  if (ceiling && (ceiling.score?.ability ?? 0) >= 90) {
    lines.push(`追求 Coding 上限：${nameOf(ceiling)}（模型能力 ${ceiling.score?.ability}）。`);
  }

  if (ceiling && balanced && ceiling.slug !== balanced.slug) {
    advice.push(`如果你每天中重度 Coding、追求上限表现，优先选择 ${nameOf(ceiling)}。`);
    advice.push(`如果你主要进行轻中度开发、在意成本，${nameOf(balanced)} 综合更划算。`);
  }

  return { cheapest, balanced, ceiling, lines, advice };
}
