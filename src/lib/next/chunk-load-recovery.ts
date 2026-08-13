const CHUNK_RELOAD_KEY = "hrms.chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 12_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : "";

  const haystack = `${name} ${message} ${digest}`;

  return (
    name === "ChunkLoadError" ||
    /Failed to load chunk/i.test(haystack) ||
    /Loading chunk [\w.-]+ failed/i.test(haystack) ||
    /Loading CSS chunk/i.test(haystack) ||
    /\/_next\/static\/chunks\//i.test(haystack) ||
    /ChunkLoadError/i.test(haystack)
  );
}

/** Reloads once to pick up new chunks; returns false if already retried recently. */
export function recoverFromChunkLoadError(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "0");
    const now = Date.now();
    if (last && now - last < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // Private mode / blocked storage — still attempt a single reload.
  }

  const { pathname, search, hash } = window.location;
  window.location.replace(`${pathname}${search}${hash}`);
  return true;
}
