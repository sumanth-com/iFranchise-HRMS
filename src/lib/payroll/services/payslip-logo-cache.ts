import { readFile } from "node:fs/promises";
import path from "node:path";

import { isSafeRemoteFetchUrl } from "@/lib/security/safe-fetch-url";
import { resolvePathWithinBase } from "@/lib/security/safe-local-path";

const logoBytesCache = new Map<string, Uint8Array | null>();

export async function loadLogoBytesCached(logoUrl: string | null): Promise<Uint8Array | null> {
  if (!logoUrl) return null;

  const cached = logoBytesCache.get(logoUrl);
  if (cached !== undefined) return cached;

  let bytes: Uint8Array | null = null;

  if (logoUrl.startsWith("/")) {
    const publicDir = path.join(process.cwd(), "public");
    const publicPath = resolvePathWithinBase(publicDir, logoUrl.replace(/^\//, ""));
    try {
      if (publicPath) {
        bytes = await readFile(publicPath);
      }
    } catch {
      bytes = null;
    }

    if (!bytes) {
      const fallbackPath = resolvePathWithinBase(publicDir, "assets/Logo.png");
      try {
        if (fallbackPath) {
          bytes = await readFile(fallbackPath);
        }
      } catch {
        bytes = null;
      }
    }
  } else if (isSafeRemoteFetchUrl(logoUrl)) {
    try {
      const response = await fetch(logoUrl, { redirect: "error" });
      if (response.ok) {
        bytes = new Uint8Array(await response.arrayBuffer());
      }
    } catch {
      bytes = null;
    }
  }

  logoBytesCache.set(logoUrl, bytes);
  return bytes;
}
