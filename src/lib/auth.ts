/* Admin 访问控制共享逻辑（纯函数，兼容 Edge/Node 运行时） */

export const ADMIN_COOKIE = "apr_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "demo1234";
}

/** 常量时间字符串比较，避免时序侧信道（用于口令/令牌比对） */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const al = a.length;
  const bl = b.length;
  let diff = al ^ bl;
  const len = Math.max(al, bl);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i % al) ?? 0) ^ (b.charCodeAt(i % bl) ?? 0);
  }
  return diff === 0;
}

/**
 * 计算 SHA-256 十六进制摘要（Web Crypto）。
 * Edge 运行时与 Node 18+ 均提供 globalThis.crypto.subtle，故无需 Node 专属回退。
 */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto subtle 不可用：请使用 HTTPS 或 Node 18+ 环境");
  }
  // 复制为标准 ArrayBuffer，避免 Uint8Array<ArrayBufferLike> 类型不匹配
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const digest = await subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 由口令派生会话令牌（SHA-256 hex） */
export async function adminToken(pw?: string): Promise<string> {
  const data = new TextEncoder().encode(`apr-admin:${pw ?? adminPassword()}`);
  return sha256Hex(data);
}
