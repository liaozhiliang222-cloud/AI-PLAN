/* Artificial Analysis internal synchronization.
   Free API data must not be exposed as a mirrored public leaderboard. */
import { db } from "@/lib/db";

const API_URL = "https://artificialanalysis.ai/api/v2/language/models/free";
const AA_MODELS_URL = "https://artificialanalysis.ai/models";
const KEY = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
const PROVIDER_MAP: Record<string, string> = {
  OpenAI: "openai", Google: "google", Anthropic: "anthropic", DeepSeek: "deepseek", Meta: "meta",
  "Z AI": "zhipu", Kimi: "moonshot", MiniMax: "minimax", Alibaba: "alibaba", Mistral: "mistral",
  SpaceXAI: "xai", NVIDIA: "nvidia", Amazon: "amazon", Cohere: "cohere", Microsoft: "microsoft",
  Tencent: "tencent", IBM: "ibm", Xiaomi: "xiaomi", Moonshot: "moonshot",
};
const OVERSEAS = new Set(["Anthropic", "OpenAI", "Google", "Meta", "Mistral", "SpaceXAI", "NVIDIA", "Amazon", "Cohere", "Microsoft", "IBM", "X AI"]);

export interface AAModel {
  id: string;
  name: string;
  slug: string;
  release_date?: string | null;
  model_creator: { name: string };
  evaluations?: {
    artificial_analysis_intelligence_index?: number | null;
    artificial_analysis_coding_index?: number | null;
    artificial_analysis_agentic_index?: number | null;
  };
  artificial_analysis_intelligence_index_cost?: {
    total_cost?: number | null;
    cost_per_task?: { total_cost?: number | null } | null;
  } | null;
  pricing?: { price_1m_input_tokens?: number | null; price_1m_output_tokens?: number | null };
  performance?: { median_output_tokens_per_second?: number | null };
}

interface AAPage {
  intelligence_index_version?: string | number | null;
  data?: AAModel[];
  pagination?: { page?: number; total_pages?: number; has_more?: boolean };
}

type ValidatedAAPage = AAPage & {
  intelligence_index_version: string | number;
  data: AAModel[];
  pagination: { page: number; total_pages: number; has_more: boolean };
};

export interface AADataset {
  models: AAModel[];
  indexVersion: string | null;
  fetchedAt: Date;
  pagesFetched: number;
}

export interface AAMappedModel {
  aaModelId: string;
  name: string;
  slug: string;
  creatorName: string;
  releaseDate: string | null;
  sourceUrl: string;
  inputPriceUsd: number | null;
  outputPriceUsd: number | null;
  overall: number | null;
  coding: number | null;
  agent: number | null;
  speedTokensPerSecond: number | null;
  costPerTaskUsd: number | null;
}

export type AASyncResult = {
  created: number;
  updated: number;
  totalFetched: number;
  pagesFetched: number;
  indexVersion: string | null;
  fetchedAt: string;
  missing: { intelligence: number; coding: number; agentic: number; speed: number; cost: number };
};

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function aaModelSourceUrl(slug: string): string {
  return `${AA_MODELS_URL}/${encodeURIComponent(slug)}`;
}

/** Preserve AA values exactly. A missing value remains null and is never inferred. */
export function mapAAModel(model: AAModel): AAMappedModel {
  return {
    aaModelId: model.id,
    name: model.name,
    slug: model.slug,
    creatorName: model.model_creator.name,
    releaseDate: model.release_date ?? null,
    sourceUrl: aaModelSourceUrl(model.slug),
    inputPriceUsd: finiteOrNull(model.pricing?.price_1m_input_tokens),
    outputPriceUsd: finiteOrNull(model.pricing?.price_1m_output_tokens),
    overall: finiteOrNull(model.evaluations?.artificial_analysis_intelligence_index),
    coding: finiteOrNull(model.evaluations?.artificial_analysis_coding_index),
    agent: finiteOrNull(model.evaluations?.artificial_analysis_agentic_index),
    speedTokensPerSecond: finiteOrNull(model.performance?.median_output_tokens_per_second),
    costPerTaskUsd: finiteOrNull(model.artificial_analysis_intelligence_index_cost?.cost_per_task?.total_cost),
  };
}

function validatePage(page: AAPage, requestedPage: number): asserts page is ValidatedAAPage {
  if (!Array.isArray(page.data)) throw new Error(`AA page ${requestedPage} returned no data array`);
  if (page.intelligence_index_version == null || String(page.intelligence_index_version).trim() === "") {
    throw new Error(`AA page ${requestedPage} returned no intelligence index version`);
  }
  const pagination = page.pagination;
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
  if (pagination.has_more && page.data.length === 0) {
    throw new Error(`AA page ${requestedPage} is empty before the final page`);
  }
  for (const [index, model] of page.data.entries()) {
    if (!model || typeof model.id !== "string" || !model.id.trim() || typeof model.name !== "string" ||
        !model.name.trim() || typeof model.slug !== "string" || !model.slug.trim() || !model.model_creator?.name?.trim()) {
      throw new Error(`AA page ${requestedPage} contains an invalid model at index ${index}`);
    }
  }
}

/** Fetch every page before any database write. Any HTTP/payload failure rejects the whole run. */
export async function fetchCompleteAADataset(apiKey = KEY, fetcher: typeof fetch = fetch, fetchedAt = new Date()): Promise<AADataset> {
  if (!apiKey) throw new Error("缺少 ARTIFICIAL_ANALYSIS_API_KEY 环境变量");
  const models: AAModel[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  let pageNumber = 1;
  let indexVersion: string | null = null;
  let totalPages: number | null = null;

  while (pageNumber <= 1_000) {
    const response = await fetcher(`${API_URL}?page=${pageNumber}`, { headers: { "x-api-key": apiKey } });
    if (!response.ok) throw new Error(`AA page ${pageNumber} failed with HTTP ${response.status}`);
    const page = (await response.json()) as AAPage;
    validatePage(page, pageNumber);
    const pageVersion = String(page.intelligence_index_version);
    if (indexVersion !== null && pageVersion !== indexVersion) {
      throw new Error(`AA index version changed during pagination (${indexVersion} -> ${pageVersion})`);
    }
    indexVersion ??= pageVersion;
    if (totalPages !== null && page.pagination.total_pages !== totalPages) {
      throw new Error(`AA total_pages changed during pagination (${totalPages} -> ${page.pagination.total_pages})`);
    }
    totalPages ??= page.pagination.total_pages;
    for (const model of page.data) {
      if (seenIds.has(model.id)) throw new Error(`AA dataset contains duplicate model id ${model.id}`);
      if (seenSlugs.has(model.slug)) throw new Error(`AA dataset contains duplicate model slug ${model.slug}`);
      seenIds.add(model.id);
      seenSlugs.add(model.slug);
      models.push(model);
    }
    if (!page.pagination.has_more) return { models, indexVersion, fetchedAt, pagesFetched: pageNumber };
    pageNumber += 1;
  }
  throw new Error("AA pagination exceeded the 1000-page safety limit");
}

async function ensureProvider(creatorName: string, cache?: Map<string, number>): Promise<number> {
  const cached = cache?.get(creatorName);
  if (cached !== undefined) return cached;
  const slug = PROVIDER_MAP[creatorName] || creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let provider = await db.provider.findUnique({ where: { slug } });
  if (!provider) {
    provider = await db.provider.create({ data: { name: creatorName, slug, country: OVERSEAS.has(creatorName) ? "overseas" : "domestic", logoColor: "#2563EB" } });
  }
  cache?.set(creatorName, provider.id);
  return provider.id;
}

async function persistAAModel(model: AAModel, dataset: AADataset, providerCache?: Map<string, number>): Promise<"created" | "updated"> {
  const mapped = mapAAModel(model);
  const providerId = await ensureProvider(mapped.creatorName, providerCache);
  const existing = await db.model.findFirst({ where: { OR: [{ aaModelId: mapped.aaModelId }, { slug: mapped.slug }] }, include: { score: true } });
  const score = {
    overall: mapped.overall, coding: mapped.coding, agent: mapped.agent,
    frontend: null, backend: null, debug: null, longContext: null,
    speed: mapped.speedTokensPerSecond, cost: mapped.costPerTaskUsd,
  };
  const sourceData = {
    providerId, name: mapped.name, slug: mapped.slug,
    inputPrice: mapped.inputPriceUsd, outputPrice: mapped.outputPriceUsd, releaseDate: mapped.releaseDate,
    aaModelId: mapped.aaModelId, aaIndexVersion: dataset.indexVersion, aaFetchedAt: dataset.fetchedAt, aaSourceUrl: mapped.sourceUrl,
    status: "active",
  };

  if (existing) {
    // Keep editorial notes/context intact; AA Free does not supply those fields.
    await db.model.update({ where: { id: existing.id }, data: { ...sourceData, score: existing.score ? { update: score } : { create: { ...score, trend: 0 } } } });
    return "updated";
  }
  await db.model.create({ data: {
    ...sourceData,
    contextK: null,
    strengths: "[]",
    weaknesses: "[]",
    recommendedScenarios: "[]",
    score: { create: { ...score, trend: 0 } },
  } });
  return "created";
}

type SyncDependencies = {
  load?: () => Promise<AADataset>;
  persist?: (model: AAModel, dataset: AADataset) => Promise<"created" | "updated">;
};

/** Complete loading always finishes before the first persistence call. */
export async function syncModelsFromAA(deps: SyncDependencies = {}): Promise<AASyncResult> {
  const dataset = await (deps.load ?? (() => fetchCompleteAADataset()))();
  const providerCache = new Map<string, number>();
  const persist = deps.persist ?? ((model, currentDataset) => persistAAModel(model, currentDataset, providerCache));
  let created = 0;
  let updated = 0;
  const missing = { intelligence: 0, coding: 0, agentic: 0, speed: 0, cost: 0 };
  for (const model of dataset.models) {
    const mapped = mapAAModel(model);
    if (mapped.overall === null) missing.intelligence += 1;
    if (mapped.coding === null) missing.coding += 1;
    if (mapped.agent === null) missing.agentic += 1;
    if (mapped.speedTokensPerSecond === null) missing.speed += 1;
    if (mapped.costPerTaskUsd === null) missing.cost += 1;
    const result = await persist(model, dataset);
    if (result === "created") created += 1;
    else updated += 1;
  }
  return {
    created, updated, totalFetched: dataset.models.length, pagesFetched: dataset.pagesFetched,
    indexVersion: dataset.indexVersion, fetchedAt: dataset.fetchedAt.toISOString(), missing,
  };
}
