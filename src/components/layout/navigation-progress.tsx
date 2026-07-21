"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function NavigationProgress() {
  const pathname = usePathname();
  const { pendingHref, clearNavigation } = useSidebar();
  const isNavigating = Boolean(pendingHref) && pendingHref !== pathname;

  useEffect(() => {
    clearNavigation();
  }, [pathname, clearNavigation]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-transparent transition-opacity duration-150",
        isNavigating ? "opacity-100" : "opacity-0",
      )}
      aria-hidden="true"
    >
      <div className="navigation-progress-bar h-full w-1/3 bg-primary" />
    </div>
  );
}
