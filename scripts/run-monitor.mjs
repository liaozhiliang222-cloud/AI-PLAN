/**
 * 手动触发一次行情采集：调用站点 /api/cron 路由（复用其鉴权与流水线）。
 * 用法：node -r dotenv/config scripts/run-monitor.mjs [--sources=1] [--models=1]
 * 默认站点取 SITE_URL，未设置时用 http://localhost:3000。
 */
import { createHash } from "crypto";

const args = process.argv.slice(2);
const wantSources = args.includes("--sources=1") || args.includes("--sources");
const wantModels = args.includes("--models=1") || args.includes("--models");

const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
const pw = process.env.ADMIN_PASSWORD || "demo1234";
const token = createHash("sha256").update(`apr-admin:${pw}`).digest("hex");

const qs = new URLSearchParams({ token });
if (wantSources) qs.set("sources", "1");
if (wantModels) qs.set("models", "1");

const url = `${base}/api/cron?${qs}`;
console.log("请求:", url.replace(token, "***"));
console.log("（未加 --sources 只做价格采样与异常检测；加 --sources 会检查全部监控源）\n");

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(900000) });
  const text = await res.text();
  if (!res.ok) {
    console.error("HTTP", res.status);
    console.error(text.slice(0, 500));
    process.exit(1);
  }
  const r = JSON.parse(text);
  console.log("监控源检查:", r.checkedCount ?? "-", "个");
  console.log("检测到变化:", r.changed ?? "-", "个");
  console.log("生成草稿:", r.draftGenerated ?? "-", "个");
  console.log("价格采样新增:", r.sampled ?? "-", "条");
  console.log("价格异常:", r.anomalies ?? "-", "条");
  if (r.modelSync) console.log("模型同步:", JSON.stringify(r.modelSync));
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : String(e));
  process.exit(1);
}
