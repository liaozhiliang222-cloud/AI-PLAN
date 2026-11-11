import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ModelsPage from "@/app/models/page";
import ModelDetailPage from "@/app/models/[slug]/page";

const db = vi.hoisted(() => ({ model: { findMany: vi.fn(), findFirst: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AA_PERFORMANCE_V3_READY", "true");
});
afterEach(() => vi.unstubAllEnvs());

function row(id: number, speed: number | null) {
  return {
    id, name: `Model ${id}`, slug: `model-${id}`, contextK: null,
    inputPrice: 1.4, outputPrice: 4.4, releaseDate: null,
    aaModelId: `aa-${id}`, aaIndexVersion: "5", aaFetchedAt: new Date("2026-11-11T00:00:00Z"),
    aaSourceUrl: `https://artificialanalysis.ai/models/model-${id}`,
    strengths: "[]", weaknesses: "[]", recommendedScenarios: "[]",
    provider: { id: 1, name: "Example Lab", slug: "example-lab", country: "overseas", logoColor: "#2563EB" },
    score: { speed, overall: 31.7, coding: null, agent: null, cost: 0.94 },
    plans: [], _count: { plans: 0 },
  };
}

describe("AA Performance v3 public presentation", () => {
  it.each([undefined, "false", "TRUE", "1", ""])("hides unverified stored speeds when readiness is %s", async (ready) => {
    vi.stubEnv("AA_PERFORMANCE_V3_READY", ready);
    db.model.findMany.mockResolvedValue([row(1, 80.07)]);
    db.model.findFirst.mockResolvedValue(row(1, 80.07));
    const list = renderToStaticMarkup(await ModelsPage({ searchParams: Promise.resolve({ tab: "speed" }) }));
    const detail = renderToStaticMarkup(await ModelDetailPage({ params: Promise.resolve({ slug: "model-1" }) }));
    for (const html of [list, detail]) {
      expect(html).toContain("输出速度口径更新中");
      expect(html).not.toContain("80.1 tok/s");
      expect(html).not.toContain("平均端到端输出速度");
    }
    expect(list).not.toContain("<tbody");
    expect(detail).toContain("待核验");
    expect(detail).toContain("31.7");
  });

  it("keeps other rankings available while speed migration is pending", async () => {
    vi.stubEnv("AA_PERFORMANCE_V3_READY", undefined);
    db.model.findMany.mockResolvedValue([row(1, 80.07)]);
    const html = renderToStaticMarkup(await ModelsPage({ searchParams: Promise.resolve({ tab: "intelligence" }) }));
    expect(html).toContain("<tbody");
    expect(html).toContain("31.7");
    expect(html).not.toContain("输出速度口径更新中");
  });

  it("renders v3 wording, descending speed order, zero and unranked null values", async () => {
    db.model.findMany.mockResolvedValue([row(1, 0), row(2, null), row(3, 62.36)]);
    const html = renderToStaticMarkup(await ModelsPage({ searchParams: Promise.resolve({ tab: "speed" }) }));
    expect(html).toContain("平均端到端输出速度");
    expect(html).toContain("AA Performance v3");
    expect(html).toContain("含首 token 等待时间");
    expect(html).not.toContain("AA 实测中位输出速度");
    expect(html).toContain("62.4 tok/s");
    expect(html).toContain("0 tok/s");
    expect(html.indexOf('href="/models/model-3"')).toBeLessThan(html.indexOf('href="/models/model-1"'));
    const table = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
    expect(table).toBeDefined();
    expect(table).not.toContain('href="/models/model-2"');
    expect(html).toContain("未评测 / 暂无");
    expect(html).toContain('href="/models/model-2"');
  });

  it("renders the empty speed state without inventing a value", async () => {
    db.model.findMany.mockResolvedValue([row(2, null)]);
    const html = renderToStaticMarkup(await ModelsPage({ searchParams: Promise.resolve({ tab: "speed" }) }));
    expect(html).toContain("暂无该指标的 AA 原始数据");
    expect(html).not.toContain("tok/s");
  });

  it.each([[62.36, "62.4 tok/s"], [0, "0 tok/s"], [null, "–"]])(
    "renders detail speed %s with the same v3 definition",
    async (speed, expected) => {
      db.model.findFirst.mockResolvedValue(row(1, speed as number | null));
      const html = renderToStaticMarkup(await ModelDetailPage({ params: Promise.resolve({ slug: "model-1" }) }));
      expect(html).toContain("平均端到端输出速度");
      expect(html).toContain("AA Performance v3，含首 token 等待时间");
      expect(html).toContain(expected);
      if (speed === null) expect(html).not.toContain("tok/s");
    },
  );
});
