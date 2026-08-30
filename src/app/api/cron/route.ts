import { NextRequest } from "next/server";
import { adminToken, safeEqual } from "@/lib/auth";
import {
  checkAllSourcesCore,
  samplePricesToday,
  detectPriceAnomalies,
  countUncheckedToday,
  fetchRssSources,
} from "@/services/monitor";
import { syncModelsFromAA } from "@/services/modelSync";

export const dynamic = "force-dynamic";

/**
 * 定时任务入口（供外部调度器调用）：
 *   GET /api/cron?token=<sha256(ADMIN_PASSWORD)>              → 价格采样 + 价格异常检测
 *   GET /api/cron?token=...&sources=1                         → 检查监控源（增量：跳过今天已检查的）
 *   GET /api/cron?token=...&sources=1&limit=4                 → 指定本批检查几个源（1-16，默认 4）
 *   GET /api/cron?token=...&sources=1&force=1                 → 忽略「今天已检查」，强制全量重查
 *   GET /api/cron?token=...&rss=1                             → 拉取媒体 RSS 源（新条目关键词预筛后入待审队列）
 *   GET /api/cron?token=...&models=1                          → 同步 artificialanalysis.ai 模型排行榜
 *
 * 响应含 remainingUnchecked：调度方循环调用直到为 0 即覆盖全部源。
 * 令牌为 adminToken() 派生的 SHA-256 hex（与登录 Cookie 一致）。
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const expected = await adminToken();
  if (!token || !safeEqual(token, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let remainingUnchecked: number | undefined;
  let checked: Awaited<ReturnType<typeof checkAllSourcesCore>> | undefined;
  if (req.nextUrl.searchParams.get("sources") === "1") {
    const raw = Number(req.nextUrl.searchParams.get("limit") ?? "4");
    const limit = Number.isFinite(raw) ? Math.max(1, Math.min(16, Math.trunc(raw))) : 4;
    const force = req.nextUrl.searchParams.get("force") === "1";
    checked = await checkAllSourcesCore({ limit, onlyUncheckedToday: !force });
    remainingUnchecked = await countUncheckedToday();
  }
  const sampled = await samplePricesToday();
  const anomalies = await detectPriceAnomalies();

  let modelSync: Awaited<ReturnType<typeof syncModelsFromAA>> | undefined;
  if (req.nextUrl.searchParams.get("models") === "1") {
    try {
      modelSync = await syncModelsFromAA();
    } catch (e) {
      console.error("[cron] 模型同步失败:", e instanceof Error ? e.message : String(e));
    }
  }

  const rss = req.nextUrl.searchParams.get("rss") === "1" ? await fetchRssSources() : undefined;

  const changed = checked?.filter((c) => c.status === "changed").length ?? 0;
  const drafted = checked?.filter((c) => c.draftGenerated).length ?? 0;

  return Response.json({
    ok: true,
    sampled,
    anomalies,
    checkedCount: checked?.length,
    changed,
    draftGenerated: drafted,
    remainingUnchecked,
    modelSync,
    rss,
  });
}
