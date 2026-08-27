/* 同步 artificialanalysis.ai 模型排行榜数据到 Model 表
   数据源：artificialanalysis.ai Data API (Free 层)
   同步：Top N Coding 模型（按 coding_index 排序）
   运行：node scripts/sync-models.mjs
*/

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const KEY = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
const TOP_N = Number(process.env.SYNC_TOP_N || 50);

// artificialanalysis 厂商名 → 现有 provider slug 映射（无匹配则自动创建）
const PROVIDER_MAP = {
  "OpenAI": "openai",
  "Google": "google",
  "Anthropic": "anthropic",
  "DeepSeek": "deepseek",
  "Meta": "meta",
  "Z AI": "zhipu",
  "Kimi": "moonshot",
  "MiniMax": "minimax",
  "Alibaba": "alibaba",
  "Mistral": "mistral",
  "SpaceXAI": "xai",
  "NVIDIA": "nvidia",
  "Amazon": "amazon",
  "Cohere": "cohere",
  "Microsoft": "microsoft",
  "Tencent": "tencent",
  "IBM": "ibm",
  "Xiaomi": "xiaomi",
  "Moonshot": "moonshot",
};

const J = JSON.stringify;

async function fetchAllModels() {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `https://artificialanalysis.ai/api/v2/language/models/free?page=${page}`,
      { headers: { "x-api-key": KEY } },
    );
    if (!res.ok) break;
    const j = await res.json();
    all.push(...j.data);
    if (!j.pagination?.has_more) break;
  }
  return all;
}

// 保证 provider 存在，返回 providerId
async function ensureProvider(creatorName) {
  const slug = PROVIDER_MAP[creatorName] || creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let p = await db.provider.findUnique({ where: { slug } });
  if (!p) {
    p = await db.provider.create({
      data: {
        name: creatorName,
        slug,
        country: ["Anthropic", "OpenAI", "Google", "Meta", "Mistral", "SpaceXAI", "NVIDIA", "Amazon", "Cohere", "Microsoft", "IBM", "X AI"].includes(creatorName)
          ? "overseas"
          : "domestic",
        logoColor: "#2563EB",
      },
    });
    console.log("  新建 provider:", creatorName, "->", slug);
  }
  return p.id;
}

// 价格性价比分：价格越低分越高（0-100）
function costScore(priceIn, priceOut) {
  if (priceIn == null && priceOut == null) return 60;
  const total = (priceIn ?? 0) + (priceOut ?? 0) * 4; // 输出权重更高（Coding 场景输出多）
  if (total <= 0) return 95;
  if (total < 2) return 90;
  if (total < 5) return 82;
  if (total < 10) return 72;
  if (total < 20) return 60;
  if (total < 40) return 48;
  return 35;
}

// 速度分：输出 token/s 映射到 0-100
function speedScore(tps) {
  if (tps == null) return 70;
  if (tps >= 200) return 95;
  if (tps >= 120) return 88;
  if (tps >= 60) return 78;
  if (tps >= 30) return 65;
  if (tps >= 15) return 50;
  return 35;
}

async function main() {
  if (!KEY) {
    console.error("缺少 ARTIFICIAL_ANALYSIS_API_KEY 环境变量");
    process.exit(1);
  }

  console.log("拉取 artificialanalysis.ai 模型数据...");
  const all = await fetchAllModels();
  console.log("总模型数:", all.length);

  const codingModels = all
    .filter((m) => m.evaluations?.artificial_analysis_coding_index != null)
    .sort((a, b) => b.evaluations.artificial_analysis_coding_index - a.evaluations.artificial_analysis_coding_index)
    .slice(0, TOP_N);

  console.log(`同步 Top ${TOP_N} Coding 模型（最高 Coding: ${codingModels[0]?.evaluations.artificial_analysis_coding_index}）`);

  let created = 0;
  let updated = 0;

  for (let i = 0; i < codingModels.length; i++) {
    const m = codingModels[i];
    const providerId = await ensureProvider(m.model_creator.name);
    const coding = m.evaluations.artificial_analysis_coding_index;
    const agent = m.evaluations.artificial_analysis_agentic_index;
    const overall = m.evaluations.artificial_analysis_intelligence_index;
    const inputPrice = m.pricing?.price_1m_input_tokens ?? null;
    const outputPrice = m.pricing?.price_1m_output_tokens ?? null;
    const tps = m.performance?.median_output_tokens_per_second ?? null;

    const scores = {
      coding: Math.round(coding ?? 60),
      agent: Math.round(agent ?? coding ?? 60),
      frontend: Math.round(coding ?? 60),
      backend: Math.round(coding ?? 60),
      debug: Math.round(coding ?? 60),
      longContext: 70,
      speed: speedScore(tps),
      cost: costScore(inputPrice, outputPrice),
    };
    const scoreOverall = Math.round(
      scores.coding * 0.3 + scores.agent * 0.25 + scores.frontend * 0.1 + scores.backend * 0.1 +
      scores.debug * 0.1 + scores.longContext * 0.05 + scores.speed * 0.05 + scores.cost * 0.05,
    );

    const baseData = {
      providerId,
      name: m.name,
      contextK: null, // Free 层无 context 字段
      inputPrice,
      outputPrice,
      releaseDate: m.release_date ?? null,
      strengths: J([]),
      weaknesses: J([]),
      recommendedScenarios: J([]),
      status: "active",
    };

    const existing = await db.model.findUnique({ where: { slug: m.slug }, include: { score: true } });
    if (existing) {
      // 更新：score 是 1:1，需分别 update 或 create
      await db.model.update({
        where: { slug: m.slug },
        data: {
          ...baseData,
          score: existing.score
            ? { update: { ...scores, overall: scoreOverall } }
            : { create: { ...scores, overall: scoreOverall, trend: 0 } },
        },
      });
      updated++;
    } else {
      await db.model.create({
        data: { ...baseData, slug: m.slug, score: { create: { ...scores, overall: scoreOverall, trend: 0 } } },
      });
      created++;
    }
  }

  console.log(`完成：新建 ${created} 个，更新 ${updated} 个模型`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
