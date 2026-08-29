import { afterEach, describe, expect, it, vi } from "vitest";
import { isRetryableDbMethod, isTransientDbError, queryPublicData } from "@/lib/db-safe";

describe("isTransientDbError", () => {
  it.each(["P1001", "P1008", "P1017", "ECONNRESET", "ETIMEDOUT"])("recognizes code %s", (code) => {
    expect(isTransientDbError({ code, message: "wrapper" })).toBe(true);
  });

  it("walks the cause chain and recognizes pg messages", () => {
    expect(isTransientDbError(new Error("outer", { cause: { message: "Server has closed the connection" } }))).toBe(true);
    expect(isTransientDbError({ cause: { cause: new Error("Operation has timed out") } })).toBe(true);
    expect(isTransientDbError(new Error("Cannot perform I/O on behalf of a different request"))).toBe(true);
    expect(isTransientDbError(new Error("(EMAXCONNSESSION) max clients reached in session mode"))).toBe(true);
  });

  it("does not classify programming or query errors as transient", () => {
    expect(isTransientDbError({ code: "P2002", message: "Unique constraint failed" })).toBe(false);
    expect(isTransientDbError(new TypeError("Cannot read properties of undefined"))).toBe(false);
  });

  it.each(["08P01", "08004"])("does not degrade non-retryable PostgreSQL code %s", (code) => {
    expect(isTransientDbError({ code, message: "PostgreSQL connection rejected" })).toBe(false);
  });
});

describe("isRetryableDbMethod", () => {
  it.each([
    "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
    "count", "aggregate", "groupBy",
  ])("allows replaying read method %s", (method) => {
    expect(isRetryableDbMethod(method)).toBe(true);
  });

  it.each([
    "create", "update", "delete", "upsert", "createMany", "updateMany", "deleteMany",
  ])("never replays mutation method %s", (method) => {
    expect(isRetryableDbMethod(method)).toBe(false);
  });
});

describe("queryPublicData", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns fallback and emits structured logging for transient failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await queryPublicData("test.list", async () => {
      throw Object.assign(new Error("Operation has timed out"), { code: "P1008" });
    }, [] as string[]);
    expect(result).toEqual({ available: false, data: [] });
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      event: "public_database_degraded", operation: "test.list", code: "P1008",
    });
  });

  it("rethrows non-transient errors", async () => {
    await expect(queryPublicData("test.bug", async () => {
      throw new TypeError("bug");
    }, null)).rejects.toThrow(TypeError);
  });
});
