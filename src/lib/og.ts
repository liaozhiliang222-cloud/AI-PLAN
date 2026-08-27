/* OG 分享图通用绘制（Satori 仅内置拉丁字形，CJK 一律过滤避免豆腐块） */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export function latinize(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, "").trim() || "Plan";
}

export function ogStyle() {
  return {
    display: "flex",
    width: "100%",
    height: "100%",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    padding: "72px",
    backgroundColor: "#2563EB",
    color: "#ffffff",
    fontFamily: "sans-serif",
  };
}
