import ts from "typescript";

export const QUERY_COMPILER_IMPORT = 'import("./node_modules/.prisma/client/query_compiler_bg.wasm")';

/** Replace only the loader expression, including minified expression-bodied arrows. */
export function patchQueryCompilerWasm(source) {
  const file = ts.createSourceFile("handler.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw new Error("Cannot patch an invalid Worker bundle");

  const loaders = [];
  function visit(node) {
    if (ts.isPropertyAssignment(node) &&
        (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
        node.name.text === "getQueryCompilerWasmModule") {
      loaders.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (loaders.length !== 1) {
    throw new Error(`Expected one query compiler loader, found ${loaders.length}`);
  }

  const loader = loaders[0];
  const start = loader.getStart(file);
  const replacement = `async()=>{const m=await ${QUERY_COMPILER_IMPORT};return m.default||m}`;
  return source.slice(0, start) + replacement + source.slice(loader.end);
}
