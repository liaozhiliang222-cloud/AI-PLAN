import { describe, expect, it, vi } from "vitest";
import {
  fetchCompleteAADataset,
  mapAAModel,
  syncModelsFromAA,
  type AADataset,
  type AAModel,
} from "@/services/modelSync";

const baseModel: AAModel = {
  id: "aa-model-1",
  name: "Example Model (high)",
  slug: "example-model",
  release_date: "2026-08-01",
  model_creator: { name: "Example Lab" },
  evaluations: {
    artificial_analysis_intelligence_index: 63.1,
    artificial_analysis_coding_index: 78.3,
    artificial_analysis_agentic_index: 59.2,
  },
  artificial_analysis_intelligence_index_cost: {
    total_cost: 123.45,
    cost_per_task: { total_cost: 0.94 },
  },
  pricing: { price_1m_input_tokens: 2, price_1m_output_tokens: 6 },
  performance: { median_output_tokens_per_second: 57.4 },
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("mapAAModel", () => {
  it("preserves raw AA metrics, USD prices and cost per task", () => {
    expect(mapAAModel(baseModel)).toMatchObject({
      aaModelId: "aa-model-1",
      overall: 63.1,
      coding: 78.3,
      agent: 59.2,
      speedTokensPerSecond: 57.4,
      costPerTaskUsd: 0.94,
      inputPriceUsd: 2,
      outputPriceUsd: 6,
    });
  });

  it("keeps missing measurements null instead of inferring scores", () => {
    const mapped = mapAAModel({
      ...baseModel,
      evaluations: { artificial_analysis_coding_index: 78.3 },
      pricing: undefined,
      performance: undefined,
      artificial_analysis_intelligence_index_cost: undefined,
    });
    expect(mapped).toMatchObject({
      overall: null,
      coding: 78.3,
      agent: null,
      speedTokensPerSecond: null,
      costPerTaskUsd: null,
      inputPriceUsd: null,
      outputPriceUsd: null,
    });
  });
});

describe("fetchCompleteAADataset", () => {
  it("loads every page and records one consistent index version", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [baseModel],
        pagination: { page: 1, total_pages: 2, has_more: true },
      }))
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [{ ...baseModel, id: "aa-model-2", slug: "example-model-2" }],
        pagination: { page: 2, total_pages: 2, has_more: false },
      }));

    const dataset = await fetchCompleteAADataset("test-key", fetcher as unknown as typeof fetch, new Date("2026-08-28T00:00:00Z"));
    expect(dataset).toMatchObject({ indexVersion: "4.1", pagesFetched: 2 });
    expect(dataset.models).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects the complete load when any later page fails", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [baseModel],
        pagination: { page: 1, total_pages: 2, has_more: true },
      }))
      .mockResolvedValueOnce(response({ error: "temporary failure" }, 500));

    await expect(fetchCompleteAADataset("test-key", fetcher as unknown as typeof fetch)).rejects.toThrow("AA page 2 failed with HTTP 500");
  });

  it("rejects a truncated response even when has_more is false", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({
      intelligence_index_version: 4.1,
      data: [baseModel],
      pagination: { page: 1, total_pages: 2, has_more: false },
    }));

    await expect(fetchCompleteAADataset("test-key", fetcher as unknown as typeof fetch)).rejects.toThrow("pagination is inconsistent");
  });

  it("rejects response page mismatches", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({
      intelligence_index_version: 4.1,
      data: [baseModel],
      pagination: { page: 2, total_pages: 2, has_more: false },
    }));

    await expect(fetchCompleteAADataset("test-key", fetcher as unknown as typeof fetch)).rejects.toThrow("requested page 1");
  });

  it("rejects duplicate stable ids across pages", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [baseModel],
        pagination: { page: 1, total_pages: 2, has_more: true },
      }))
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [{ ...baseModel, slug: "different-slug" }],
        pagination: { page: 2, total_pages: 2, has_more: false },
      }));

    await expect(fetchCompleteAADataset("test-key", fetcher as unknown as typeof fetch)).rejects.toThrow("duplicate model id aa-model-1");
  });

  it("rejects duplicate slugs across pages", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [baseModel],
        pagination: { page: 1, total_pages: 2, has_more: true },
      }))
      .mockResolvedValueOnce(response({
        intelligence_index_version: 4.1,
        data: [{ ...baseModel, id: "aa-model-2" }],
        pagination: { page: 2, total_pages: 2, has_more: false },
      }));

    await expect(fetchCompleteAADataset("test-key", fetcher as unknown as typeof fetch)).rejects.toThrow("duplicate model slug example-model");
  });
});

describe("syncModelsFromAA", () => {
  it("does not persist anything when the complete load rejects", async () => {
    const persist = vi.fn();
    await expect(syncModelsFromAA({
      load: async () => { throw new Error("page 2 failed"); },
      persist,
    })).rejects.toThrow("page 2 failed");
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports missing raw coverage without default values", async () => {
    const dataset: AADataset = {
      models: [{ ...baseModel, evaluations: { artificial_analysis_coding_index: 78.3 } }],
      indexVersion: "4.1",
      fetchedAt: new Date("2026-08-28T00:00:00Z"),
      pagesFetched: 1,
    };
    const result = await syncModelsFromAA({ load: async () => dataset, persist: async () => "updated" });
    expect(result).toMatchObject({
      updated: 1,
      totalFetched: 1,
      missing: { intelligence: 1, coding: 0, agentic: 1 },
    });
  });
});
