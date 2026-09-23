import { existsSync } from "fs";
import { resolve as pathResolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), "..");
const stub = pathToFileURL(pathResolve(root, ".tmp-stubs/server-only.js")).href;

function resolveAtAlias(specifier) {
  const base = pathResolve(root, "src", specifier.slice(2));
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    pathResolve(base, "index.ts"),
    pathResolve(base, "index.tsx"),
  ]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return pathToFileURL(`${base}.ts`).href;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: stub };
  }
  if (specifier.startsWith("@/")) {
    return {
      shortCircuit: true,
      url: resolveAtAlias(specifier),
    };
  }
  return nextResolve(specifier, context);
}
