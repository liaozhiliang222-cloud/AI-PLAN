import { describe, expect, it } from "vitest";
import ts from "typescript";
import { patchQueryCompilerWasm, QUERY_COMPILER_IMPORT } from "../../../scripts/lib/patch-query-compiler.mjs";

describe("query compiler bundle patch", () => {
  it.each([
    'async()=>{const loader=await import("#wasm-compiler-loader");return loader.default}',
    'async()=>(await import("#wasm-compiler-loader")).default',
    'async()=>(await(await Promise.resolve().then(()=>(init_wasm_worker_loader(),wasm_worker_loader_exports))).default).default',
    'async()=>WebAssembly.compile(bytes)',
    'async()=>{const text="}";const nested={value:"{"};return nested[text]}',
  ])("patches loader %s without consuming adjacent properties", (loader) => {
    const source = `const config={getRuntime:()=>runtime,getQueryCompilerWasmModule:${loader}};config.injectableEdgeEnv=()=>({parsed:{DATABASE_URL:process.env.DATABASE_URL}});`;
    const patched = patchQueryCompilerWasm(source);
    expect(patched).toContain(QUERY_COMPILER_IMPORT);
    expect(patched).toContain("getRuntime:()=>runtime");
    expect(patched).toContain("};config.injectableEdgeEnv=()=>({parsed:{DATABASE_URL:process.env.DATABASE_URL}});");
    expect(ts.transpileModule(patched, { reportDiagnostics: true }).diagnostics).toHaveLength(0);
    expect(patchQueryCompilerWasm(patched)).toBe(patched);
  });

  it("supports a quoted property name", () => {
    expect(patchQueryCompilerWasm('const config={"getQueryCompilerWasmModule":async()=>load()};')).toContain(QUERY_COMPILER_IMPORT);
  });

  it("fails closed on missing or ambiguous loaders and malformed input", () => {
    expect(() => patchQueryCompilerWasm("const config={};")).toThrow("found 0");
    expect(() => patchQueryCompilerWasm("const a={getQueryCompilerWasmModule:load},b={getQueryCompilerWasmModule:load};")).toThrow("found 2");
    expect(() => patchQueryCompilerWasm("const a={getQueryCompilerWasmModule:async()=>{});")).toThrow("invalid Worker bundle");
  });
});
