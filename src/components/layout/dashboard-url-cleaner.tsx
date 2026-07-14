"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Dashboard filters still use query params internally for server rendering.
 * Keep the visible URL professional by removing those params after navigation.
 * Preserve query params that represent actual UI sections/tabs.
 */
export function DashboardUrlCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.toString()) return;

    const preserved = new URLSearchParams();
    for (const key of ["tab", "section"]) {
      const value = searchParams.get(key);
      if (value) preserved.set(key, value);
    }

    const query = preserved.toString();
    const cleanUrl = `${pathname}${query ? `?${query}` : ""}${window.location.hash}`;

    if (cleanUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [pathname, searchParams]);

  return null;
}
