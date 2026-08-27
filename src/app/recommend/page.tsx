import type { Metadata } from "next";
import { QuizClient } from "@/components/QuizClient";

export const metadata: Metadata = {
  title: "帮我选 AI Coding Plan - 30 秒选型测试",
  description: "回答 5 个问题（预算、场景、强度、偏好、工具），获得明确、可解释的 AI Coding 套餐购买建议。",
  alternates: { canonical: "/recommend" },
};

export default function RecommendPage() {
  return (
    <div className="pt-2 md:pt-6">
      <QuizClient />
    </div>
  );
}
