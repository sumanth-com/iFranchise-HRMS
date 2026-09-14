import { readFile } from "node:fs/promises";
import path from "node:path";

import { isSafeRemoteFetchUrl } from "@/lib/security/safe-fetch-url";
import { resolvePathWithinBase } from "@/lib/security/safe-local-path";

const logoBytesCache = new Map<string, Uint8Array | null>();

async function readPublicImage(relativePath: string): Promise<Uint8Array | null> {
  const publicDir = path.join(process.cwd(), "public");
  const publicPath = resolvePathWithinBase(publicDir, relativePath);
  if (!publicPath) return null;
  try {
    return await readFile(publicPath);
  } catch {
    return null;
  }
}

async function readAssetLogo(): Promise<Uint8Array | null> {
  const assetsDir = path.join(process.cwd(), "src", "assets");
  const assetPath = resolvePathWithinBase(assetsDir, "Logo.png");
  if (!assetPath) return null;
  try {
    return await readFile(assetPath);
  } catch {
    return null;
  }
}

/**
 * Official payslip brand mark — always `Logo.png` (object-contain / proportional).
 * Used by PDF generation so every export matches the screen template.
 */
export async function loadPayslipBrandLogoBytes(): Promise<Uint8Array | null> {
  const cacheKey = "__payslip_brand_logo__";
  const cached = logoBytesCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const bytes =
    (await readAssetLogo()) ??
    (await readPublicImage("images/logo.png")) ??
    (await readPublicImage("images/logo-mark.png"));

  logoBytesCache.set(cacheKey, bytes);
  return bytes;
}

export async function loadLogoBytesCached(logoUrl: string | null): Promise<Uint8Array | null> {
  if (!logoUrl) return loadPayslipBrandLogoBytes();

  const cached = logoBytesCache.get(logoUrl);
  if (cached !== undefined) return cached;

  let bytes: Uint8Array | null = null;

  if (logoUrl.startsWith("/")) {
    bytes = await readPublicImage(logoUrl.replace(/^\//, ""));
    if (!bytes) {
      bytes = await loadPayslipBrandLogoBytes();
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
    if (!bytes) {
      bytes = await loadPayslipBrandLogoBytes();
    }
  } else {
    bytes = await loadPayslipBrandLogoBytes();
  }

  logoBytesCache.set(logoUrl, bytes);
  return bytes;
}
