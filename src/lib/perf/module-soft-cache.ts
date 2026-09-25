/**
 * Session-scoped soft cache for portal module payloads.
 * Scoped by organization + employee so data never crosses identity boundaries.
 * Used for instant return visits; mutations must call invalidateModuleSoftCache.
 */

type CacheEntry<T> = {
  value: T;
  savedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** Default: align with Next experimental.staleTimes.dynamic (5 min). */
export const MODULE_SOFT_CACHE_TTL_MS = 5 * 60 * 1000;

export function moduleSoftCacheKey(
  moduleId: string,
  scope: { organizationId: string; employeeId: string },
): string {
  return `${moduleId}::${scope.organizationId}::${scope.employeeId}`;
}

export function getModuleSoftCache<T>(
  key: string,
  ttlMs: number = MODULE_SOFT_CACHE_TTL_MS,
): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.savedAt > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setModuleSoftCache<T>(key: string, value: T): void {
  store.set(key, { value, savedAt: Date.now() });
}

export function invalidateModuleSoftCache(keyOrPrefix: string): void {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) store.delete(key);
  }
}

export function peekModuleSoftCacheAgeMs(key: string): number | null {
  const entry = store.get(key);
  if (!entry) return null;
  return Date.now() - entry.savedAt;
}
