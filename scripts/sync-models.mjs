/* Artificial Analysis internal synchronization for GitHub Actions.
   Free API data is stored for internal use and is not mirrored publicly. */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  }),
});
const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
const apiUrl = "https://artificialanalysis.ai/api/v2/language/models/free";
const providerMap = {
  OpenAI: "openai", Google: "google", Anthropic: "anthropic", DeepSeek: "deepseek", Meta: "meta",
  "Z AI": "zhipu", Kimi: "moonshot", MiniMax: "minimax", Alibaba: "alibaba", Mistral: "mistral",
  SpaceXAI: "xai", NVIDIA: "nvidia", Amazon: "amazon", Cohere: "cohere", Microsoft: "microsoft",
  Tencent: "tencent", IBM: "ibm", Xiaomi: "xiaomi", Moonshot: "moonshot",
};
const overseas = new Set(["Anthropic", "OpenAI", "Google", "Meta", "Mistral", "SpaceXAI", "NVIDIA", "Amazon", "Cohere", "Microsoft", "IBM", "X AI"]);

function finiteOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validatePage(payload, requestedPage) {
  if (!Array.isArray(payload?.data)) throw new Error(`AA page ${requestedPage} returned no data array`);
  if (payload.intelligence_index_version == null || String(payload.intelligence_index_version).trim() === "") {
    throw new Error(`AA page ${requestedPage} returned no intelligence index version`);
  }
  const pagination = payload.pagination;
  if (!pagination || typeof pagination.page !== "number" || !Number.isInteger(pagination.page) ||
      typeof pagination.total_pages !== "number" || !Number.isInteger(pagination.total_pages) ||
      typeof pagination.has_more !== "boolean") {
    throw new Error(`AA page ${requestedPage} returned invalid pagination metadata`);
  }
  if (pagination.page !== requestedPage) {
    throw new Error(`AA requested page ${requestedPage} but response reports page ${pagination.page}`);
  }
  if (pagination.total_pages < 1 || pagination.total_pages < requestedPage) {
    throw new Error(`AA page ${requestedPage} returned invalid total_pages=${pagination.total_pages}`);
  }
  if (pagination.has_more !== (requestedPage < pagination.total_pages)) {
    throw new Error(`AA page ${requestedPage} pagination is inconsistent with total_pages=${pagination.total_pages}`);
  }
  if (pagination.has_more && payload.data.length === 0) {
    throw new Error(`AA page ${requestedPage} is empty before the final page`);
  }
  payload.data.forEach((model, index) => {
    if (!model || typeof model.id !== "string" || !model.id.trim() || typeof model.name !== "string" ||
        !model.name.trim() || typeof model.slug !== "string" || !model.slug.trim() || !model.model_creator?.name?.trim()) {
      throw new Error(`AA page ${requestedPage} contains an invalid model at index ${index}`);
    }
  });
}

async function fetchCompleteDataset() {
  if (!apiKey) throw new Error("缺少 ARTIFICIAL_ANALYSIS_API_KEY 环境变量");
  const models = [];
  const seenIds = new Set();
  const seenSlugs = new Set();
  let page = 1;
  let indexVersion = null;
  let totalPages = null;

  while (page <= 1_000) {
    const response = await fetch(`${apiUrl}?page=${page}`, { headers: { "x-api-key": apiKey } });
    if (!response.ok) throw new Error(`AA page ${page} failed with HTTP ${response.status}`);
    const payload = await response.json();
    validatePage(payload, page);
    const pageVersion = String(payload.intelligence_index_version);
    if (indexVersion !== null && pageVersion !== indexVersion) {
      throw new Error(`AA index version changed during pagination (${indexVersion} -> ${pageVersion})`);
    }
    indexVersion ??= pageVersion;
    if (totalPages !== null && payload.pagination.total_pages !== totalPages) {
      throw new Error(`AA total_pages changed during pagination (${totalPages} -> ${payload.pagination.total_pages})`);
    }
    totalPages ??= payload.pagination.total_pages;
    for (const model of payload.data) {
      if (seenIds.has(model.id)) throw new Error(`AA dataset contains duplicate model id ${model.id}`);
      if (seenSlugs.has(model.slug)) throw new Error(`AA dataset contains duplicate model slug ${model.slug}`);
      seenIds.add(model.id);
      seenSlugs.add(model.slug);
      models.push(model);
    }
    if (!payload.pagination.has_more) return { models, indexVersion, fetchedAt: new Date(), pagesFetched: page };
    page += 1;
  }
  throw new Error("AA pagination exceeded the 1000-page safety limit");
}

function mapModel(model) {
  return {
    aaModelId: model.id,
    name: model.name,
    slug: model.slug,
    creatorName: model.model_creator.name,
    releaseDate: model.release_date ?? null,
    sourceUrl: `https://artificialanalysis.ai/models/${encodeURIComponent(model.slug)}`,
    inputPrice: finiteOrNull(model.pricing?.price_1m_input_tokens),
    outputPrice: finiteOrNull(model.pricing?.price_1m_output_tokens),
    overall: finiteOrNull(model.evaluations?.artificial_analysis_intelligence_index),
    coding: finiteOrNull(model.evaluations?.artificial_analysis_coding_index),
    agent: finiteOrNull(model.evaluations?.artificial_analysis_agentic_index),
    speed: finiteOrNull(model.performance?.median_output_tokens_per_second),
    cost: finiteOrNull(model.artificial_analysis_intelligence_index_cost?.cost_per_task?.total_cost),
  };
}

async function ensureProvider(creatorName, cache) {
  if (cache.has(creatorName)) return cache.get(creatorName);
  const slug = providerMap[creatorName] || creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let provider = await db.provider.findUnique({ where: { slug } });
  if (!provider) {
    provider = await db.provider.create({
      data: { name: creatorName, slug, country: overseas.has(creatorName) ? "overseas" : "domestic", logoColor: "#2563EB" },
    });
  }
  cache.set(creatorName, provider.id);
  return provider.id;
}

async function persistModel(model, dataset, providerCache) {
  const mapped = mapModel(model);
  const providerId = await ensureProvider(mapped.creatorName, providerCache);
  const existing = await db.model.findFirst({
    where: { OR: [{ aaModelId: mapped.aaModelId }, { slug: mapped.slug }] },
    include: { score: true },
  });
  const score = {
    overall: mapped.overall,
    coding: mapped.coding,
    agent: mapped.agent,
    frontend: null,
    backend: null,
    debug: null,
    longContext: null,
    speed: mapped.speed,
    cost: mapped.cost,
  };
  const sourceData = {
    providerId,
    name: mapped.name,
    slug: mapped.slug,
    inputPrice: mapped.inputPrice,
    outputPrice: mapped.outputPrice,
    releaseDate: mapped.releaseDate,
    aaModelId: mapped.aaModelId,
    aaIndexVersion: dataset.indexVersion,
    aaFetchedAt: dataset.fetchedAt,
    aaSourceUrl: mapped.sourceUrl,
    status: "active",
  };

  if (existing) {
    await db.model.update({
      where: { id: existing.id },
      data: { ...sourceData, score: existing.score ? { update: score } : { create: { ...score, trend: 0 } } },
    });
    return "updated";
  }
  await db.model.create({
    data: {
      ...sourceData,
      contextK: null,
      strengths: "[]",
      weaknesses: "[]",
      recommendedScenarios: "[]",
      score: { create: { ...score, trend: 0 } },
    },
  });
  return "created";
}

async function main() {
  console.log("正在完整拉取 Artificial Analysis 内部数据…");
  const dataset = await fetchCompleteDataset();
  console.log(`校验通过：${dataset.models.length} 个模型，${dataset.pagesFetched} 页，Index ${dataset.indexVersion ?? "unknown"}`);

  let created = 0;
  let updated = 0;
  const providerCache = new Map();
  for (const model of dataset.models) {
    const result = await persistModel(model, dataset, providerCache);
    if (result === "created") created += 1;
    else updated += 1;
  }
  console.log(`完成：新建 ${created}，更新 ${updated}；缺失指标均保留为 null`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
