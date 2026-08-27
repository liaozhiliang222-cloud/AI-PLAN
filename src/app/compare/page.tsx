import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { CompareSection } from "@/components/CompareTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "套餐对比 - 最多 3 个 AI Coding Plan 同时比",
  description: "对比 Kimi、GLM、Claude、Cursor 等 AI Coding 套餐的价格、模型、额度、工具兼容与综合推荐指数。",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage() {
  const rows = await db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } });
  const plans = rows.map(toPlanT);
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">套餐对比</h1>
      <p className="mt-1 mb-5 text-sm text-gray-500">最多选择 3 个套餐，横向比较价格、额度与能力。</p>
      <CompareSection allPlans={plans} />
    </div>
  );
}
