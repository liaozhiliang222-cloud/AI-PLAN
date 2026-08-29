import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isRetryableDbMethod, isTransientDbError } from "@/lib/db-safe";

const MODEL_NAMES = new Set([
  "provider", "plan", "planModel", "model", "planScore", "modelScore",
  "changeLog", "pricePoint", "sourceMonitor", "reviewItem",
]);

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("缺少 DATABASE_URL 环境变量");
  const adapter = new PrismaPg({
    connectionString,
    // One operation owns this client, so no request-bound socket survives in
    // the Workers isolate after the operation completes.
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

async function disconnectClient(client: PrismaClient): Promise<void> {
  try {
    await client.$disconnect();
  } catch (disconnectError) {
    console.error(JSON.stringify({
      event: "database_pool_disconnect_failed",
      severity: "error",
      message: disconnectError instanceof Error ? disconnectError.message : String(disconnectError),
    }));
  }
}

function retryProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (typeof prop === "string" && MODEL_NAMES.has(prop)) {
        return new Proxy({}, {
          get(_modelTarget, method) {
            if (typeof method !== "string") return undefined;
            return async (...args: unknown[]) => {
              const retryable = isRetryableDbMethod(method);
              const maxAttempts = retryable ? 2 : 1;
              for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                const client = createClient();
                const model = client[prop as keyof PrismaClient] as unknown as Record<string, unknown>;
                const fn = model[method];
                if (typeof fn !== "function") return fn;
                try {
                  return await (fn as (...params: unknown[]) => Promise<unknown>).apply(model, args);
                } catch (error) {
                  // Mutations may already have committed before the connection failed.
                  // Never replay them automatically. Reads get one fresh-connection retry.
                  if (!isTransientDbError(error) || !retryable || attempt === maxAttempts) throw error;
                } finally {
                  await disconnectClient(client);
                }
                await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
              }
              throw new Error("数据库操作未完成");
            };
          },
        });
      }
      if (prop === "$transaction") {
        return async (...args: unknown[]) => {
          const client = createClient();
          const transaction = client.$transaction as unknown as (...params: unknown[]) => Promise<unknown>;
          try {
            // A transaction is a write boundary: run it once on one client and never replay it.
            return await transaction.apply(client, args);
          } finally {
            await disconnectClient(client);
          }
        };
      }
      if (prop === "$connect" || prop === "$disconnect") return async () => undefined;
      return undefined;
    },
  });
}

// The proxy is safe to cache because it keeps no client, pool, or socket.
export const db = retryProxy();
