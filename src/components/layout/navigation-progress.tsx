"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function NavigationProgress() {
  const pathname = usePathname();
  const { pendingHref, clearNavigation } = useSidebar();
  const [visible, setVisible] = useState(false);
  const isNavigating = Boolean(pendingHref) && pendingHref !== pathname;

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      return;
    }

    const timer = window.setTimeout(() => setVisible(false), 120);
    return () => window.clearTimeout(timer);
  }, [isNavigating]);

  useEffect(() => {
    clearNavigation();
  }, [pathname, clearNavigation]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/10 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "navigation-progress-bar h-full w-2/5 bg-primary",
          isNavigating && "navigation-progress-bar-active",
        )}
      />
    </div>
  );
}
