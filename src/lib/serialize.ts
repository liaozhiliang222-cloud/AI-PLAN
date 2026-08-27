/* 序列化：把 Prisma 记录转换为带解析后数组的纯对象，供组件使用 */

import type { ChangeLog, Model, Provider, Plan, PlanScore } from "@prisma/client";

export function jarr<T = string>(v: unknown): T[] {
  try {
    const p = JSON.parse((v as string) || "[]");
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
export function jobj<T = Record<string, string>>(v: unknown): T {
  try {
    return JSON.parse((v as string) || "{}") as T;
  } catch {
    return {} as T;
  }
}

/** 安全解析任意 JSON 字符串（用于 ReviewItem.payload 等自由格式 blob），失败返回 fallback */
export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return JSON.parse(raw || "") as T;
  } catch {
    return fallback;
  }
}

export type ProviderT = Pick<Provider, "id" | "name" | "slug" | "country" | "logoColor">;

export interface PlanT {
  id: number; name: string; slug: string; tagline: string;
  priceCny: number; priceNote: string; billingCycle: string; region: string;
  quotaType: string; quotaAmount: number | null; quotaUnit: string | null; quotaWindow: string | null;
  fastQuota: string | null; normalQuota: string | null; capacityIndex: number;
  contextNote: string | null;
  tools: string[]; toolCompat: Record<string, string>; scenarios: string[];
  pros: string[]; cons: string[]; recommendedFor: string[]; notRecommendedFor: string[];
  officialUrl: string | null; lastVerifiedAt: Date | null; trustLevel: string;
  provider: ProviderT;
  score: Omit<PlanScore, "id" | "planId"> | null;
}

export function toPlanT(p: Plan & { provider: Provider; score: PlanScore | null }): PlanT {
  return {
    id: p.id, name: p.name, slug: p.slug, tagline: p.tagline,
    priceCny: p.priceCny, priceNote: p.priceNote, billingCycle: p.billingCycle, region: p.region,
    quotaType: p.quotaType, quotaAmount: p.quotaAmount, quotaUnit: p.quotaUnit, quotaWindow: p.quotaWindow,
    fastQuota: p.fastQuota, normalQuota: p.normalQuota, capacityIndex: p.capacityIndex,
    contextNote: p.contextNote,
    tools: jarr(p.tools), toolCompat: jobj(p.toolCompat), scenarios: jarr(p.scenarios),
    pros: jarr(p.pros), cons: jarr(p.cons), recommendedFor: jarr(p.recommendedFor), notRecommendedFor: jarr(p.notRecommendedFor),
    officialUrl: p.officialUrl, lastVerifiedAt: p.lastVerifiedAt, trustLevel: p.trustLevel,
    provider: { id: p.provider.id, name: p.provider.name, slug: p.provider.slug, country: p.provider.country, logoColor: p.provider.logoColor },
    score: p.score
      ? {
          ability: p.score.ability, quota: p.score.quota, price: p.score.price,
          toolCompat: p.score.toolCompat, stability: p.score.stability, cnExperience: p.score.cnExperience,
          overall: p.score.overall, trend: p.score.trend, heat: p.score.heat,
        }
      : null,
  };
}

export interface ModelT {
  id: number; name: string; slug: string; contextK: number | null;
  inputPrice: number | null; outputPrice: number | null; releaseDate: string | null;
  strengths: string[]; weaknesses: string[]; recommendedScenarios: string[];
  provider: ProviderT;
  score: Omit<import("@prisma/client").ModelScore, "id" | "modelId"> | null;
}

type ModelFull = Model & { provider: Provider; score: import("@prisma/client").ModelScore | null };

export function toModelT(m: ModelFull): ModelT {
  return {
    id: m.id, name: m.name, slug: m.slug, contextK: m.contextK,
    inputPrice: m.inputPrice, outputPrice: m.outputPrice, releaseDate: m.releaseDate,
    strengths: jarr(m.strengths), weaknesses: jarr(m.weaknesses), recommendedScenarios: jarr(m.recommendedScenarios),
    provider: { id: m.provider.id, name: m.provider.name, slug: m.provider.slug, country: m.provider.country, logoColor: m.provider.logoColor },
    score: m.score ?? null,
  };
}

export type ChangeT = ChangeLog;
