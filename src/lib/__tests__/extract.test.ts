import { describe, it, expect } from "vitest";
import { extractDraft, readDraft } from "../../services/extract";

const planNames = [
  { slug: "glm-pro", name: "GLM Pro" },
  { slug: "kimi-allegretto", name: "Kimi Allegretto" },
];

describe("extractDraft 规则解析器", () => {
  it("识别『从X下调至Y』句式", () => {
    const draft = extractDraft("个人版从 199 元下调至 179 元/月。", planNames);
    expect(draft).not.toBeNull();
    expect(draft!.changeType).toBe("price");
    expect(draft!.oldValue).toBe(199);
    expect(draft!.newValue).toBe(179);
  });

  it("识别箭头句式", () => {
    const draft = extractDraft("价格 ¥79 → ¥59", planNames);
    expect(draft).not.toBeNull();
    expect(draft!.oldValue).toBe(79);
    expect(draft!.newValue).toBe(59);
  });

  it("回退到两个不同货币数字", () => {
    const draft = extractDraft("月费 ¥149，现价 ¥129", planNames);
    expect(draft).not.toBeNull();
    expect(draft!.oldValue).toBe(149);
    expect(draft!.newValue).toBe(129);
  });

  it("空内容返回 null", () => {
    expect(extractDraft("", planNames)).toBeNull();
    expect(extractDraft("   ", planNames)).toBeNull();
  });

  it("无有效价格返回 null", () => {
    expect(extractDraft("只是一段没有数字的文字", planNames)).toBeNull();
  });
});

describe("readDraft", () => {
  it("读取 payload 中的 draft", () => {
    const draft = readDraft(JSON.stringify({ draft: { changeType: "price", oldValue: 1, newValue: 2 } }));
    expect(draft).not.toBeNull();
    expect(draft!.changeType).toBe("price");
  });
  it("无 draft 返回 null", () => {
    expect(readDraft("{}")).toBeNull();
    expect(readDraft("bad json")).toBeNull();
  });
});
