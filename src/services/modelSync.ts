/* artificialanalysis.ai 模型排行榜同步服务
   数据源：artificialanalysis.ai Data API (Free 层)
   同步：Top N Coding 模型（按 coding_index 排序），自动 upsert 到 Model 表 */

import { db } from "@/lib/db";

const KEY = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
const TOP_N = 50;

// artificialanalysis 厂商名 → 现有 provider slug 映射
const PROVIDER_MAP: Record<string, string> = {
  OpenAI: "openai",
  Google: "google",
  Anthropic: "anthropic",
  DeepSeek: "deepseek",
  Meta: "meta",
  "Z AI": "zhipu",
  Kimi: "moonshot",
  MiniMax: "minimax",
  Alibaba: "alibaba",
  Mistral: "mistral",
  SpaceXAI: "xai",
  NVIDIA: "nvidia",
  Amazon: "amazon",
  Cohere: "cohere",
  Microsoft: "microsoft",
  Tencent: "tencent",
  IBM: "ibm",
  Xiaomi: "xiaomi",
  Moonshot: "moonshot",
};

const OVERSEAS = ["Anthropic", "OpenAI", "Google", "Meta", "Mistral", "SpaceXAI", "NVIDIA", "Amazon", "Cohere", "Microsoft", "IBM", "X AI"];

interface AAModel {
  name: string;
  slug: string;
  release_date?: string | null;
  model_creator: { name: string };
  evaluations: {
    artificial_analysis_intelligence_index?: number | null;
    artificial_analysis_coding_index?: number | null;
    artificial_analysis_agentic_index?: number | null;
  };
  pricing?: {
    price_1m_input_tokens?: number | null;
    price_1m_output_tokens?: number | null;
  };
  performance?: { median_output_tokens_per_second?: number | null };
}

async function fetchAllModels(): Promise<AAModel[]> {
  const all: AAModel[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://artificialanalysis.ai/api/v2/language/models/free?page=${page}`, {
      headers: { "x-api-key": KEY || "" },
    });
    if (!res.ok) break;
    const j = (await res.json()) as { data: AAModel[]; pagination?: { has_more?: boolean } };
    all.push(...j.data);
    if (!j.pagination?.has_more) break;
  }
  return all;
}

async function ensureProvider(creatorName: string): Promise<number> {
  const slug = PROVIDER_MAP[creatorName] || creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let p = await db.provider.findUnique({ where: { slug } });
  if (!p) {
    p = await db.provider.create({
      data: {
        name: creatorName,
        slug,
        country: OVERSEAS.includes(creatorName) ? "overseas" : "domestic",
        logoColor: "#2563EB",
      },
    });
  }
  return p.id;
}

function costScore(priceIn?: number | null, priceOut?: number | null): number {
  if (priceIn == null && priceOut == null) return 60;
  const total = (priceIn ?? 0) + (priceOut ?? 0) * 4;
  if (total <= 0) return 95;
  if (total < 2) return 90;
  if (total < 5) return 82;
  if (total < 10) return 72;
  if (total < 20) return 60;
  if (total < 40) return 48;
  return 35;
}

function speedScore(tps?: number | null): number {
  if (tps == null) return 70;
  if (tps >= 200) return 95;
  if (tps >= 120) return 88;
  if (tps >= 60) return 78;
  if (tps >= 30) return 65;
  if (tps >= 15) return 50;
  return 35;
}

/** 从 artificialanalysis.ai 同步 Top N Coding 模型，返回 { created, updated } */
export async function syncModelsFromAA(): Promise<{ created: number; updated: number }> {
  if (!KEY) throw new Error("缺少 ARTIFICIAL_ANALYSIS_API_KEY 环境变量");

  const all = await fetchAllModels();
  const codingModels = all
    .filter((m) => m.evaluations?.artificial_analysis_coding_index != null)
    .sort((a, b) => (b.evaluations.artificial_analysis_coding_index ?? 0) - (a.evaluations.artificial_analysis_coding_index ?? 0))
    .slice(0, TOP_N);

  let created = 0;
  let updated = 0;

  for (const m of codingModels) {
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
      contextK: null,
      inputPrice,
      outputPrice,
      releaseDate: m.release_date ?? null,
      strengths: "[]",
      weaknesses: "[]",
      recommendedScenarios: "[]",
      status: "active",
    };

    const existing = await db.model.findUnique({ where: { slug: m.slug }, include: { score: true } });
    if (existing) {
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

  return { created, updated };
}
