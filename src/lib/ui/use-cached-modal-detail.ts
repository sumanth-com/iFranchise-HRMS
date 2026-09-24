"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    getId = (detail) => (detail as { id: string }).id,
  } = options;

  const localCacheRef = useRef(new Map<string, T>());
  const localInflightRef = useRef(new Map<string, Promise<T | null>>());
  const cache = options.cache ?? localCacheRef.current;
  const inflight = options.inflight ?? localInflightRef.current;

  const fetchRef = useRef(fetchDetail);
  fetchRef.current = fetchDetail;

  const [detail, setDetail] = useState<T | null>(() =>
    id && cache.has(id) ? (cache.get(id) ?? null) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetId: string, opts?: { force?: boolean }) => {
      if (!opts?.force) {
        const cached = cache.get(targetId);
        if (cached) {
          setDetail(cached);
          setError(null);
          setLoading(false);
          return cached;
        }
      }

      let promise = inflight.get(targetId);
      if (!promise) {
        promise = fetchRef
          .current(targetId)
          .then((result) => {
            if (result) cache.set(targetId, result);
            return result;
          })
          .finally(() => {
            inflight.delete(targetId);
          });
        inflight.set(targetId, promise);
      }

      // Only show loading if we have nothing useful to paint.
      const existing = cache.get(targetId);
      if (!existing) setLoading(true);

      try {
        const result = await promise;
        setDetail(result);
        setError(result ? null : "Not found");
        return result;
      } catch (err) {
        setDetail(null);
        setError(err instanceof Error ? err.message : "Failed to load");
        return null;
      } finally {
        setLoading(false);
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
      if (targetId) {
        cache.delete(targetId);
        return;
      }
      if (id) cache.delete(id);
    },
    [cache, id],
  );

  return {
    detail,
    loading: loading && !detail,
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
  if (cached) return Promise.resolve(cached);

  let promise = inflight.get(id);
  if (!promise) {
    promise = fetchDetail(id)
      .then((result) => {
        if (result) cache.set(id, result);
        return result;
      })
      .finally(() => {
        inflight.delete(id);
      });
    inflight.set(id, promise);
  }
  return promise;
}
