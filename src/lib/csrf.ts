/* Server Action CSRF 防护（共享逻辑，兼容 Edge/Node） */

import { headers } from "next/headers";

/**
 * 校验请求 Origin / Host，缓解跨站请求伪造（CSRF）。
 * 在 Next.js Server Action 中，浏览器会携带 Origin 头（同源为当前站点，跨站为攻击者站点）。
 * 若 Origin 存在但不属于本机站点，则拒绝。
 *
 * 返回 true 表示校验通过（或无法判定、需放行），false 表示疑似 CSRF，应拒绝执行。
 */
export async function verifyOrigin(): Promise<boolean> {
  try {
    const h = await headers();
    const origin = h.get("origin");
    const host = h.get("host");
    if (!origin) return true; // 非浏览器场景（curl/调度器）无 Origin，放行
    let hostname = host;
    if (hostname) {
      // 去掉端口
      hostname = hostname.replace(/:\d+$/, "");
    }
    try {
      const u = new URL(origin);
      if (hostname && u.hostname !== hostname) return false;
    } catch {
      return false; // 非法 Origin
    }
    return true;
  } catch {
    return true; // headers() 不可用时放行，避免误伤
  }
}
