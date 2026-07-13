"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Dashboard filters still use query params internally for server rendering.
 * Keep the visible URL professional by removing those params after navigation.
 */
export function DashboardUrlCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams.toString()) return;

    const cleanUrl = `${pathname}${window.location.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  }, [pathname, searchParams]);

  return null;
}
