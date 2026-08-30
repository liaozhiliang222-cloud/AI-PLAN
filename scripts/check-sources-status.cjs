const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
(async () => {
  const rows = await db.sourceMonitor.findMany({
    select: { label: true, lastCheckedAt: true, lastHash: true, enabled: true },
    orderBy: { lastCheckedAt: "desc" },
  });
  for (const r of rows) {
    console.log(
      (r.lastCheckedAt || new Date(0)).toISOString() + " | hash:" + (r.lastHash || "-").slice(0, 8) +
      " | " + r.label + (r.enabled === false ? " [disabled]" : "")
    );
  }
  const latest = await db.changeLog.findFirst({
    orderBy: { checkedAt: { sort: "desc", nulls: "last" } },
    select: { checkedAt: true, detectedAt: true, title: true, sourceType: true, changeType: true },
  });
  console.log("\nLatest ChangeLog:", JSON.stringify(latest));
  const counts = await db.changeLog.groupBy({ by: ["changeType"], _count: true });
  console.log("ChangeLog by type:", JSON.stringify(counts));
  await db.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
