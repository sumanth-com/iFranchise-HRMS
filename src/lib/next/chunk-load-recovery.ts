const CHUNK_RELOAD_KEY = "hrms.chunk-reload-at";
const CHUNK_RELOAD_COUNT_KEY = "hrms.chunk-reload-count";
/** Cooldown between automatic recovery reloads. */
const CHUNK_RELOAD_COOLDOWN_MS = 12_000;
/** Hard cap on automatic recoveries per tab session (force retry still allowed once). */
const CHUNK_RELOAD_MAX_ATTEMPTS = 2;

function errorHaystack(error: unknown): string {
  if (!error) return "";

  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : "";

  return `${name} ${message} ${digest}`;
}

/**
 * Stale/missing JS or CSS chunks after a deploy (or broken dynamic import).
 * These are deployment/asset skew — not application business logic bugs.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const name = error instanceof Error ? error.name : "";
  const haystack = errorHaystack(error);

  return (
    name === "ChunkLoadError" ||
    /Failed to load chunk/i.test(haystack) ||
    /Loading chunk [\w.-]+ failed/i.test(haystack) ||
    /Loading CSS chunk/i.test(haystack) ||
    /\/_next\/static\/chunks\//i.test(haystack) ||
    /ChunkLoadError/i.test(haystack) ||
    /Failed to fetch dynamically imported module/i.test(haystack) ||
    /Importing a module script failed/i.test(haystack) ||
    /error loading dynamically imported module/i.test(haystack)
  );
}

/** Turbopack/Webpack HMR left a stale client module graph — hard reload recovers. */
export function isStaleHmrModuleError(error: unknown): boolean {
  if (!error) return false;
  const haystack = errorHaystack(error);
  return (
    /module factory is not available/i.test(haystack) ||
    /deleted in an HMR update/i.test(haystack) ||
    /was instantiated because it was required/i.test(haystack) ||
    /module factory is undefined/i.test(haystack) ||
    /Cannot find module/i.test(haystack) ||
    /Module \[project\]/i.test(haystack) ||
    // Webpack HMR left a broken require() graph (undefined module factory).
    /Cannot read properties of undefined \(reading 'call'\)/i.test(haystack) ||
    /Cannot read property 'call' of undefined/i.test(haystack)
  );
}

/**
 * Client/server build skew after a deployment (RSC manifest, Server Actions).
 * Intentionally excludes AbortError / generic "Failed to fetch" — those are common
 * during rapid soft-navigation cancellations and must not trigger a hard reload.
 */
export function isDeploymentSkewError(error: unknown): boolean {
  if (!error) return false;
  const haystack = errorHaystack(error);
  return (
    /Failed to find Server Action/i.test(haystack) ||
    /UnrecognizedAction/i.test(haystack) ||
    /was not found on the server/i.test(haystack) ||
    /(?:older or newer|newer or older) deployment/i.test(haystack) ||
    /React Server Components? Payload/i.test(haystack) ||
    /React Client Manifest/i.test(haystack) ||
    /Could not find the module/i.test(haystack) ||
    /Failed to fetch RSC payload/i.test(haystack) ||
    /Invalid RSC response/i.test(haystack)
  );
}

/**
 * Only true deployment/chunk/RSC/action skew is recoverable via hard reload.
 * Application exceptions must surface to the error UI (and be fixed in code).
 */
export function isRecoverableRouteError(error: unknown): boolean {
  return (
    isChunkLoadError(error) ||
    isStaleHmrModuleError(error) ||
    isDeploymentSkewError(error)
  );
}

function readAttemptCount(): number {
  try {
    const raw = Number(sessionStorage.getItem(CHUNK_RELOAD_COUNT_KEY) ?? "0");
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

function writeAttemptMeta(now: number, count: number): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    sessionStorage.setItem(CHUNK_RELOAD_COUNT_KEY, String(count));
  } catch {
    // Private mode / blocked storage — still attempt reload below.
  }
}

/**
 * Reloads to pick up new chunks/manifests.
 * Returns false when cooldown or max attempts block another automatic reload.
 * Always logs the decision; never silently swallows the original exception.
 */
export function recoverFromChunkLoadError(options?: {
  force?: boolean;
  cause?: unknown;
}): boolean {
  if (typeof window === "undefined") return false;

  const force = options?.force === true;
  const cause = options?.cause;
  const now = Date.now();

  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "0");
    const attempts = readAttemptCount();

    if (!force && last && now - last < CHUNK_RELOAD_COOLDOWN_MS) {
      console.error("[chunk-recovery] skipped (cooldown)", {
        attempts,
        cause:
          cause instanceof Error
            ? { name: cause.name, message: cause.message }
            : cause,
      });
      return false;
    }

    if (!force && attempts >= CHUNK_RELOAD_MAX_ATTEMPTS) {
      console.error("[chunk-recovery] skipped (max attempts)", {
        attempts,
        cause:
          cause instanceof Error
            ? { name: cause.name, message: cause.message }
            : cause,
      });
      return false;
    }

    writeAttemptMeta(now, attempts + 1);
  } catch {
    // continue
  }

  console.error("[chunk-recovery] reloading for deploy/chunk skew", {
    force,
    attempts: readAttemptCount(),
    href: window.location.href,
    cause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message, stack: cause.stack }
        : cause,
  });

  const url = new URL(window.location.href);
  // Bust sticky client/HMR graph so the reload cannot reuse a dead module factory.
  url.searchParams.set("_r", String(now));
  window.location.replace(`${url.pathname}${url.search}${url.hash}`);
  return true;
}

/** Clear recovery counters after a successful page load (call once from root providers). */
export function clearChunkRecoveryStateIfHealthy(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("_r")) return;
    url.searchParams.delete("_r");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    sessionStorage.removeItem(CHUNK_RELOAD_COUNT_KEY);
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // ignore
  }
}
