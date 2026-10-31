import type { Prisma } from "@prisma/client";
import { PRICE_BANDS } from "@/lib/config";
import { jarr, jobj } from "@/lib/serialize";

/** Only facts used by the public directory; no scores or detail-page blobs. */
export const PLAN_DIRECTORY_SELECT = {
  id: true, name: true, slug: true, priceCny: true, priceNote: true,
  quotaAmount: true, quotaUnit: true, quotaWindow: true,
  fastQuota: true, normalQuota: true, officialUrl: true,
  lastVerifiedAt: true, region: true, scenarios: true, toolCompat: true,
  provider: { select: { id: true, name: true, slug: true, country: true, logoColor: true } },
} satisfies Prisma.PlanSelect;

export type DirectoryPlan = Prisma.PlanGetPayload<{ select: typeof PLAN_DIRECTORY_SELECT }>;
export interface DirectoryParams {
  budget?: string; region?: string; scene?: string; tool?: string; sort?: string;
}

export function buildPlanDirectory(rows: DirectoryPlan[], sp: DirectoryParams) {
  const band = PRICE_BANDS.find((b) => b.key === sp.budget);
  // Filter cheap scalar fields first. JSON is parsed only when its filter is active.
  const plans = rows.filter((p) => {
    if (band) {
      if ("max" in band && band.max === 0 && p.priceCny !== 0) return false;
      if ("max" in band && band.max! > 0 && !(p.priceCny > 0 && p.priceCny <= band.max!)) return false;
      if ("min" in band && band.min! > 0 && p.priceCny < band.min!) return false;
    }
    if (sp.region && sp.region !== "all" && p.region !== sp.region) return false;
    if (sp.scene && sp.scene !== "all" && !jarr(p.scenarios).includes(sp.scene)) return false;
    if (sp.tool && sp.tool !== "all") {
      const st = jobj<Record<string, string>>(p.toolCompat)[sp.tool];
      if (!st || st === "no" || st === "unverified") return false;
    }
    return true;
  });
  const sort = sp.sort ?? "price";
  const sorters: Record<string, (a: DirectoryPlan, b: DirectoryPlan) => number> = {
    price: (a, b) => a.priceCny - b.priceCny,
    "price-desc": (a, b) => b.priceCny - a.priceCny,
    provider: (a, b) => `${a.provider.name} ${a.name}`.localeCompare(`${b.provider.name} ${b.name}`, "zh-CN"),
  };
  plans.sort(sorters[sort] || sorters.price);
  const groupMap = new Map<string, { provider: DirectoryPlan["provider"]; items: DirectoryPlan[]; minPrice: number }>();
  for (const p of plans) {
    const g = groupMap.get(p.provider.slug) ?? { provider: p.provider, items: [], minPrice: p.priceCny };
    g.items.push(p);
    g.minPrice = Math.min(g.minPrice, p.priceCny);
    groupMap.set(p.provider.slug, g);
  }
  const groups = [...groupMap.values()];
  groups.sort((a, b) => sort === "provider"
    ? a.provider.name.localeCompare(b.provider.name, "zh-CN")
    : a.minPrice - b.minPrice);
  return { plans, groups };
}
