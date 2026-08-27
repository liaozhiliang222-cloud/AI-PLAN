/* 内存级登录速率限制（单实例 MVP 用；多实例部署需换 Redis/DB） */

const MAX_ATTEMPTS = 5; // 每窗口最多失败次数
const WINDOW_MS = 10 * 60 * 1000; // 10 分钟窗口

// 简单 key -> 失败记录（进程内 Map；服务重启即清零，足够 MVP 防爆破）
const failures = new Map<string, { count: number; resetAt: number }>();

/** 登录前调用：检查该 key 是否被锁定 */
export function isRateLimited(key: string): boolean {
  const rec = failures.get(key);
  if (!rec) return false;
  if (Date.now() >= rec.resetAt) {
    failures.delete(key);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

/** 登录失败后调用：记录一次失败 */
export function recordFailure(key: string): void {
  const now = Date.now();
  const rec = failures.get(key);
  if (!rec || now >= rec.resetAt) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  rec.count += 1;
}

/** 登录成功后调用：清除记录 */
export function clearFailures(key: string): void {
  failures.delete(key);
}
