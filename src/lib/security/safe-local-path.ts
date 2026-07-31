import path from "node:path";

/**
 * Resolves a path under a base directory and rejects traversal escapes.
 */
export function resolvePathWithinBase(baseDir: string, relativePath: string): string | null {
  const normalized = relativePath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    return null;
  }

  const baseResolved = path.resolve(baseDir);
  const candidate = path.resolve(baseDir, normalized);
  if (candidate !== baseResolved && !candidate.startsWith(`${baseResolved}${path.sep}`)) {
    return null;
  }

  return candidate;
}
