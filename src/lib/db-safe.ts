const TRANSIENT_CODES = new Set([
  "P1001", "P1008", "P1017",
  "ECONNREFUSED", "ECONNRESET", "ECONNABORTED", "EPIPE", "ETIMEDOUT",
  "57P01", "57P02", "57P03", "08000", "08001", "08003", "08006", "08007",
]);

const RETRYABLE_DB_METHODS = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "count", "aggregate", "groupBy",
]);

const TRANSIENT_MESSAGES = [
  /can't reach database server/i,
  /timeout exceeded when trying to connect/i,
  /operation has timed out/i,
  /server has closed the connection/i,
  /connection (?:is )?closed/i,
  /connection terminated unexpectedly/i,
  /socket (?:hang up|timeout)/i,
  /connect econn/i,
  /read econnreset/i,
  /write epipe/i,
  /cannot perform i\/o on behalf of a different request/i,
  /emaxconnsession|max clients reached/i,
];

type ErrorLike = { code?: unknown; message?: unknown; cause?: unknown };

/** Only side-effect-free delegate methods may be replayed after reconnecting. */
export function isRetryableDbMethod(method: string): boolean {
  return RETRYABLE_DB_METHODS.has(method);
}

export function isTransientDbError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; current != null && depth < 8 && !seen.has(current); depth += 1) {
    seen.add(current);
    if (typeof current === "object") {
      const value = current as ErrorLike;
      if (typeof value.code === "string" && TRANSIENT_CODES.has(value.code.toUpperCase())) return true;
      if (typeof value.message === "string" && TRANSIENT_MESSAGES.some((pattern) => pattern.test(value.message as string))) return true;
      current = value.cause;
    } else {
      if (TRANSIENT_MESSAGES.some((pattern) => pattern.test(String(current)))) return true;
      break;
    }
  }
  return false;
}

export type PublicQueryResult<T> = { available: true; data: T } | { available: false; data: T };

/** Only transient database failures degrade; programming/query errors still surface. */
export async function queryPublicData<T>(operation: string, query: () => Promise<T>, fallback: T): Promise<PublicQueryResult<T>> {
  try {
    return { available: true, data: await query() };
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    const errorLike = error as ErrorLike;
    console.error(JSON.stringify({
      event: "public_database_degraded",
      severity: "error",
      operation,
      code: typeof errorLike.code === "string" ? errorLike.code : undefined,
      message: error instanceof Error ? error.message : String(error),
    }));
    return { available: false, data: fallback };
  }
}
