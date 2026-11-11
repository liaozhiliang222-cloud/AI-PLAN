import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mapAAModel, syncModelsFromAA, type AAModel } from "@/services/modelSync";

const db = vi.hoisted(() => ({
  provider: { findUnique: vi.fn(), create: vi.fn() },
  model: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  changeLog: { findFirst: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
  $disconnect: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@prisma/client", () => ({ PrismaClient: vi.fn(function () { return db; }) }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: vi.fn(function () {}) }));

// Deliberately different v2/v3 values catch accidental fallback or averaging.
const model = {
  id: "existing", name: "Example Model", slug: "example-model",
  model_creator: { name: "Example Lab" },
  evaluations: { artificial_analysis_intelligence_index: 31.7 },
  pricing: { price_1m_input_tokens: 1.4, price_1m_output_tokens: 4.4 },
  performance: { median_output_tokens_per_second: 80.07 },
  performance_v3: { mean_output_tokens_per_second: 62.36 },
};
const models = [
  model,
  { ...model, id: "new", slug: "new-model", performance_v3: { mean_output_tokens_per_second: 0 } },
  { ...model, id: "missing", slug: "missing-model", performance_v3: null },
];

let cli: typeof import("../../../scripts/sync-models.mjs");
const fetcher = vi.fn();
const page = (data: unknown[], pageNumber = 1, totalPages = 1) => new Response(JSON.stringify({
  intelligence_index_version: 5,
  data,
  pagination: { page: pageNumber, total_pages: totalPages, has_more: pageNumber < totalPages },
}), { status: 200 });

beforeAll(async () => {
  vi.stubEnv("ARTIFICIAL_ANALYSIS_API_KEY", "test-key");
  vi.stubGlobal("fetch", fetcher);
  cli = await import("../../../scripts/sync-models.mjs");
  expect(fetcher).not.toHaveBeenCalled();
  expect(db.$transaction).not.toHaveBeenCalled();
});

beforeEach(() => {
  vi.clearAllMocks();
  fetcher.mockReset();
  db.provider.findUnique.mockResolvedValue({ id: 1 });
  db.model.findMany.mockResolvedValue([]);
  db.model.findUnique.mockImplementation(async ({ where }) => {
    if (where.aaModelId === "existing") return { id: 11, score: { speed: 80.07 } };
    if (where.aaModelId === "missing") return { id: 12, score: { speed: 80.07 } };
    return null;
  });
  db.model.create.mockResolvedValue({ id: 13 });
  db.model.update.mockReset().mockResolvedValue({});
  db.changeLog.findFirst.mockResolvedValue(null);
  db.$transaction.mockImplementation(async (callback) => callback(db));
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AA Performance v3 in both synchronization paths", () => {
  it.each([
    ["v3 mean", { mean_output_tokens_per_second: 62.36 }, 62.36],
    ["zero", { mean_output_tokens_per_second: 0 }, 0],
    ["null block", null, null],
    ["absent block", undefined, null],
    ["absent metric", {}, null],
    ["null metric", { mean_output_tokens_per_second: null }, null],
    ["NaN", { mean_output_tokens_per_second: NaN }, null],
    ["infinity", { mean_output_tokens_per_second: Infinity }, null],
    ["negative infinity", { mean_output_tokens_per_second: -Infinity }, null],
    ["string", { mean_output_tokens_per_second: "62.36" }, null],
    ["boolean", { mean_output_tokens_per_second: false }, null],
  ])("maps %s without falling back to the v2 median", (_label, performance, expected) => {
    const input = { ...model, performance_v3: performance } as AAModel;
    expect(mapAAModel(input).speedTokensPerSecond).toBe(expected);
    expect(cli.mapModel(input).speed).toBe(expected);
  });

  it("maps v3 when the legacy block is absent or fully null", () => {
    for (const performance of [undefined, null, { median_output_tokens_per_second: null }]) {
      const input = { ...model, performance };
      expect(mapAAModel(input).speedTokensPerSecond).toBe(62.36);
      expect(cli.mapModel(input).speed).toBe(62.36);
    }
  });

  it("persists v3 values and clears old medians through the runtime service", async () => {
    const result = await syncModelsFromAA({ load: async () => ({
      models, indexVersion: "5", pagesFetched: 1, fetchedAt: new Date("2026-11-11T00:00:00Z"),
    }) });
    expect(result).toMatchObject({ created: 1, updated: 2, missing: { speed: 1 } });
    expect(db.model.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11 }, data: expect.objectContaining({ score: { update: expect.objectContaining({ speed: 62.36 }) } }),
    }));
    expect(db.model.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12 }, data: expect.objectContaining({ score: { update: expect.objectContaining({ speed: null }) } }),
    }));
    expect(db.model.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: { create: expect.objectContaining({ speed: 0 }) } }),
    }));
    expect(db.model.update.mock.calls[0][0].data).not.toHaveProperty("strengths");
  });

  it("loads all pages from the existing free endpoint and persists v3 through the CLI", async () => {
    fetcher.mockResolvedValueOnce(page(models.slice(0, 1), 1, 2))
      .mockResolvedValueOnce(page(models.slice(1), 2, 2));
    await cli.main();
    expect(fetcher).toHaveBeenNthCalledWith(1, "https://artificialanalysis.ai/api/v2/language/models/free?page=1", { headers: { "x-api-key": "test-key" } });
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://artificialanalysis.ai/api/v2/language/models/free?page=2", { headers: { "x-api-key": "test-key" } });
    expect(db.$transaction.mock.invocationCallOrder[0]).toBeGreaterThan(fetcher.mock.invocationCallOrder[1]);
    expect(db.model.update.mock.calls.map(([args]) => args.data.score.update.speed)).toEqual([62.36, null]);
    expect(db.model.create.mock.calls[0][0].data.score.create.speed).toBe(0);
    expect(db.changeLog.create.mock.calls[0][0].data.summary).toContain("平均端到端输出速度（AA Performance v3）0 tok/s");
  });

  it("does not mutate the database if a later API page fails in the CLI", async () => {
    fetcher.mockResolvedValueOnce(page([model], 1, 2))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(cli.main()).rejects.toThrow("AA page 2 failed with HTTP 503");
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.model.update).not.toHaveBeenCalled();
    expect(db.model.create).not.toHaveBeenCalled();
  });

  it("surfaces a midway persistence failure without claiming the snapshot completed", async () => {
    fetcher.mockResolvedValueOnce(page(models));
    db.model.update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(cli.main()).rejects.toThrow("database unavailable");
    expect(db.model.update).toHaveBeenCalledTimes(2);
    expect(db.model.create).toHaveBeenCalledTimes(1);
    // Earlier rows may already be committed. The rollout gate must remain off.
    expect(db.model.update.mock.calls[0][0].data.score.update.speed).toBe(62.36);
  });

  it("executes the normal CLI entrypoint and exits nonzero without credentials", () => {
    // No inherited credentials or live network requests: missing key fails first.
    const result = spawnSync(process.execPath, ["scripts/sync-models.mjs"], {
      cwd: process.cwd(), env: { NODE_ENV: "test" }, encoding: "utf8", timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("正在完整拉取 Artificial Analysis 内部数据");
    expect(result.stderr).toContain("缺少 ARTIFICIAL_ANALYSIS_API_KEY 环境变量");
  });
});
