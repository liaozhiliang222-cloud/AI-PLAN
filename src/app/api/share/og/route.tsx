import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { toPlanT } from "@/lib/serialize";
import { recommend, type QuizAnswers } from "@/lib/recommendation";
import { OG_SIZE, latinize } from "@/lib/og";

const VALID_BUDGETS = ["free", "50", "100", "200", "500", "500p"];

/** 推荐结果分享卡：/api/share/og?budget=200&scenes=...&usage=...&prefs=... */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const budget = (VALID_BUDGETS.includes(url.searchParams.get("budget") ?? "") ? url.searchParams.get("budget") : "200") as QuizAnswers["budget"];
  const usage = (["light", "medium", "heavy"].includes(url.searchParams.get("usage") ?? "") ? url.searchParams.get("usage") : "medium") as QuizAnswers["usage"];
  const answers: QuizAnswers = {
    budget,
    usage,
    scenarios: (url.searchParams.get("scenes") ?? "").split(",").filter(Boolean),
    prefs: (url.searchParams.get("prefs") ?? "").split(",").filter(Boolean),
    tool: url.searchParams.get("tool") ?? "",
  };

  const rows = await db.plan.findMany({ where: { status: "published" }, include: { provider: true, score: true } });
  let main = "Your Plan";
  let assist = "";
  let price = "-";
  let match = "-";
  try {
    const r = recommend(rows.map(toPlanT), answers);
    if (r) {
      main = latinize(`${r.top.plan.provider.name} ${r.top.plan.name}`);
      assist = latinize(`${r.second.plan.provider.name} ${r.second.plan.name}`);
      price = r.top.plan.priceCny === 0 ? "FREE" : `¥${r.top.plan.priceCny}/MO`;
      match = `${r.top.matchScore}%`;
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
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>AI PLAN RADAR · MY CODING STACK</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.15 }}>{main}</div>
          <div style={{ display: "flex", gap: 40, fontSize: 40 }}>
            <span style={{ display: "flex" }}>{price}</span>
            <span style={{ display: "flex" }}>Match {match}</span>
          </div>
          {assist && (
            <div style={{ display: "flex", fontSize: 32, opacity: 0.85 }}>Alt pick · {assist}</div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>AI Plan Radar</div>
      </div>
    ),
    OG_SIZE,
  );
}

