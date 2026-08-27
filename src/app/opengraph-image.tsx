import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE, ogStyle } from "@/lib/og";

export const alt = "AI Plan Radar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={ogStyle()}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>AI PLAN RADAR</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 700, lineHeight: 1.1 }}>
            AI Coding Plan Radar
          </div>
          <div style={{ display: "flex", fontSize: 44, opacity: 0.92 }}>Market • Value • Choice</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>aiplanradar</span>
          <span
            style={{
              display: "flex",
              backgroundColor: "#ffffff",
              color: "#2563EB",
              borderRadius: 14,
              padding: "14px 30px",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Best Plan Finder
          </span>
        </div>
      </div>
    ),
    size,
  );
}
