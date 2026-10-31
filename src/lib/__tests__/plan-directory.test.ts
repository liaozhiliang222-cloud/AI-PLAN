import { describe, expect, it, vi } from "vitest";
import { buildPlanDirectory, PLAN_DIRECTORY_SELECT } from "../plan-directory";
import { PRICE_BANDS, REGIONS, SCENARIOS, TOOL_FILTERS } from "../config";
import { originalDirectory } from "../../../scripts/verification/original-directory";
import type { toPlanT } from "../serialize";

function selectedRows(rows: FullPlan[]) {
  return rows.map(row => Object.fromEntries(Object.entries(PLAN_DIRECTORY_SELECT).map(([key, selection]) => [key, selection === true ? row[key as keyof FullPlan] : Object.fromEntries(Object.keys(selection.select).map(field => [field, row.provider[field as keyof FullPlan["provider"]]]))]))) as import("../plan-directory").DirectoryPlan[];
}

type FullPlan = Parameters<typeof toPlanT>[0];
const rows: FullPlan[] = Array.from({ length: 49 }, (_, i) => ({
  id: i, providerId: i % 7, name: `套餐 ${i}`, slug: `plan-${i}`, tagline: "editorial",
  priceCny: [0, 49, 50, 99, 100, 199, 200, 499, 500, 501, 999][i % 11],
  currency: "CNY", priceNote: "", billingCycle: "monthly", region: i % 2 ? "domestic" : "overseas",
  quotaType: "credits", quotaAmount: 100, quotaUnit: "次", quotaWindow: "monthly", rateMultiplier: null,
  fastQuota: null, normalQuota: null, quotaNote: null, capacityIndex: 50, contextNote: null,
  tools: '["Cursor"]', toolCompat: JSON.stringify({ Cursor: ["yes", "no", "unverified", "partial"][i % 4] }),
  scenarios: JSON.stringify([SCENARIOS[i % SCENARIOS.length].key]), pros: '["x"]', cons: '["y"]',
  recommendedFor: '["z"]', notRecommendedFor: '[]', description: "", officialUrl: "https://example.com",
  lastVerifiedAt: null, trustLevel: "official_verified", status: "published",
  createdAt: new Date(0), updatedAt: new Date(0), score: null,
  provider: { id: i % 7, name: `厂商 ${i % 7}`, slug: `provider-${i % 7}`, country: "domestic", logoColor: "#000", website: null, officialSource: null, status: "active", createdAt: new Date(0) },
}));
const directoryRows = selectedRows(rows);
const view = (result: ReturnType<typeof buildPlanDirectory> | ReturnType<typeof originalDirectory>) => ({
  ids: result.plans.map(p => p.id),
  groups: result.groups.map(g => ({ provider: g.provider, ids: g.items.map(p => p.id), min: Math.min(...g.items.map(p => p.priceCny)) })),
});

describe("public plan directory optimization", () => {
  it("preserves all supported URL filters/sorts, unknown values and budget boundaries", () => {
    let count = 0;
    for (const budget of [undefined, ...PRICE_BANDS.map(x => x.key), "unknown"])
      for (const region of [undefined, ...REGIONS.map(x => x.key), "unknown"])
        for (const scene of [undefined, "all", ...SCENARIOS.map(x => x.key), "unknown"])
          for (const tool of [undefined, "all", ...TOOL_FILTERS.slice(1), "unknown"])
            for (const sort of [undefined, "price", "price-desc", "provider", "unknown"]) {
              const sp = { budget, region, scene, tool, sort };
              expect(view(buildPlanDirectory(directoryRows, sp))).toEqual(view(originalDirectory(rows, sp)));
              count++;
            }
    expect(count).toBe(20250);
  }, 20_000);
  it("does not mutate input, preserves empty results and handles malformed JSON", () => {
    const ids = directoryRows.map(p => p.id);
    buildPlanDirectory(directoryRows, { sort: "price-desc" });
    expect(directoryRows.map(p => p.id)).toEqual(ids);
    expect(buildPlanDirectory([], {})).toEqual({ plans: [], groups: [] });
    const invalid = [{ ...rows[0], scenarios: "broken", toolCompat: "broken" }];
    for (const sp of [{}, { scene: "frontend" }, { tool: "Cursor" }])
      expect(view(buildPlanDirectory(selectedRows(invalid), sp))).toEqual(view(originalDirectory(invalid, sp)));
  });
  it("skips all JSON parsing for unfiltered/all directory and only parses active filters", () => {
    const spy = vi.spyOn(JSON, "parse");
    try {
      buildPlanDirectory(directoryRows, { tool: "all", scene: "all" });
      expect(spy).toHaveBeenCalledTimes(0);
      originalDirectory(rows, {});
      expect(spy).toHaveBeenCalledTimes(rows.length * 7);
      spy.mockClear();
      buildPlanDirectory(directoryRows, { budget: "b500p", scene: "frontend", tool: "all" });
      expect(spy).toHaveBeenCalledTimes(rows.filter(p => p.priceCny >= 500).length);
    } finally { spy.mockRestore(); }
  });
  it("stores the exact group minimum used by rendering, including descending order", () => {
    for (const sort of ["price", "price-desc", "provider"]) {
      const result = buildPlanDirectory(directoryRows, { sort });
      for (const group of result.groups) expect(group.minPrice).toBe(Math.min(...group.items.map(p => p.priceCny)));
    }
  });
  it("excludes score relation and unused blobs while retaining all visible row fields", () => {
    for (const field of ["score", "description", "pros", "cons", "tools", "recommendedFor", "notRecommendedFor"])
      expect(PLAN_DIRECTORY_SELECT).not.toHaveProperty(field);
    for (const field of ["name", "slug", "priceCny", "priceNote", "officialUrl", "quotaAmount", "quotaUnit", "quotaWindow", "fastQuota", "normalQuota", "lastVerifiedAt"])
      expect(PLAN_DIRECTORY_SELECT).toHaveProperty(field, true);
  });
});
