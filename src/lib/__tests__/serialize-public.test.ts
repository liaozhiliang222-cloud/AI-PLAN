import { describe, expect, it } from "vitest";
import { toPublicPlanT } from "../serialize";

describe("toPublicPlanT", () => {
  it("不把站内评分或编辑字段传给公开组件", () => {
    const dto = toPublicPlanT({
      id: 1, providerId: 1, name: "Plan", slug: "plan", tagline: "editorial",
      priceCny: 10, currency: "CNY", priceNote: "", billingCycle: "monthly", region: "domestic",
      quotaType: "credits", quotaAmount: null, quotaUnit: null, quotaWindow: null, rateMultiplier: null,
      fastQuota: null, normalQuota: null, quotaNote: null, capacityIndex: 99, contextNote: null,
      tools: "[]", toolCompat: "{}", scenarios: '["agent"]', pros: '["x"]', cons: '["y"]',
      recommendedFor: '["z"]', notRecommendedFor: "[]", description: "", officialUrl: null,
      lastVerifiedAt: null, trustLevel: "official_verified", status: "published",
      createdAt: new Date(), updatedAt: new Date(),
      provider: { id: 1, name: "Provider", slug: "provider", country: "domestic", logoColor: "#000", website: null, officialSource: null, status: "active", createdAt: new Date() },
    });
    // 仍不暴露的：主观评分与编辑文案类字段
    // score / pros / cons / recommendedFor / notRecommendedFor 属于编辑主观判断，
    // trustLevel / tagline / description 属于内部或文案字段，都不进公开 DTO。
    for (const key of ["score", "pros", "cons", "recommendedFor", "notRecommendedFor", "trustLevel", "tagline", "description"]) {
      expect(dto).not.toHaveProperty(key);
    }
  });

  it("保留用于筛选的场景标签与额度容量指数", () => {
    const dto = toPublicPlanT({
      id: 1, providerId: 1, name: "Plan", slug: "plan", tagline: "editorial",
      priceCny: 10, currency: "CNY", priceNote: "", billingCycle: "monthly", region: "domestic",
      quotaType: "credits", quotaAmount: null, quotaUnit: null, quotaWindow: null, rateMultiplier: null,
      fastQuota: null, normalQuota: null, quotaNote: null, capacityIndex: 72, contextNote: null,
      tools: "[]", toolCompat: "{}", scenarios: '["agent","fullstack"]', pros: '["x"]', cons: '["y"]',
      recommendedFor: '["z"]', notRecommendedFor: "[]", description: "", officialUrl: null,
      lastVerifiedAt: null, trustLevel: "official_verified", status: "published",
      createdAt: new Date(), updatedAt: new Date(),
      provider: { id: 1, name: "Provider", slug: "provider", country: "domestic", logoColor: "#000", website: null, officialSource: null, status: "active", createdAt: new Date() },
    });
    // 场景标签是分类事实（/plans 的场景筛选依赖它）
    expect(dto.scenarios).toEqual(["agent", "fullstack"]);
    // 额度容量指数用于「够不够用」判断，属编辑部归一化指标，前台展示时必须标注来源
    expect(dto.capacityIndex).toBe(72);
  });
});
