import type { Metadata } from "next";
import { QuizClient } from "@/components/QuizClient";

export const metadata: Metadata = {
  title: "帮我选 · AI Coding 套餐",
  description: "根据预算、区域与工具官方兼容条件严格筛选候选套餐，不生成能力评分。",
  alternates: { canonical: "/recommend" },
};

export default function RecommendPage() {
  return (
    <div className="pt-2 md:pt-6">
      <QuizClient />
    </div>
  );
}
