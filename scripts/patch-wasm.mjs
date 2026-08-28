/* Patch OpenNext 打包产物：
   1. 把 query_compiler_bg.wasm 复制到打包目录（wrangler CompiledWasm 规则会编译它）
   2. 把 getQueryCompilerWasmModule 替换为动态 import wasm（不再 fs.readFileSync/运行时编译）
*/
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../.open-next/server-functions/default/node_modules/.prisma/client");
const handlerPath = join(__dirname, "../.open-next/server-functions/default/handler.mjs");
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
