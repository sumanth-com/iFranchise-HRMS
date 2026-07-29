import { readFile } from "node:fs/promises";
import path from "node:path";

const logoBytesCache = new Map<string, Uint8Array | null>();

export async function loadLogoBytesCached(logoUrl: string | null): Promise<Uint8Array | null> {
  if (!logoUrl) return null;

  const cached = logoBytesCache.get(logoUrl);
  if (cached !== undefined) return cached;

  let bytes: Uint8Array | null = null;

  if (logoUrl.startsWith("/")) {
    const publicPath = path.join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
    try {
      bytes = await readFile(publicPath);
    } catch {
      try {
        bytes = await readFile(path.join(process.cwd(), "src/assets/Logo.png"));
      } catch {
        bytes = null;
      }
    }
  } else {
    try {
      const response = await fetch(logoUrl);
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
