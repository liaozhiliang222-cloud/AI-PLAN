/* 展示格式化工具（均为确定性函数，可在服务端与客户端安全共用） */

export function fmtPrice(cny: number | null | undefined): string {
  if (cny == null) return "—";
  if (cny === 0) return "免费";
  return cny % 1 === 0 ? `¥${cny}` : `¥${cny.toFixed(0)}`;
}

export function fmtTime(dt: Date | string | number): string {
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 相对时间（用于行情卡片；在服务端渲染成固定字符串避免 hydration 漂移） */
export function timeAgo(dt: Date | string, nowMs?: number): string {
  const t = new Date(dt).getTime();
  const now = nowMs ?? Date.now();
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}

export function stars(n: number): string {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

export function ctxLabel(k: number | null | undefined): string {
  if (!k) return "—";
  return k >= 1000 ? `${(k / 1000).toFixed(k % 1000 === 0 ? 0 : 1)}M` : `${k}K`;
}

/** 使用强度星级：基于 capacityIndex 与需求阈值 */
export function intensityStars(capacityIndex: number, demand: number): string {
  const ratio = capacityIndex / demand;
  if (ratio >= 1.6) return "★★★★★";
  if (ratio >= 1.2) return "★★★★☆";
  if (ratio >= 1.0) return "★★★☆☆";
  if (ratio >= 0.7) return "★★☆☆☆";
  return "★☆☆☆☆";
}

export function intensityVerdict(capacityIndex: number, demand: number): { text: string; tone: "ok" | "warn" | "bad" } {
  const ratio = capacityIndex / demand;
  if (ratio >= 1.2) return { text: "够用", tone: "ok" };
  if (ratio >= 1.0) return { text: "偏紧", tone: "warn" };
  return { text: "不够用", tone: "bad" };
}

export function trendDelta(n: number | null | undefined): string {
  if (!n) return "–";
  return n > 0 ? `↑${n}` : `↓${Math.abs(n)}`;
}
