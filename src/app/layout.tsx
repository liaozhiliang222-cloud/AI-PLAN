import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SWRegister } from "@/components/SWRegister";
import { InstallPrompt, OfflineBanner } from "@/components/InstallPrompt";
import { ToastHost } from "@/components/ToastHost";
import { SITE } from "@/lib/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE.name} - AI Coding Plan 比价与选型工具`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.desc,
  keywords: ["AI Coding", "Claude", "Kimi", "GLM", "Cursor", "Codex", "套餐对比", "价格"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE.name,
    title: `${SITE.name} - ${SITE.slogan}`,
    description: SITE.desc,
  },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <OfflineBanner />
        <Nav />
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 pb-[76px] md:pb-10 pt-4 md:pt-6 min-h-[calc(100vh-180px)]">
          {children}
        </main>
        <Footer />
        <SWRegister />
        <InstallPrompt />
        <ToastHost />
      </body>
    </html>
  );
}

async function Footer() {
  // 动态取最近一次数据验证时间（轻量单查询，避免硬编码日期漂移）
  let lastVerified: string | null = null;
  try {
    const { db } = await import("@/lib/db");
    const latest = await db.plan.findFirst({
      where: { status: "published" },
      orderBy: { lastVerifiedAt: "desc" },
      select: { lastVerifiedAt: true },
    });
    if (latest?.lastVerifiedAt) {
      lastVerified = latest.lastVerifiedAt.toISOString().slice(0, 10);
    }
  } catch {}

  return (
    <footer className="border-t border-gray-200 bg-white mt-8">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 text-xs text-gray-400 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-gray-500">AI Plan Radar</span>
          <span>{SITE.slogan}</span>
        </div>
        <p>
          本站为 MVP 演示版本：价格、额度与评分均为示例数据（后台可编辑），请以官方页面为准。
          {lastVerified ? `数据更新于 ${lastVerified}。` : ""}
        </p>
      </div>
    </footer>
  );
}
