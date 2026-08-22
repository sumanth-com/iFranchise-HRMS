/** Detect Next.js stale Server Action ID errors after a rebuild. */
export function isStaleServerActionError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : String(error);
  if (message.includes("was not found on the server")) return true;
  if (message.includes("UnrecognizedAction")) return true;
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "UnrecognizedActionError"
  ) {
    return true;
  }
  return false;
}

const RELOAD_FLAG = "hrms.stale-server-action-reload-at";

/**
 * Hard-reload once so the browser picks up new Server Action hashes.
 * Uses a short cooldown so we do not loop if something is still wrong.
 */
export function reloadForStaleServerAction(): void {
  if (typeof window === "undefined") return;
  try {
    const lastAt = Number(sessionStorage.getItem(RELOAD_FLAG) || "0");
    if (Number.isFinite(lastAt) && Date.now() - lastAt < 8_000) return;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    // sessionStorage may be unavailable
  }
  // Full navigation clears stale client action manifests better than reload alone.
  window.location.replace(window.location.href);
}

export function clearStaleServerActionReloadFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // ignore
  }
}

/** Run a server action; reload once when the client has a stale action manifest. */
export async function runServerActionSafely<T>(
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    const value = await fn();
    clearStaleServerActionReloadFlag();
    return value;
  } catch (error) {
    if (isStaleServerActionError(error)) {
      reloadForStaleServerAction();
      return null;
    }
    throw error;
  }
}
