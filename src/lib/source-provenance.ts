export function normalizeHttpUrl(raw: string): string | null {
  if (!raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function hasCompleteSource(sourceUrl: string | null, sourceTitle: string | null, checkedAt: Date | null): boolean {
  return Boolean(sourceUrl && sourceTitle?.trim() && checkedAt && !Number.isNaN(checkedAt.getTime()));
}

/** 套餐级来源必须比厂商根首页更具体。 */
export function normalizePlanSourceUrl(raw: string, providerWebsite?: string | null): string | null {
  const candidate = normalizeHttpUrl(raw);
  if (!candidate) return null;
  const url = new URL(candidate);
  if (url.pathname === "/" && !url.search && !url.hash) return null;
  const provider = providerWebsite ? normalizeHttpUrl(providerWebsite) : null;
  if (provider && sourceComparisonKey(candidate) === sourceComparisonKey(provider)) return null;
  return candidate;
}

function sourceComparisonKey(raw: string): string {
  const url = new URL(raw);
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}${url.search}${url.hash}`;
}

export function sourceMatchesProvider(sourceProviderSlug: string | null | undefined, planProviderSlug: string | null | undefined): boolean {
  return Boolean(sourceProviderSlug && planProviderSlug && sourceProviderSlug === planProviderSlug);
}

export function isValidMonitoredChangeValue(changeType: string, newValue: number | null): boolean {
  return changeType !== "price" || (newValue != null && Number.isFinite(newValue) && newValue > 0);
}
