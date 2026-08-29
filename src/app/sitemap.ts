import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { queryPublicData } from "@/lib/db-safe";
import { SITE } from "@/lib/config";

const base = SITE.url;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await queryPublicData("sitemap.dynamic", () => Promise.all([
    db.plan.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
    db.model.findMany({
      where: { status: "active", aaModelId: { not: null }, aaFetchedAt: { not: null }, aaSourceUrl: { not: null } },
      select: { slug: true },
    }),
  ]), [[], []]);
  const [plans, models] = result.data;

  const statics = ["", "/plans", "/models", "/compare", "/recommend", "/changes", "/best/under-100", "/best/under-200"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const compareCombos: string[] = [];
  const topPlans = plans.slice(0, 8);
  for (let i = 0; i < topPlans.length && compareCombos.length < 20; i++) {
    for (let j = i + 1; j < topPlans.length && compareCombos.length < 20; j++) {
      compareCombos.push(`${topPlans[i].slug}-vs-${topPlans[j].slug}`);
    }
  }

  return [
    ...statics,
    ...plans.map((p) => ({ url: `${base}/plans/${p.slug}`, lastModified: p.updatedAt || new Date(), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...models.map((m) => ({ url: `${base}/models/${m.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...compareCombos.map((c) => ({ url: `${base}/compare/${c}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
