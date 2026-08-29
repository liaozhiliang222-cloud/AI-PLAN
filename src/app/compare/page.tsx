import type { Metadata } from "next";
import { db } from "@/lib/db";
import { queryPublicData } from "@/lib/db-safe";
import { DatabaseUnavailable } from "@/app/_components/DatabaseUnavailable";
import { toPublicPlanT } from "@/lib/serialize";
import { CompareSection } from "@/components/CompareTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "套餐对比 - 最多 3 个 AI Coding Plan 同时比",
  description: "对比 AI Coding 套餐的价格、计费周期、额度原文、支持模型与工具兼容。",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage() {
  const result = await queryPublicData("compare.list", () => db.plan.findMany({ where: { status: "published" }, include: { provider: true } }), []);
  if (!result.available) return <DatabaseUnavailable />;
  const rows = result.data;
  const plans = rows.map(toPublicPlanT);
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">套餐对比</h1>
      <p className="mt-1 mb-5 text-sm text-gray-500">最多选择 3 个套餐，横向比较可核验的公开参数。</p>
      <CompareSection allPlans={plans} />
    </div>
  );
}
