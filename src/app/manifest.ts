import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Plan Radar - AI Coding Plan 比价与选型",
    short_name: "Plan Radar",
    description: "实时追踪 AI Coding 套餐、模型、价格与额度变化。",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#2563EB",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
