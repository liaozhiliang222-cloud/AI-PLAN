import { describe, it, expect } from "vitest";
import { recommend, buildReasonText, type QuizAnswers } from "../recommendation";
import type { PlanT } from "../serialize";

function makePlan(over: Partial<PlanT>): PlanT {
  return {
    id: 1, name: "Plan", slug: "plan", tagline: "", priceCny: 100, priceNote: "", billingCycle: "monthly",
    region: "domestic", quotaType: "credits", quotaAmount: null, quotaUnit: null, quotaWindow: null,
    fastQuota: null, normalQuota: null, capacityIndex: 60, contextNote: null,
    tools: [], toolCompat: {}, scenarios: ["fullstack"], pros: [], cons: [], recommendedFor: [], notRecommendedFor: [],
    officialUrl: null, lastVerifiedAt: null, trustLevel: "official_verified",
    provider: { id: 1, name: "Prov", slug: "prov", country: "domestic", logoColor: "#000" },
    score: { ability: 80, quota: 80, price: 80, toolCompat: 80, stability: 80, cnExperience: 90, overall: 80, trend: 0, heat: 50 },
    ...over,
  };
}

const answers: QuizAnswers = {
  budget: "200", scenarios: ["fullstack"], usage: "medium", prefs: ["performance"], tool: "",
};

describe("recommend", () => {
  it("不足 2 个套餐返回 null", () => {
    expect(recommend([], answers)).toBeNull();
    expect(recommend([makePlan({})], answers)).toBeNull();
  });

  it("正常推荐返回 top/second/perf", () => {
    const a = makePlan({ slug: "a", name: "A", priceCny: 50, score: { ability: 90, quota: 90, price: 90, toolCompat: 90, stability: 90, cnExperience: 90, overall: 90, trend: 0, heat: 50 } });
    const b = makePlan({ id: 2, slug: "b", name: "B", priceCny: 150, provider: { id: 2, name: "Prov2", slug: "prov2", country: "domestic", logoColor: "#111" }, score: { ability: 70, quota: 70, price: 70, toolCompat: 70, stability: 70, cnExperience: 70, overall: 70, trend: 0, heat: 40 } });
    const r = recommend([a, b], answers);
    expect(r).not.toBeNull();
    expect(r!.top.plan.slug).toBe("a");
    expect(r!.second).toBeDefined();
    expect(r!.perf).toBeDefined();
    expect(r!.top.matchScore).toBeGreaterThanOrEqual(62);
    expect(r!.top.matchScore).toBeLessThanOrEqual(97);
  });
});

describe("buildReasonText", () => {
  it("生成非空理由文本", () => {
    const a = makePlan({ slug: "a", name: "A" });
    const b = makePlan({ id: 2, slug: "b", name: "B", provider: { id: 2, name: "Prov2", slug: "prov2", country: "domestic", logoColor: "#111" } });
    const r = recommend([a, b], answers)!;
    const text = buildReasonText(r);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("综合匹配度");
  });
});
