import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [plans, models] = await Promise.all([
    db.plan.findMany({ select: { slug: true, updatedAt: true } }),
    db.model.findMany({ select: { slug: true } }),
  ]);

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
