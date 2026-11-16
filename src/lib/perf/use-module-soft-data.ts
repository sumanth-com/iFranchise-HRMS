"use client";

import { useEffect, useMemo } from "react";

import {
  getModuleSoftCache,
  moduleSoftCacheKey,
  setModuleSoftCache,
  MODULE_SOFT_CACHE_TTL_MS,
} from "@/lib/perf/module-soft-cache";
import { useAuth } from "@/providers/auth-provider";

type UseModuleSoftDataOptions = {
  moduleId: string;
  ttlMs?: number;
};

/**
 * Keep valid module payloads across soft-nav remounts.
 * First visit: server data → render → cache.
 * Return visits reuse Next's route payload. Cache is only for scoped fallbacks;
 * once server props arrive, render them immediately without a stale first frame.
 */
export function useModuleSoftData<T>(
  serverData: T,
  options: UseModuleSoftDataOptions,
): T {
  const { profile } = useAuth();
  const organizationId = profile.employee.organizationId;
  const employeeId = profile.employee.id;

  const key = useMemo(
    () => moduleSoftCacheKey(options.moduleId, { organizationId, employeeId }),
    [options.moduleId, organizationId, employeeId],
  );

  useEffect(() => {
    setModuleSoftCache(key, serverData);
  }, [key, serverData]);

  return serverData;
}

/** Peek cached module data for Suspense fallbacks (same-tab soft-nav). */
export function peekAuthScopedModuleCache<T>(
  moduleId: string,
  scope: { organizationId: string; employeeId: string },
  ttlMs: number = MODULE_SOFT_CACHE_TTL_MS,
): T | null {
  return getModuleSoftCache<T>(moduleSoftCacheKey(moduleId, scope), ttlMs);
}
