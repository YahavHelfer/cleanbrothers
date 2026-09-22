import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);

export function resolveSourceImport(specifier, parent) {
  const base = specifier.startsWith("@/")
    ? resolve(projectRoot, "src", specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(parent), specifier)
      : null;
  if (!base) return null;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]
    .find((candidate) => existsSync(candidate)) ?? null;
}

// Compile project modules in memory: no generated files, server, or HTTP calls.
// React/Next components are inspected as element trees or rendered with SSR.
export function createSourceLoader({ nodeEnv = "test", env = {}, mocks = {}, fetchImpl } = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = resolve(projectRoot, filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loadedModule = { exports: {} };
    cache.set(absolute, loadedModule);
    const require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === "server-only") return {};
      if (specifier.endsWith(".css")) return {};
      if (specifier === "next/font/google") {
        return { Heebo: () => ({ variable: "test-heebo" }) };
      }
      const dependency = resolveSourceImport(specifier, absolute);
      return dependency ? load(dependency) : nativeRequire(specifier);
    };
    const javascript = ts.transpileModule(readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: absolute,
    }).outputText;
    vm.runInNewContext(javascript, {
      exports: loadedModule.exports,
      module: loadedModule,
      require,
      process: { env: { NODE_ENV: nodeEnv, ...env } },
      URL,
      Request, Response, FormData, Headers, Uint8Array,
      AbortSignal,
      fetch: fetchImpl, // Explicit test transport; never enable network by default.
    }, { filename: absolute });
    return loadedModule.exports;
  }
  return load;
}

export function elementTree(node) {
  if (Array.isArray(node)) return node.flatMap(elementTree);
  if (!node || typeof node !== "object" || !node.props) return [];
  return [node, ...elementTree(node.props.children)];
}

export function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
