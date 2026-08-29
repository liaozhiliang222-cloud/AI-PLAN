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
  scenario: "all", intensity: "medium", budget: "200", region: "all", tool: "无所谓",
};

describe("recommend", () => {
  it("空套餐列表返回 null", () => {
    expect(recommend([], answers)).toBeNull();
    expect(recommend([makePlan({})], answers)).not.toBeNull();
  });

  it("正常推荐返回 top/second/perf", () => {
    const a = makePlan({ slug: "a", name: "A", priceCny: 50 });
    const b = makePlan({ id: 2, slug: "b", name: "B", priceCny: 150, provider: { id: 2, name: "Prov2", slug: "prov2", country: "domestic", logoColor: "#111" } });
    const r = recommend([a, b], answers);
    expect(r).not.toBeNull();
    expect(r!.top.plan.slug).toBe("a");
    expect(r!.second).toBeDefined();
    expect(r!.perf).toBeDefined();
    expect(r!.top.matchedConditions.length).toBeGreaterThan(0);
  });

  it("严格排除超预算和非官方工具支持", () => {
    const over = makePlan({ slug: "over", priceCny: 300, toolCompat: { Cursor: "official" } });
    const community = makePlan({ id: 2, slug: "community", priceCny: 20, toolCompat: { Cursor: "community" } });
    expect(recommend([over, community], { ...answers, tool: "Cursor" })).toBeNull();
  });

  it("缺失工具状态不能通过指定工具条件", () => {
    expect(recommend([makePlan({ toolCompat: {} })], { ...answers, tool: "Cursor" })).toBeNull();
  });

  it("场景匹配：标注了目标场景的套餐排在未标注之前", () => {
    const hit = makePlan({ id: 1, slug: "hit", name: "Hit", priceCny: 150, scenarios: ["agent"] });
    const miss = makePlan({ id: 2, slug: "miss", name: "Miss", priceCny: 50, scenarios: ["light"] });
    const r = recommend([miss, hit], { ...answers, scenario: "agent" })!;
    expect(r.top.plan.slug).toBe("hit");
    expect(r.candidates[0].scenarioMatch).toBe(true);
    expect(r.candidates.some((c) => c.plan.slug === "miss" && c.scenarioMatch === false)).toBe(true);
  });

  it("强度：额度容量不足时给出提醒但不排除", () => {
    const weak = makePlan({ id: 1, slug: "weak", name: "Weak", capacityIndex: 20, scenarios: [] });
    const r = recommend([weak], { ...answers, intensity: "heavy" })!;
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].intensity.verdict.tone).toBe("bad");
    expect(r.candidates[0].notices.some((n) => n.includes("不足以支撑"))).toBe(true);
  });

  it("强度：额度充裕时标记够用", () => {
    const strong = makePlan({ id: 1, slug: "strong", name: "Strong", capacityIndex: 95, scenarios: [] });
    const r = recommend([strong], { ...answers, intensity: "medium" })!;
    expect(r.candidates[0].intensity.verdict.tone).toBe("ok");
    expect(r.candidates[0].intensity.stars).toBe("★★★★★");
  });

  it("区域硬条件生效", () => {
    const dom = makePlan({ id: 1, slug: "dom", name: "Dom", region: "domestic" });
    expect(recommend([dom], { ...answers, region: "overseas" })).toBeNull();
    expect(recommend([dom], { ...answers, region: "domestic" })).not.toBeNull();
  });
});

describe("buildReasonText", () => {
  it("生成非空理由文本并包含条件摘要", () => {
    const a = makePlan({ slug: "a", name: "A" });
    const b = makePlan({ id: 2, slug: "b", name: "B", provider: { id: 2, name: "Prov2", slug: "prov2", country: "domestic", logoColor: "#111" } });
    const r = recommend([a, b], answers)!;
    const text = buildReasonText(r);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("¥200 内");
    expect(text).toContain("硬条件");
  });
});
