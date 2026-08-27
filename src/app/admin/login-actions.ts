"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminPassword, adminToken, safeEqual } from "@/lib/auth";
import { verifyOrigin } from "@/lib/csrf";
import { isRateLimited, recordFailure, clearFailures } from "@/lib/rate-limit";

/** 由请求 IP + 固定盐派生速率限制 key（IP 近似，MVP 足够） */
async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip") || "unknown";
  return ip;
}

export async function login(f: FormData) {
  // CSRF：校验 Origin 归属
  if (!(await verifyOrigin())) {
    redirect("/admin/login?error=csrf");
  }

  const key = await clientKey();
  if (isRateLimited(key)) {
    redirect("/admin/login?error=locked");
  }

  const pw = String(f.get("password") ?? "");
  const from = String(f.get("from") ?? "/admin") || "/admin";

  // 使用常量时间比较，避免时序侧信道
  if (!safeEqual(pw, adminPassword())) {
    recordFailure(key);
    redirect(`/admin/login?error=1&from=${encodeURIComponent(from)}`);
  }

  clearFailures(key);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await adminToken(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect(from);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
