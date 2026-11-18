"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MODAL_DETAIL_TIMEOUT_MS = 12_000;
const MAX_CACHED_MODAL_DETAILS = 24;

function rememberDetail<T>(cache: Map<string, T>, id: string, detail: T) {
  // Keep frequently opened details warm without retaining an unlimited number
  // of large modal payloads for the lifetime of the tab.
  cache.delete(id);
  cache.set(id, detail);
  while (cache.size > MAX_CACHED_MODAL_DETAILS) {
    const oldestId = cache.keys().next().value;
    if (oldestId === undefined) break;
    cache.delete(oldestId);
  }
}

function fetchDetailWithTimeout<T>(
  id: string,
  fetchDetail: (id: string) => Promise<T | null>,
): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("This took longer than expected. Please try again.")),
      MODAL_DETAIL_TIMEOUT_MS,
    );
  });

  return Promise.race([Promise.resolve().then(() => fetchDetail(id)), timeout]).finally(
    () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  );
}

const defaultGetId = <T,>(detail: T): string => (detail as { id: string }).id;

type UseCachedModalDetailOptions<T> = {
  /** Active record id while the modal is open (or about to open). */
  id: string | null;
  open: boolean;
  fetchDetail: (id: string) => Promise<T | null>;
  /** Optional shared cache so parent prefetch and the modal share one store. */
  cache?: Map<string, T>;
  /** Optional shared in-flight map to dedupe concurrent fetches for the same id. */
  inflight?: Map<string, Promise<T | null>>;
  getId?: (detail: T) => string;
};

type UseCachedModalDetailResult<T> = {
  detail: T | null;
  /** True only when we have nothing to show yet. */
  loading: boolean;
  error: string | null;
  /** Force-refresh after a mutation; updates cache. */
  refresh: () => Promise<T | null>;
  /** Drop cache entry (e.g. after delete). */
  invalidate: (id?: string) => void;
  setDetail: (detail: T | null) => void;
};

/**
 * Session-scoped modal detail loader:
 * - Reuses cached detail for the same id (no wipe → spinner on reopen).
 * - Dedupes concurrent fetches for the same id.
 * - Shows spinner only when there is no cached/previous matching detail.
 * Does not change authorization — callers still use their existing server actions.
 */
export function useCachedModalDetail<T>(
  options: UseCachedModalDetailOptions<T>,
): UseCachedModalDetailResult<T> {
  const {
    id,
    open,
    fetchDetail,
    getId = defaultGetId,
  } = options;

  const localCacheRef = useRef(new Map<string, T>());
  const localInflightRef = useRef(new Map<string, Promise<T | null>>());
  const cache = options.cache ?? localCacheRef.current;
  const inflight = options.inflight ?? localInflightRef.current;

  const fetchRef = useRef(fetchDetail);
  fetchRef.current = fetchDetail;
  const activeRef = useRef({ id, open });
  activeRef.current = { id, open };
  const loadVersionRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [detail, setDetail] = useState<T | null>(() =>
    id && cache.has(id) ? (cache.get(id) ?? null) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetId: string, opts?: { force?: boolean }) => {
      const version = ++loadVersionRef.current;
      const canUpdate = () => mountedRef.current &&
        version === loadVersionRef.current &&
        activeRef.current.open && activeRef.current.id === targetId;
      if (!opts?.force) {
        const cached = cache.get(targetId);
        if (cached) {
          rememberDetail(cache, targetId, cached);
          if (canUpdate()) {
            setDetail(cached);
            setError(null);
            setLoading(false);
          }
          return cached;
        }
      }

      let promise = opts?.force ? undefined : inflight.get(targetId);
      if (!promise) {
        promise = fetchDetailWithTimeout(targetId, fetchRef.current)
          .then((result) => {
            if (result && inflight.get(targetId) === promise) {
              rememberDetail(cache, targetId, result);
            }
            return result;
          })
          .finally(() => {
            if (inflight.get(targetId) === promise) inflight.delete(targetId);
          });
        inflight.set(targetId, promise);
      }

      // Only show loading if we have nothing useful to paint.
      const existing = cache.get(targetId);
      if (!existing && canUpdate()) setLoading(true);

      try {
        const result = await promise;
        if (canUpdate()) {
          setDetail(result);
          setError(result ? null : "Not found");
        }
        return result;
      } catch (err) {
        if (canUpdate()) {
          setDetail(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
        return null;
      } finally {
        if (canUpdate()) setLoading(false);
      }
    },
    [cache, inflight],
  );

  useEffect(() => {
    if (!open || !id) return;

    const cached = cache.get(id);
    if (cached) {
      setDetail(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // Keep painting previous detail only if it matches this id; otherwise clear.
    setDetail((prev) => {
      if (prev && getId(prev) === id) return prev;
      return null;
    });
    void load(id);
  }, [open, id, cache, getId, load]);

  const refresh = useCallback(async () => {
    if (!id) return null;
    return load(id, { force: true });
  }, [id, load]);

  const invalidate = useCallback(
    (targetId?: string) => {
      const invalidatedId = targetId ?? id;
      if (invalidatedId) {
        cache.delete(invalidatedId);
        // An invalidated response must not repopulate the cache after a mutation.
        inflight.delete(invalidatedId);
        if (invalidatedId === activeRef.current.id) loadVersionRef.current++;
      }
    },
    [cache, inflight, id],
  );

  // Retain the closing dialog's content for its existing exit animation.
  const matchingDetail = !open || (detail && getId(detail) === id) ? detail : null;
  return {
    detail: matchingDetail,
    loading: loading && !matchingDetail,
    error,
    refresh,
    invalidate,
    setDetail,
  };
}

/** Prefetch into a shared cache without requiring the modal to be mounted. */
export function prefetchCachedModalDetail<T>(
  id: string,
  fetchDetail: (id: string) => Promise<T | null>,
  cache: Map<string, T>,
  inflight: Map<string, Promise<T | null>>,
): Promise<T | null> {
  const cached = cache.get(id);
  if (cached) {
    rememberDetail(cache, id, cached);
    return Promise.resolve(cached);
  }

  let promise = inflight.get(id);
  if (!promise) {
    promise = fetchDetailWithTimeout(id, fetchDetail)
      .then((result) => {
        if (result && inflight.get(id) === promise) rememberDetail(cache, id, result);
        return result;
      })
      .finally(() => {
        if (inflight.get(id) === promise) inflight.delete(id);
      });
    inflight.set(id, promise);
  }
  return promise;
}
