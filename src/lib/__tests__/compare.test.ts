import { describe, it, expect } from "vitest";
import { comparePlans } from "../compare";
import type { PlanT } from "../serialize";

function makePlan(slug: string, name: string, providerName: string, priceCny: number, overall: number, ability: number): PlanT {
  return {
    id: slug.length, name, slug, tagline: "", priceCny, priceNote: "", billingCycle: "monthly",
    region: "domestic", quotaType: "credits", quotaAmount: null, quotaUnit: null, quotaWindow: null,
    fastQuota: null, normalQuota: null, capacityIndex: 50, contextNote: null,
    tools: [], toolCompat: {}, scenarios: [], pros: [], cons: [], recommendedFor: [], notRecommendedFor: [],
    officialUrl: null, lastVerifiedAt: null, trustLevel: "official_verified",
    provider: { id: 1, name: providerName, slug: providerName.toLowerCase(), country: "domestic", logoColor: "#000" },
    score: { ability, quota: 80, price: 80, toolCompat: 80, stability: 80, cnExperience: 90, overall, trend: 0, heat: 50 },
  };
}

describe("comparePlans", () => {
  it("单套餐返回空结论", () => {
    const p = makePlan("a", "A", "Prov", 100, 80, 80);
    const c = comparePlans([p]);
    expect(c.lines).toEqual([]);
    expect(c.advice).toEqual([]);
    expect(c.cheapest).toBeUndefined();
  });

  it("空列表安全", () => {
    const c = comparePlans([]);
    expect(c.lines).toEqual([]);
    expect(c.advice).toEqual([]);
  });

  it("识别最便宜 / 能力上限 / 均衡", () => {
    const cheap = makePlan("cheap", "Cheap", "P1", 50, 70, 70);
    const mid = makePlan("mid", "Mid", "P2", 100, 85, 85);
    const top = makePlan("top", "Top", "P3", 200, 90, 95);
    const c = comparePlans([cheap, mid, top]);
    expect(c.cheapest!.slug).toBe("cheap");
    expect(c.ceiling!.slug).toBe("top");
    // 均衡 = 非最便宜中综合分最高者（top 90 胜过 mid 85）
    expect(c.balanced!.slug).toBe("top");
    expect(c.lines.length).toBeGreaterThan(0);
  });

  it("能力未达 90 不输出 Coding 上限结论", () => {
    const a = makePlan("a", "A", "P1", 50, 70, 80);
    const b = makePlan("b", "B", "P2", 100, 80, 85);
    const c = comparePlans([a, b]);
    const ceilingLine = c.lines.find((l) => l.includes("Coding 上限"));
    expect(ceilingLine).toBeUndefined();
  });
});
