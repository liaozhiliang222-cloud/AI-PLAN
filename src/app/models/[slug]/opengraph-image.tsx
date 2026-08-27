import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OG_SIZE, OG_CONTENT_TYPE, latinize, ogStyle } from "@/lib/og";

export const alt = "AI Plan Radar 模型分享卡";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = await db.model.findUnique({ where: { slug }, include: { provider: true, score: true } });
  if (!model) notFound();
  const name = latinize(`${model.provider.name} ${model.name}`);
  const s = model.score;

  return new ImageResponse(
    (
      <div style={ogStyle()}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>AI PLAN RADAR · MODEL</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
          <div style={{ display: "flex", gap: 28, fontSize: 38 }}>
            {[["Overall", s?.overall], ["Coding", s?.coding], ["Agent", s?.agent], ["Cost", s?.cost]].map(([l, v]) => (
              <span key={String(l)} style={{ display: "flex" }}>
                {String(l)} {v == null ? "-" : Math.round(Number(v))}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>选模型、比套餐、看行情</div>
      </div>
    ),
    size,
  );
}
