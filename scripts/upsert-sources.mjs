/**
 * 同步监控源（SourceMonitor）到数据库：与 prisma/seed.mjs 的 monitorSources 保持一致。
 * 只做增量，不触碰 Model / Plan 表。用法：node -r dotenv/config scripts/upsert-sources.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// 从 seed.mjs 提取 monitorSources，保证两边同源
const seedPath = path.join(__dirname, "..", "prisma", "seed.mjs");
const src = fs.readFileSync(seedPath, "utf8");
const m = src.match(/const monitorSources = (\[[\s\S]*?\r?\n {2}\];)/);
if (!m) { console.error("未找到 monitorSources"); process.exit(1); }
const sources = eval(m[1].replace(/;\s*$/, ""));

const wanted = new Set(sources.map((s) => s.url));

(async () => {
  console.log(DRY ? "=== DRY RUN ===" : "=== 写入模式 ===");
  console.log("seed 中的监控源:", sources.length);

  const existing = await db.sourceMonitor.findMany({ select: { id: true, url: true, label: true } });
  const stale = existing.filter((s) => !wanted.has(s.url));
  console.log("\n将移除的旧监控源 (" + stale.length + "):");
  stale.forEach((s) => console.log("  DEL " + s.label + " | " + s.url));

  let created = 0, updated = 0;
  for (const s of sources) {
    const prev = await db.sourceMonitor.findFirst({ where: { url: s.url } });
    if (prev) {
      if (prev.label !== s.label || prev.providerSlug !== s.providerSlug || prev.kind !== (s.kind ?? "page")) {
        if (!DRY) await db.sourceMonitor.update({ where: { id: prev.id }, data: { label: s.label, providerSlug: s.providerSlug, ...(s.kind ? { kind: s.kind } : {}) } });
        updated++;
        console.log("  UPD " + s.label);
      }
      continue;
    }
    if (!DRY) await db.sourceMonitor.create({ data: s });
    created++;
    console.log("  ADD " + s.label.padEnd(26) + s.url);
  }

  if (!DRY) {
    for (const s of stale) await db.sourceMonitor.delete({ where: { id: s.id } });
  }

  const total = await db.sourceMonitor.count();
  const enabled = await db.sourceMonitor.count({ where: { enabled: true } });
  console.log(`\n新增 ${created} / 更新 ${updated} / 移除 ${stale.length}`);
  console.log(`最终：${total} 个监控源（启用 ${enabled}）`);
  console.log("注意：新建的源 lastHash 为空，首次检查只记录基准、不报警，第二次起才做比对。");
  await db.$disconnect();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
