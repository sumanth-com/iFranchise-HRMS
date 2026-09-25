"use client";

import { useEffect, useMemo, useState } from "react";

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
 * Return visit: cache → immediate paint; prop updates still win when RSC delivers.
 */
export function useModuleSoftData<T>(
  serverData: T,
  options: UseModuleSoftDataOptions,
): T {
  const { profile } = useAuth();
  const organizationId = profile.employee.organizationId;
  const employeeId = profile.employee.id;
  const ttlMs = options.ttlMs ?? MODULE_SOFT_CACHE_TTL_MS;

  const key = useMemo(
    () => moduleSoftCacheKey(options.moduleId, { organizationId, employeeId }),
    [options.moduleId, organizationId, employeeId],
  );

  const [data, setData] = useState<T>(() => {
    const cached = getModuleSoftCache<T>(key, ttlMs);
    return cached ?? serverData;
  });

  useEffect(() => {
    setModuleSoftCache(key, serverData);
    setData(serverData);
  }, [key, serverData]);

  return data;
}

/** Peek cached module data for Suspense fallbacks (same-tab soft-nav). */
export function peekAuthScopedModuleCache<T>(
  moduleId: string,
  scope: { organizationId: string; employeeId: string },
  ttlMs: number = MODULE_SOFT_CACHE_TTL_MS,
): T | null {
  return getModuleSoftCache<T>(moduleSoftCacheKey(moduleId, scope), ttlMs);
}
