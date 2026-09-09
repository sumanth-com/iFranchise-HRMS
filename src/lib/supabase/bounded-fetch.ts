/**
 * Shared fetch wrapper that aborts after `timeoutMs`.
 * Used by middleware and RSC Supabase clients so auth cannot hang indefinitely.
 */
export function createBoundedFetch(timeoutMs: number): typeof fetch {
  return (input, init = {}) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      init.signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;

    return fetch(input, {
      ...init,
      signal,
    });
  };
}
