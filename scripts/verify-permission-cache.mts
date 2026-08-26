/**
 * Verifies chunked hrms_permissions cookie: attach / read / fail-closed cases.
 * Run: node --import tsx scripts/verify-permission-cache.mts
 * (or via npx tsx)
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";

// server-only blocks Node imports of HMAC helpers — stub it for this script.
const require = createRequire(import.meta.url);
const Module = require("module") as typeof import("module") & {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

async function main() {
  process.env.PERMISSION_CACHE_SECRET ??=
    process.env.PERMISSION_CACHE_SECRET || "test-permission-cache-secret-32chars!!";

  const {
    attachPermissionCache,
    getCachedPermissionCodes,
    clearPermissionCache,
    PERMISSION_CACHE_COOKIE_NAME,
  } = await import("../src/lib/auth/permission-cache.ts");

  const userId = "user-verify-1";
  const manyCodes = Array.from({ length: 400 }, (_, i) => `perm.module.action.${i}`);

  // 1) Large payload must chunk under 4096 per cookie
  const response = NextResponse.next();
  await attachPermissionCache(response, userId, manyCodes, true, ["hr_admin"]);

  const setCookies = response.cookies.getAll();
  const permCookies = setCookies.filter((c) =>
    c.name === PERMISSION_CACHE_COOKIE_NAME ||
    c.name.startsWith(`${PERMISSION_CACHE_COOKIE_NAME}.`),
  );
  assert.ok(permCookies.length >= 2, `expected chunked cookies, got ${permCookies.length}`);
  for (const cookie of permCookies) {
    assert.ok(
      cookie.value.length < 4096,
      `cookie ${cookie.name} oversized: ${cookie.value.length}`,
    );
  }
  console.log("OK chunked write", { chunks: permCookies.length, sizes: permCookies.map((c) => c.value.length) });

  // 2) Reassemble + verify HMAC + user binding
  const header = permCookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const request = new NextRequest("http://localhost/dashboard", {
    headers: { cookie: header },
  });
  const codes = await getCachedPermissionCodes(request, userId);
  assert.ok(codes);
  assert.equal(codes!.length, manyCodes.length);
  console.log("OK reassemble + verify", { codes: codes!.length });

  // 3) Wrong user → fail-closed
  const wrongUser = await getCachedPermissionCodes(request, "other-user");
  assert.equal(wrongUser, null);
  console.log("OK wrong user fail-closed");

  // 4) Missing middle chunk → fail-closed (tamper by dropping .1)
  const incomplete = permCookies
    .filter((c) => c.name === PERMISSION_CACHE_COOKIE_NAME)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const incompleteReq = new NextRequest("http://localhost/dashboard", {
    headers: { cookie: incomplete },
  });
  // Single first chunk alone is incomplete for large payloads — HMAC parse fails → null
  const incompleteCodes = await getCachedPermissionCodes(incompleteReq, userId);
  assert.equal(incompleteCodes, null);
  console.log("OK missing chunk fail-closed");

  // 5) Invalid signature → fail-closed
  const bad = permCookies
    .map((c, i) => {
      if (i === 0) return `${c.name}=AAAA${c.value.slice(4)}`;
      return `${c.name}=${c.value}`;
    })
    .join("; ");
  const badReq = new NextRequest("http://localhost/dashboard", {
    headers: { cookie: bad },
  });
  assert.equal(await getCachedPermissionCodes(badReq, userId), null);
  console.log("OK invalid signature fail-closed");

  // 6) Expired payload → fail-closed
  const expiredRes = NextResponse.next();
  const { signPayload } = await import("../src/lib/security/hmac.ts");
  const expiredBody = JSON.stringify({
    userId,
    codes: ["a.b"],
    roleCodes: [],
    accountAllowed: true,
    expiresAt: Date.now() - 60_000,
  });
  const expiredSigned = `${await signPayload(expiredBody)}.${expiredBody}`;
  expiredRes.cookies.set(PERMISSION_CACHE_COOKIE_NAME, expiredSigned, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60,
  });
  const expiredHeader = expiredRes.cookies
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const expiredReq = new NextRequest("http://localhost/dashboard", {
    headers: { cookie: expiredHeader },
  });
  assert.equal(await getCachedPermissionCodes(expiredReq, userId), null);
  console.log("OK expired cookie fail-closed");

  // 7) Clear removes all chunks
  const cleared = NextResponse.next();
  // seed then clear
  await attachPermissionCache(cleared, userId, manyCodes);
  clearPermissionCache(cleared);
  const clearedCookies = cleared.cookies.getAll().filter((c) =>
    c.name === PERMISSION_CACHE_COOKIE_NAME ||
    c.name.startsWith(`${PERMISSION_CACHE_COOKIE_NAME}.`),
  );
  assert.ok(clearedCookies.every((c) => !c.value || c.value === ""));
  console.log("OK clear all chunks");

  console.log("\npermission-cache verification PASSED");
}

main().catch((error) => {
  console.error("permission-cache verification FAILED", error);
  process.exit(1);
});
