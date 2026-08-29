import { describe, expect, it } from "vitest";
import { MODELS_PAGE_SIZE, paginateModels } from "@/lib/model-list";

describe("paginateModels", () => {
  const models = Array.from({ length: 611 }, (_, index) => index + 1);

  it("caps every rendered page to the Worker-safe page size", () => {
    const result = paginateModels(models, "1");
    expect(result.items).toHaveLength(MODELS_PAGE_SIZE);
    expect(result.items).toEqual(models.slice(0, MODELS_PAGE_SIZE));
    expect(result.totalPages).toBe(13);
  });

  it("preserves the global offset for later pages", () => {
    const result = paginateModels(models, "13");
    expect(result.start).toBe(600);
    expect(result.items).toEqual(models.slice(600));
  });

  it.each([undefined, "0", "-2", "invalid"])("normalizes invalid page %s", (page) => {
    expect(paginateModels(models, page).page).toBe(1);
  });

  it("clamps pages beyond the end", () => {
    expect(paginateModels(models, "99").page).toBe(13);
  });
});
