import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

const base = SITE.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/search", "/recommend/result"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
