import { describe, it, expect } from "vitest";
import { fmtPrice, stars, ctxLabel, intensityStars, intensityVerdict, trendDelta } from "../format";

describe("fmtPrice", () => {
  it("空值返回 —", () => {
    expect(fmtPrice(null)).toBe("—");
    expect(fmtPrice(undefined)).toBe("—");
  });
  it("0 返回 免费", () => {
    expect(fmtPrice(0)).toBe("免费");
  });
  it("整数价格", () => {
    expect(fmtPrice(199)).toBe("¥199");
  });
  it("小数价格取整", () => {
    expect(fmtPrice(149.5)).toBe("¥150");
  });
});

describe("stars", () => {
  it("满星与空星", () => {
    expect(stars(5)).toBe("★★★★★");
    expect(stars(0)).toBe("☆☆☆☆☆");
    expect(stars(3)).toBe("★★★☆☆");
  });
  it("越界收敛", () => {
    expect(stars(99)).toBe("★★★★★");
    expect(stars(-3)).toBe("☆☆☆☆☆");
  });
});

describe("ctxLabel", () => {
  it("空值返回 —", () => {
    expect(ctxLabel(null)).toBe("—");
    expect(ctxLabel(0)).toBe("—");
  });
  it("K 与 M 表示", () => {
    expect(ctxLabel(256)).toBe("256K");
    expect(ctxLabel(1000)).toBe("1M");
    expect(ctxLabel(1500)).toBe("1.5M");
  });
});

describe("intensityStars / intensityVerdict", () => {
  it("容量充足", () => {
    expect(intensityStars(100, 50)).toBe("★★★★★");
    expect(intensityVerdict(100, 50)).toEqual({ text: "够用", tone: "ok" });
  });
  it("容量偏紧", () => {
    expect(intensityVerdict(55, 50).tone).toBe("warn");
  });
  it("容量不足", () => {
    expect(intensityVerdict(30, 50).tone).toBe("bad");
  });
});

describe("trendDelta", () => {
  it("空值返回 –", () => {
    expect(trendDelta(null)).toBe("–");
    expect(trendDelta(0)).toBe("–");
  });
  it("正负箭头", () => {
    expect(trendDelta(3)).toBe("↑3");
    expect(trendDelta(-2)).toBe("↓2");
  });
});
