import { NextRequest } from "next/server";
import { adminToken, safeEqual } from "@/lib/auth";
import { checkAllSourcesWithDraft, samplePricesToday, detectPriceAnomalies } from "@/services/monitor";

export const dynamic = "force-dynamic";

/**
 * 定时任务入口（供外部调度器调用）：
 *   GET /api/cron?token=<sha256(ADMIN_PASSWORD)>       → 价格采样 + 价格异常检测
 *   GET /api/cron?token=...&sources=1                  → 同时检查全部监控源（变化自动生成草稿）
 *
 * 令牌为 adminToken() 派生的 SHA-256 hex（与登录 Cookie 一致）。
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const expected = await adminToken();
  if (!token || !safeEqual(token, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let checked: Awaited<ReturnType<typeof checkAllSourcesWithDraft>> | undefined;
  if (req.nextUrl.searchParams.get("sources") === "1") {
    checked = await checkAllSourcesWithDraft();
  }
  const sampled = await samplePricesToday();
  const anomalies = await detectPriceAnomalies();

  const changed = checked?.filter((c) => c.status === "changed").length ?? 0;
  const drafted = checked?.filter((c) => c.draftGenerated).length ?? 0;

  return Response.json({
    ok: true,
    sampled,
    anomalies,
    checkedCount: checked?.length,
    changed,
    draftGenerated: drafted,
  });
}
