/**
 * AA slugs can change or move between stable model IDs. Free occupied slugs
 * before applying renames, including swaps, without deleting historical rows.
 * @param {import("@prisma/client").PrismaClient} db
 * @param {Array<{ id: string, slug: string }>} models Validated complete snapshot.
 */
export async function prepareAAModelSlugs(db, models) {
  return db.$transaction(async (tx) => {
    const records = await tx.model.findMany({
      select: { id: true, slug: true, aaModelId: true },
    });
    const byId = new Map(records.filter((record) => record.aaModelId !== null)
      .map((record) => [record.aaModelId, record]));
    const bySlug = new Map(records.map((record) => [record.slug, record]));
    const occupied = new Set(bySlug.keys());
    const requested = new Set(models.map((model) => model.slug));
    const displaced = new Map();
    const renamed = [];

    for (const model of models) {
      const existing = byId.get(model.id);
      const owner = bySlug.get(model.slug);
      if (owner && owner.id !== existing?.id && (existing || owner.aaModelId !== null)) {
        displaced.set(owner.id, owner);
      }
      if (existing && existing.slug !== model.slug) renamed.push({ id: existing.id, slug: model.slug });
    }

    // Release all conflicting slugs first so a swap is independent of API order.
    for (const record of displaced.values()) {
      let historySlug;
      do {
        historySlug = `aa-history-${record.id}-${crypto.randomUUID()}`;
      } while (occupied.has(historySlug) || requested.has(historySlug));
      occupied.add(historySlug);
      await tx.model.update({ where: { id: record.id }, data: { slug: historySlug } });
    }
    for (const record of renamed) {
      await tx.model.update({ where: { id: record.id }, data: { slug: record.slug } });
    }
    return { renamed: renamed.length, displaced: displaced.size };
  }, { maxWait: 10_000, timeout: 30_000 });
}

/**
 * A slug match is only a fallback for a legacy record without an AA identity.
 * @param {import("@prisma/client").PrismaClient} db
 * @param {{ aaModelId: string, slug: string }} model
 */
export async function findExistingAAModel(db, model) {
  const existing = await db.model.findUnique({
    where: { aaModelId: model.aaModelId }, include: { score: true },
  });
  if (existing) return existing;
  const legacy = await db.model.findUnique({
    where: { slug: model.slug }, include: { score: true },
  });
  if (legacy?.aaModelId != null) {
    throw new Error(`AA slug ${model.slug} is still owned by another stable model ID`);
  }
  return legacy;
}
