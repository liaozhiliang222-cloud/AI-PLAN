import { describe, expect, it } from "vitest";
import { hasCompleteSource, isValidMonitoredChangeValue, normalizeHttpUrl, normalizePlanSourceUrl, sourceMatchesProvider } from "../source-provenance";

describe("source provenance", () => {
  it("只接受 http(s) URL 并规范化", () => {
    expect(normalizeHttpUrl(" https://example.com/plan ")).toBe("https://example.com/plan");
    expect(normalizeHttpUrl("http://example.com")).toBe("http://example.com/");
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("not-a-url")).toBeNull();
  });

  it("拒绝根首页和与 Provider.website 相同的地址", () => {
    expect(normalizePlanSourceUrl("https://example.com")).toBeNull();
    expect(normalizePlanSourceUrl("https://example.com/about", "https://example.com/about")).toBeNull();
    expect(normalizePlanSourceUrl("https://example.com/about/", "https://example.com/about")).toBeNull();
    expect(normalizePlanSourceUrl("https://example.com/pricing", "https://example.com")).toBe("https://example.com/pricing");
    expect(normalizePlanSourceUrl("https://example.com/docs/plan", "https://example.com")).toBe("https://example.com/docs/plan");
    expect(normalizePlanSourceUrl("https://example.com/?plan=pro", "https://example.com")).toBe("https://example.com/?plan=pro");
  });

  it("来源三件套缺一不得验证", () => {
    const checked = new Date("2026-08-28T00:00:00Z");
    expect(hasCompleteSource("https://example.com/plan", "Pricing", checked)).toBe(true);
    expect(hasCompleteSource(null, "Pricing", checked)).toBe(false);
    expect(hasCompleteSource("https://example.com/plan", null, checked)).toBe(false);
    expect(hasCompleteSource("https://example.com/plan", "Pricing", null)).toBe(false);
  });

  it("监控源必须显式绑定同一 provider slug", () => {
    expect(sourceMatchesProvider("openai", "openai")).toBe(true);
    expect(sourceMatchesProvider("OpenAI", "openai")).toBe(false);
    expect(sourceMatchesProvider(null, "openai")).toBe(false);
    expect(sourceMatchesProvider("", "openai")).toBe(false);
    expect(sourceMatchesProvider("anthropic", "openai")).toBe(false);
  });

  it("价格变化只接受有限正数", () => {
    expect(isValidMonitoredChangeValue("price", 10)).toBe(true);
    expect(isValidMonitoredChangeValue("price", 0)).toBe(false);
    expect(isValidMonitoredChangeValue("price", -1)).toBe(false);
    expect(isValidMonitoredChangeValue("price", null)).toBe(false);
    expect(isValidMonitoredChangeValue("price", Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidMonitoredChangeValue("quota", null)).toBe(true);
  });
});
