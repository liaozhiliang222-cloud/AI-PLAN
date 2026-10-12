import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { findExistingAAModel, prepareAAModelSlugs } from "../../../scripts/lib/aa-model-identity.mjs";

type Record = {
  id: number;
  slug: string;
  aaModelId: string | null;
  score: { overall: number } | null;
};

function database(initial: Record[]) {
  let rows = structuredClone(initial);
  const model = {
    findMany: vi.fn(async () => rows.map(({ id, slug, aaModelId }) => ({ id, slug, aaModelId }))),
    findUnique: vi.fn(async ({ where }: { where: { aaModelId?: string; slug?: string } }) =>
      rows.find((row) => where.aaModelId !== undefined
        ? row.aaModelId === where.aaModelId : row.slug === where.slug) ?? null),
    update: vi.fn(async ({ where, data }: { where: { id: number }; data: { slug: string } }) => {
      if (rows.some((row) => row.id !== where.id && row.slug === data.slug)) throw Error("slug unique constraint");
      const row = rows.find((row) => row.id === where.id)!;
      row.slug = data.slug;
      return row;
    }),
  };
  const transaction = vi.fn(async (callback: (tx: { model: typeof model }) => Promise<unknown>) => {
    const before = structuredClone(rows);
    try { return await callback({ model }); }
    catch (error) { rows = before; throw error; }
  });
  return { client: { model, $transaction: transaction } as unknown as PrismaClient, model, transaction, rows: () => rows };
}

const reasoning: Record = { id: 748, aaModelId: "reasoning-id", slug: "jt236b", score: { overall: 40 } };
const nonReasoning: Record = { id: 459, aaModelId: "non-reasoning-id", slug: "jt-flash", score: { overall: 30 } };

describe("AA model identity", () => {
  it("prefers the stable AA ID when a different row matches the slug", async () => {
    const db = database([nonReasoning, reasoning]);
    const existing = await findExistingAAModel(db.client, { aaModelId: "reasoning-id", slug: "jt-flash" });
    expect(existing?.id).toBe(748);
    expect(db.model.findUnique).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("handles the reported slug reassignment in either API order (reverse=%s)", async (reverse) => {
    const db = database([nonReasoning, reasoning]);
    const models = [
      { id: "reasoning-id", slug: "jt-flash" },
      { id: "non-reasoning-id", slug: "jt-flash-non-reasoning" },
    ];
    await expect(prepareAAModelSlugs(db.client, reverse ? models.toReversed() : models))
      .resolves.toEqual({ renamed: 2, displaced: 1 });
    expect(db.rows()).toEqual([
      { ...nonReasoning, slug: "jt-flash-non-reasoning" },
      { ...reasoning, slug: "jt-flash" },
    ]);
    expect((await findExistingAAModel(db.client, { aaModelId: "reasoning-id", slug: "jt-flash" }))?.id).toBe(748);
    expect((await findExistingAAModel(db.client, { aaModelId: "non-reasoning-id", slug: "jt-flash-non-reasoning" }))?.id).toBe(459);
  });

  it("supports cycles of renamed slugs without losing model IDs or scores", async () => {
    const third: Record = { id: 900, aaModelId: "third-id", slug: "third-slug", score: null };
    const db = database([reasoning, nonReasoning, third]);
    await prepareAAModelSlugs(db.client, [
      { id: "reasoning-id", slug: nonReasoning.slug },
      { id: "non-reasoning-id", slug: third.slug },
      { id: "third-id", slug: reasoning.slug },
    ]);
    expect(db.rows()).toEqual([
      { ...reasoning, slug: nonReasoning.slug },
      { ...nonReasoning, slug: third.slug },
      { ...third, slug: reasoning.slug },
    ]);
  });

  it("preserves an absent model as history when a new ID reuses its slug", async () => {
    const db = database([nonReasoning]);
    await prepareAAModelSlugs(db.client, [{ id: "new-id", slug: nonReasoning.slug }]);
    expect(db.rows()[0]).toMatchObject({ ...nonReasoning, slug: expect.stringMatching(/^aa-history-459-/) });
    expect(await findExistingAAModel(db.client, { aaModelId: "new-id", slug: nonReasoning.slug })).toBeNull();
  });

  it("adopts a legacy slug only when it has no AA ID", async () => {
    const legacy = { ...nonReasoning, aaModelId: null };
    const db = database([legacy]);
    await prepareAAModelSlugs(db.client, [{ id: "new-id", slug: legacy.slug }]);
    expect(db.model.update).not.toHaveBeenCalled();
    expect((await findExistingAAModel(db.client, { aaModelId: "new-id", slug: legacy.slug }))?.id).toBe(459);
  });

  it("preserves a legacy record when the stable ID already has its own row", async () => {
    const legacy = { ...nonReasoning, aaModelId: null };
    const db = database([legacy, reasoning]);
    await prepareAAModelSlugs(db.client, [{ id: reasoning.aaModelId!, slug: legacy.slug }]);
    expect(db.rows()[0]).toMatchObject({ ...legacy, slug: expect.stringMatching(/^aa-history-459-/) });
    expect(db.rows()[1]).toEqual({ ...reasoning, slug: legacy.slug });
  });

  it("does not overwrite an unrelated AA ID if the preflight was bypassed", async () => {
    const db = database([nonReasoning]);
    await expect(findExistingAAModel(db.client, { aaModelId: "new-id", slug: nonReasoning.slug }))
      .rejects.toThrow("another stable model ID");
    expect(db.model.update).not.toHaveBeenCalled();
  });

  it("rolls back all slug changes if the rename transaction fails", async () => {
    const db = database([nonReasoning, reasoning]);
    const update = db.model.update.getMockImplementation()!;
    db.model.update.mockImplementationOnce(update).mockRejectedValueOnce(Error("write failed"));
    await expect(prepareAAModelSlugs(db.client, [{ id: reasoning.aaModelId!, slug: nonReasoning.slug }]))
      .rejects.toThrow("write failed");
    expect(db.rows()).toEqual([nonReasoning, reasoning]);
  });

  it("is idempotent after the canonical slugs are assigned", async () => {
    const db = database([reasoning]);
    const models = [{ id: reasoning.aaModelId!, slug: "renamed-slug" }];
    await prepareAAModelSlugs(db.client, models);
    db.model.update.mockClear();
    await expect(prepareAAModelSlugs(db.client, models)).resolves.toEqual({ renamed: 0, displaced: 0 });
    expect(db.model.update).not.toHaveBeenCalled();
  });
});
