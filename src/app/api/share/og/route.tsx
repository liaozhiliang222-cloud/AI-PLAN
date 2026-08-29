import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { toPublicPlanT } from "@/lib/serialize";
import { recommend, type QuizAnswers } from "@/lib/recommendation";
import { OG_SIZE, latinize } from "@/lib/og";

const VALID_BUDGETS = ["free", "100", "200", "500", "500p"] as const;
const VALID_SCENARIOS = ["all", "frontend", "fullstack", "backend", "agent", "debug", "bigrepo", "light"] as const;

/** 条件筛选分享卡：/api/share/og?budget=200&region=domestic&tool=Cursor&scenario=fullstack&intensity=medium */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const v = url.searchParams.get(key) ?? "";
    return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  };
  const answers: QuizAnswers = {
    scenario: pick("scenario", VALID_SCENARIOS, "all"),
    intensity: pick("intensity", ["light", "medium", "heavy"] as const, "medium"),
    budget: pick("budget", VALID_BUDGETS, "200"),
    region: pick("region", ["all", "domestic", "overseas"] as const, "all"),
    tool: url.searchParams.get("tool") ?? "无所谓",
  };

  const rows = await db.plan.findMany({ where: { status: "published" }, include: { provider: true } });
  let main = "Your Plan";
  let assist = "";
  let price = "-";
  try {
    const r = recommend(rows.map(toPublicPlanT), answers);
    if (r) {
      main = latinize(`${r.top.plan.provider.name} ${r.top.plan.name}`);
      assist = latinize(`${r.second.plan.provider.name} ${r.second.plan.name}`);
      price = r.top.plan.priceCny === 0 ? "FREE" : `¥${r.top.plan.priceCny}/MO`;
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#2563EB",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>AI PLAN RADAR · FILTERED CANDIDATES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.15 }}>{main}</div>
          <div style={{ display: "flex", gap: 40, fontSize: 40 }}>
            <span style={{ display: "flex" }}>{price}</span>
          </div>
          {assist && (
            <div style={{ display: "flex", fontSize: 32, opacity: 0.85 }}>Another candidate · {assist}</div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>AI Plan Radar</div>
      </div>
    ),
    OG_SIZE,
  );
}
