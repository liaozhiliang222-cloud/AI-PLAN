import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OG_SIZE, OG_CONTENT_TYPE, latinize, ogStyle } from "@/lib/og";

export const alt = "AI Plan Radar 套餐分享卡";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await db.plan.findUnique({ where: { slug }, include: { provider: true, score: true } });
  if (!plan) notFound();
  const name = latinize(`${plan.provider.name} ${plan.name}`);
  const price = plan.priceCny === 0 ? "FREE" : `¥${plan.priceCny}/MO`;
  const overall = Math.round(plan.score?.overall ?? 0);

  return new ImageResponse(
    (
      <div style={ogStyle()}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>AI PLAN RADAR</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 40, opacity: 0.9 }}>
            {price} · Overall {overall}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>选模型、比套餐、看行情</div>
      </div>
    ),
    size,
  );
}
