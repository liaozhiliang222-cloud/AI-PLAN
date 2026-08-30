/* Patch OpenNext 打包产物：
   1. 把 query_compiler_bg.wasm 复制到打包目录（wrangler CompiledWasm 规则会编译它）
   2. 把 getQueryCompilerWasmModule 替换为动态 import wasm（不再 fs.readFileSync/运行时编译）
   3. 给 worker.js 注入 scheduled 导出（Cloudflare 原生 cron 触发采集，
      绕开 GitHub Actions 定时调度严重延迟的问题；wrangler.jsonc 的 triggers.crons 配时间）
*/
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../.open-next/server-functions/default/node_modules/.prisma/client");
const handlerPath = join(__dirname, "../.open-next/server-functions/default/handler.mjs");
const workerPath = join(__dirname, "../.open-next/worker.js");
const wasmSrc = join(__dirname, "../node_modules/.prisma/client/query_compiler_bg.wasm");
const IMPORT_PATTERN = 'import("./node_modules/.prisma/client/query_compiler_bg.wasm")';

if (!existsSync(handlerPath)) {
  console.log("[patch-wasm] handler.mjs 不存在，跳过（请先运行 opennext build）");
  process.exit(0);
}

// 1. 复制 wasm 到打包目录
if (existsSync(wasmSrc)) {
  mkdirSync(outDir, { recursive: true });
  copyFileSync(wasmSrc, join(outDir, "query_compiler_bg.wasm"));
  console.log("[patch-wasm] ✅ wasm 复制到", outDir);
} else {
  console.warn("[patch-wasm] ⚠️ 源 wasm 不存在:", wasmSrc);
}

// 2. 替换 getQueryCompilerWasmModule 实现
let handler = readFileSync(handlerPath, "utf8");
const idx = handler.indexOf("getQueryCompilerWasmModule:");
if (idx === -1) { console.warn("[patch-wasm] 未找到 getQueryCompilerWasmModule，跳过"); process.exit(0); }

if (handler.includes(IMPORT_PATTERN)) {
  console.log("[patch-wasm] 已是动态 import，跳过替换");
} else {
  let depth = 0, end = -1;
  for (let i = handler.indexOf("{", idx); i < handler.length; i++) {
    if (handler[i] === "{") depth++;
    else if (handler[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) { console.warn("[patch-wasm] 解析失败"); process.exit(1); }
  const oldCode = handler.slice(idx, end + 1);
  const newCode = `getQueryCompilerWasmModule:async()=>{const m=await ${IMPORT_PATTERN};return m.default||m}`;
  handler = handler.replace(oldCode, newCode);
  writeFileSync(handlerPath, handler, "utf8");
  console.log("[patch-wasm] ✅ 已替换为动态 import");
}

// 3. 给 worker.js 注入 scheduled 导出（幂等：已注入则跳过）
if (!existsSync(workerPath)) {
  console.warn("[patch-wasm] ⚠️ worker.js 不存在，跳过 cron 注入");
} else {
  let worker = readFileSync(workerPath, "utf8");
  if (worker.includes("__aprScheduled")) {
    console.log("[patch-wasm] worker.js 已含 scheduled 导出，跳过注入");
  } else if (!worker.includes("export default {")) {
    console.warn("[patch-wasm] ⚠️ worker.js 未找到 export default，跳过 cron 注入");
  } else {
    const cronPatch = `
// --- [AIPlanRadar] cron patch（scripts/patch-wasm.mjs 注入）：Cloudflare 原生定时采集 ---
async function __aprSha256Hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function __aprScheduled(controller, env, ctx) {
  const token = await __aprSha256Hex("apr-admin:" + env.ADMIN_PASSWORD);
  const self = env.WORKER_SELF_REFERENCE;
  if (!self || !env.ADMIN_PASSWORD) return;
  const call = (q) =>
    self.fetch(new Request("https://self/api/cron?token=" + token + q)).then((r) => r.json());
  for (let i = 0; i < 10; i++) {
    try {
      const r = await call("&sources=1&limit=4");
      if (r.remainingUnchecked === 0) break;
    } catch (e) { break; }
  }
  try { await call("&rss=1"); } catch (e) {}
}
`;
    worker = cronPatch + worker.replace("export default {", "export default { scheduled: __aprScheduled, ");
    writeFileSync(workerPath, worker, "utf8");
    console.log("[patch-wasm] ✅ 已注入 scheduled 导出（Cloudflare cron 触发）");
  }
}
