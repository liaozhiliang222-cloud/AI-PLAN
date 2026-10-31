// Frozen behavior oracle extracted from src/app/plans/page.tsx at
// 1656eb62467ee0b0b2780588f44fb82e524b5a2d. Keep unchanged when optimizing.
import { toPlanT, type PlanT } from "../../src/lib/serialize";
import { PRICE_BANDS } from "../../src/lib/config";
import type { DirectoryParams as SP } from "../../src/lib/plan-directory";
export function originalDirectory(rows: Parameters<typeof toPlanT>[0][], sp: SP) {
  const plans = rows.map(toPlanT).filter((p) => filterPlan(p, sp));

  const sort = sp.sort ?? "price";
  const sorters: Record<string, (a: PlanT, b: PlanT) => number> = {
    price: (a, b) => a.priceCny - b.priceCny,
    "price-desc": (a, b) => b.priceCny - a.priceCny,
    provider: (a, b) => `${a.provider.name} ${a.name}`.localeCompare(`${b.provider.name} ${b.name}`, "zh-CN"),
  };
  plans.sort(sorters[sort] || sorters.price);

  // 按厂商分组：组内保持当前排序结果，组间按该厂商最低价排序（选厂商排序时按名称）
  const groupMap = new Map<string, { provider: PlanT["provider"]; items: PlanT[] }>();
  for (const p of plans) {
    const g = groupMap.get(p.provider.slug) ?? { provider: p.provider, items: [] as PlanT[] };
    g.items.push(p);
    groupMap.set(p.provider.slug, g);
  }
  const groups = [...groupMap.values()];
  groups.sort((a, b) => {
    if (sort === "provider") return a.provider.name.localeCompare(b.provider.name, "zh-CN");
    return Math.min(...a.items.map((p) => p.priceCny)) - Math.min(...b.items.map((p) => p.priceCny));
  });

return { plans, groups };
}
function filterPlan(p: PlanT, sp: SP): boolean {
  if (sp.budget && sp.budget !== "all") {
    const band = PRICE_BANDS.find((b) => b.key === sp.budget);
    if (band) {
      if ("max" in band && band.max === 0 && p.priceCny !== 0) return false;
      if ("max" in band && band.max! > 0 && !(p.priceCny > 0 && p.priceCny <= band.max!)) return false;
      if ("min" in band && band.min! > 0 && p.priceCny < band.min!) return false;
    }
  }
  if (sp.region && sp.region !== "all" && p.region !== sp.region) return false;
  if (sp.scene && sp.scene !== "all" && !p.scenarios.includes(sp.scene)) return false;
  if (sp.tool && sp.tool !== "all") {
    const st = p.toolCompat[sp.tool];
    if (!st || st === "no" || st === "unverified") return false;
  }
  return true;
}
