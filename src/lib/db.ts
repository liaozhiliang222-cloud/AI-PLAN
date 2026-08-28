import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// 连接参数解析：从 DATABASE_URL 提取 host/user/password/db，
// 固定 TCP host 到指定 IP（避免 Supabase pooler 多 IP DNS 在 Workers 网络下轮询到不可达 IP）
// ssl.servername 保持原 hostname 以便 SNI/pgBouncer 路由
function parsePgConfig(connectionString: string): Record<string, unknown> {
  const u = new URL(connectionString);
  return {
    host: process.env.PG_FIX_IP || u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: {
      servername: u.hostname,
      rejectUnauthorized: false,
    },
  };
}

/** 创建 Prisma 客户端：Cloudflare Workers 环境使用 pg driver adapter（纯 JS，无原生引擎）。
    - 限制连接池大小
    - 连接错误自动重试（Workers→Supabase 网络偶发抖动） */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("缺少 DATABASE_URL 环境变量");
  }
  const adapter = new PrismaPg({
    ...parsePgConfig(connectionString),
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
  });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return retryProxy(client);
}

/** 包装 Prisma 模型方法：连接错误时自动重试 */
function retryProxy(client: PrismaClient): PrismaClient {
  return new Proxy(client, {
    get(target, prop) {
      if (typeof prop === "string" && isModelName(prop)) {
        const model: Record<string, unknown> = target[prop as keyof PrismaClient] as never;
        return new Proxy(model, {
          get(t, m) {
            const fn = t[m as string];
            if (typeof fn !== "function") return fn;
            return async (...args: unknown[]) => {
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  return await (fn as (...a: unknown[]) => Promise<unknown>).apply(t, args);
                } catch (e) {
                  if (attempt < 2 && isConnectionError(e)) {
                    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
                    continue;
                  }
                  throw e;
                }
              }
            };
          },
        });
      }
      const v = target[prop as keyof PrismaClient];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("timeout exceeded when trying to connect") ||
    msg.includes("Connection closed") ||
    msg.includes("P1001") ||
    msg.includes("P1008") ||
    msg.includes("ECONN") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("Socket timeout")
  );
}

const MODEL_NAMES = new Set([
  "provider", "plan", "planModel", "model", "planScore", "modelScore",
  "changeLog", "pricePoint", "sourceMonitor", "reviewItem",
]);
function isModelName(s: string): boolean {
  return MODEL_NAMES.has(s);
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
