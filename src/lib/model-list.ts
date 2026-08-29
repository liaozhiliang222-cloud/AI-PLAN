export const MODELS_PAGE_SIZE = 50;

export function paginateModels<T>(items: readonly T[], rawPage: string | undefined) {
  const requestedPage = Number.parseInt(rawPage ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(items.length / MODELS_PAGE_SIZE));
  const page = Math.min(Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
  const start = (page - 1) * MODELS_PAGE_SIZE;

  return {
    items: items.slice(start, start + MODELS_PAGE_SIZE),
    page,
    start,
    totalPages,
  };
}
