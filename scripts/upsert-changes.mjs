/**
 * 行情变化数据维护：清理失效记录 + 补入 2026-08 已核实的真实变化。
 * 用法：node -r dotenv/config scripts/upsert-changes.mjs [--dry]
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DRY = process.argv.includes("--dry");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// 已删除的旧套餐 slug：指向它们的记录已失效，一并清理
const DEAD_SLUGS = ["kimi-presto", "glm-flash-free", "minimax-coding", "marscode-pro", "opencode-zen"];

// 与新套餐数据矛盾的旧记录标题
const STALE_TITLES = ["GLM Pro 降价至 ¥59", "Fast Requests 超额定价调整", "调整周额度", "每日 Pro 请求数翻倍", "Pro 档调价至 ¥69"];

// [changeType, planSlug|null, modelSlug|null, title, summary, importance, from, to, sourceType, dateISO, impactText]
const NEW_CHANGES = [
  ["new_model", null, "glm-5-3", "GLM-5.3 发布并全量进入 GLM Coding Plan",
    "2026-08-14 发布、08-19 API 上线。Terminal-Bench 3.0 由 4.6 提升至 28.3，DeepSWE v1.1 由 46.2 提升至 66.9；1M 上下文 / 128K 最大输出，始终开启思考模式。",
    "major", 52, 59, "benchmark", "2026-08-19T10:00:00+08:00", "AA Intelligence 52.6 → 59.5 ↑"],

  ["new_model", null, "kimi-k3", "Kimi K3 发布：2.8T 参数、1M 上下文",
    "2026-07-17 发布。需 Moderato（¥99）及以上档位解锁，完整 1M 上下文仅 Allegro（¥699）档提供。",
    "major", 45, 60, "official", "2026-07-17T10:00:00+08:00", "AA Intelligence 45.1 → 59.7 ↑"],

  ["new_model", null, "claude-opus-5", "Claude Opus 5 上线，$5/$25 per MTok",
    "2026-07-24 上线，带 effort 调节档位，是当前对 token 账单影响最大的杠杆之一。",
    "major", 55, 63, "official", "2026-07-24T10:00:00+08:00", "AA Intelligence 55.3 → 63.1 ↑"],

  ["policy", "claude-pro", null, "Claude Fable 5 改为按 API 额度计费",
    "自 2026-07-20 起 Fable 5 不再计入订阅额度，改按标准 API 费率（$10/$50）走用量额度；Max 与 Team Premium 保留周额度的 50%。",
    "major", 78, 73, "official", "2026-07-20T10:00:00+08:00", "推荐指数 78 → 73 ↓"],

  ["price", "claude-pro", null, "Claude Sonnet 5 将于 9/1 起提价 50%",
    "Sonnet 5 由 $2/$10 调整为 $3/$15 per 1M tokens（batch $1/$5 → $1.50/$7.50），2026-09-01 生效。走 API 的用户成本上升明显。",
    "major", 73, 70, "official", "2026-08-25T10:00:00+08:00", "推荐指数 73 → 70 ↓"],

  ["policy", "claude-max-5x", null, "Claude 周额度 +50% 促销于 8/19 到期",
    "自 2026-05 起多次延期的周额度 +50% 促销（覆盖 Pro / Max / Team / 席位制 Enterprise）于 2026-08-19 到期，周额度恢复基准值。",
    "major", 80, 76, "official", "2026-08-19T10:00:00+08:00", "推荐指数 80 → 76 ↓"],

  ["launch", "cursor-hobby", null, "Cursor 推出 Start 计划（印度）",
    "₹649/月（含税），覆盖 Cursor Models 额度池（Grok 4.6 / 4.5、Composer 2.5）与 Cloud Agents；不含 Other Models 额度池、Bugbot 与 Auto。",
    "normal", null, null, "official", "2026-08-12T10:00:00+08:00", null],

  // 来源挂 Cursor 定价页：该事件属于 Cursor Models 池，xai 这个 AA 自动建的 provider 没有 website
  ["new_model", "cursor-pro", "grok-4-6", "Grok 4.6 上线并进入 Cursor Models 池",
    "2026-08-12 起一周内享 50% 上线折扣。与 Grok 4.5、Composer 2.5 同属 Cursor Models 额度池，不计入第三方模型额度。",
    "normal", 55, 61, "official", "2026-08-12T10:00:00+08:00", "AA Intelligence 55.8 → 60.9 ↑"],

  ["price", "deepseek-payg", null, "DeepSeek 官方公告计划上调定价",
    "官方文档提示「近期计划上调整体定价，涨幅较大」但未给具体日期。按量用户建议在下调前核对当日官方价格。",
    "major", 82, 76, "official", "2026-08-20T10:00:00+08:00", "推荐指数 82 → 76 ↓"],

  ["launch", "qwen-lite", null, "阿里云百炼 Qwen Token Plan 改用 Credits 制",
    "由按量切换为 Credits 制：入门档 700 Credits/5h、2,500 Credits/周，模型阵容含 Qwen3.8-Max、DeepSeek-V4-Pro、qwen3-coder 与 GLM。",
    "normal", null, null, "official", "2026-08-10T10:00:00+08:00", null],

  ["policy", "volc-ark-small", null, "火山方舟 Agent Plan 活动价 ¥9.9 起",
    "Small / Medium 档活动期 ¥9.9/月（限前两月），第三月起回到 ¥40 刊例价；Kimi-K3 部分能力需 Medium 及以上。",
    "normal", 77, 77, "official", "2026-08-01T10:00:00+08:00", null],
];

(async () => {
  console.log(DRY ? "=== DRY RUN ===" : "=== 写入模式 ===");

  // 1) 清理失效记录
  const dead = await db.changeLog.findMany({ where: { entitySlug: { in: DEAD_SLUGS } }, select: { id: true, title: true, entitySlug: true } });
  console.log("\n失效记录（指向已删除套餐）" + dead.length + " 条:");
  dead.forEach((c) => console.log("  DEL " + c.entitySlug + " | " + c.title));
  if (!DRY) await db.changeLog.deleteMany({ where: { id: { in: dead.map((c) => c.id) } } });

  // 2) 清理与新数据矛盾的旧记录
  const stale = await db.changeLog.findMany({ where: { title: { in: STALE_TITLES } }, select: { id: true, title: true } });
  console.log("\n与新套餐数据矛盾的旧记录 " + stale.length + " 条:");
  stale.forEach((c) => console.log("  DEL " + c.title));
  if (!DRY) await db.changeLog.deleteMany({ where: { id: { in: stale.map((c) => c.id) } } });

  // 3) 写入新记录
  const providers = await db.provider.findMany({ select: { id: true, slug: true, name: true, website: true, officialSource: true } });
  const provBySlug = {};
  providers.forEach((p) => { provBySlug[p.slug] = p; });
  const plans = await db.plan.findMany({ select: { id: true, slug: true, providerId: true } });
  const models = await db.model.findMany({ select: { id: true, slug: true, providerId: true } });
  const planBySlug = {}; plans.forEach((p) => { planBySlug[p.slug] = p; });
  const modelBySlug = {}; models.forEach((m) => { modelBySlug[m.slug] = m; });

  let added = 0, skipped = 0;
  console.log("\n新增记录:");
  for (const [type, planSlug, modelSlug, title, summary, importance, from, to, srcType, dateISO, impactText] of NEW_CHANGES) {
    const dup = await db.changeLog.findFirst({ where: { title } });
    if (dup) { console.log("  SKIP（已存在）" + title); skipped++; continue; }

    const plan = planSlug ? planBySlug[planSlug] : null;
    const model = modelSlug ? modelBySlug[modelSlug] : null;
    const pid = plan ? plan.providerId : model ? model.providerId : null;
    const provider = pid ? providers.find((p) => p.id === pid) : null;
    const sourceUrl = provider ? provider.officialSource || provider.website : null;

    if (!sourceUrl) { console.log("  SKIP（无来源）" + title); skipped++; continue; }

    const data = {
      entityType: planSlug ? "plan" : modelSlug ? "model" : "provider",
      entitySlug: planSlug || modelSlug || null,
      planId: plan ? plan.id : null,
      modelId: model ? model.id : null,
      changeType: type, title, summary, importance,
      impactFrom: typeof from === "number" ? from : null,
      impactTo: typeof to === "number" ? to : null,
      impactText: impactText || null,
      sourceType: srcType,
      sourceUrl,
      sourceTitle: provider ? provider.name + " 官方页面" : null,
      checkedAt: new Date(dateISO),
      detectedAt: new Date(dateISO),
      verified: true,
    };
    if (!DRY) await db.changeLog.create({ data });
    added++;
    console.log("  ADD [" + type + "] " + title);
  }

  const visible = await db.changeLog.count({
    where: { sourceType: { not: "editorial" }, sourceUrl: { not: null }, sourceTitle: { not: null }, checkedAt: { not: null }, verified: true },
  });
  console.log("\n新增 " + added + " 条，跳过 " + skipped + " 条；/changes 页面可见: " + visible + " 条");
  await db.$disconnect();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
