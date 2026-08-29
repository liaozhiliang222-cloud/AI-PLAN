/**
 * 只补 PlanModel 关联（幂等）：主 upsert 脚本在部分环境下关联步骤会静默中断，
 * 此脚本独立运行、逐条 try-catch，失败重跑即可续传。
 * 用法：node -r dotenv/config scripts/link-plans.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  }),
});

const seedSrc = fs.readFileSync(path.join(__dirname, "..", "prisma", "seed.mjs"), "utf8");
// 从 upsert-plans.mjs 提取 PLAN_MODELS，保证两边同源
const upSrc = fs.readFileSync(path.join(__dirname, "upsert-plans.mjs"), "utf8");
const pmMatch = upSrc.match(/const PLAN_MODELS = \{([\s\S]*?)\n\};/);
if (!pmMatch) { console.error("未找到 PLAN_MODELS"); process.exit(1); }
const PLAN_MODELS = eval("({" + pmMatch[1] + "})");
void seedSrc;

(async () => {
  const plans = await db.plan.findMany({ select: { id: true, slug: true } });
  const models = await db.model.findMany({ select: { id: true, slug: true } });
  const planId = new Map(plans.map((p) => [p.slug, p.id]));
  const modelId = new Map(models.map((m) => [m.slug, m.id]));

  let ok = 0, skip = 0, fail = 0;
  for (const [planSlug, list] of Object.entries(PLAN_MODELS)) {
    const pid = planId.get(planSlug);
    if (pid == null) { console.log("跳过（套餐不存在）", planSlug); skip++; continue; }
    for (const [modelSlug, mult, rec] of list) {
      const mid = modelId.get(modelSlug);
      if (mid == null) { console.log("跳过（模型不存在）", planSlug, "<-", modelSlug); skip++; continue; }
      try {
        await db.planModel.upsert({
          where: { planId_modelId: { planId: pid, modelId: mid } },
          create: { planId: pid, modelId: mid, multiplier: mult, recommended: rec },
          update: { multiplier: mult, recommended: rec },
        });
        ok++;
      } catch (e) {
        console.log("失败", planSlug, "<-", modelSlug, ":", String(e.message || e).slice(0, 120));
        fail++;
      }
    }
  }
  console.log(`关联成功 ${ok} / 失败 ${fail} / 跳过 ${skip}`);
  if (fail > 0) { console.log("存在失败项，重跑本脚本可续传（幂等）"); process.exit(1); }
  await db.$disconnect();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
