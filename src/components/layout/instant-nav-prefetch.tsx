"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";

function toInternalPath(href: string | null | undefined): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  if (href.startsWith("/api/") || href.startsWith("/auth/")) return null;
  const path = href.split("#")[0];
  return path && path.length > 0 ? path : null;
}

function isAuthorizedPath(path: string, allowedPrefixes: string[]) {
  return allowedPrefixes.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`),
  );
}

/**
 * Warm the App Router cache for routes the current user can already see in nav.
 * Bulk prefetch waits until after first paint so it does not contend with page data.
 */
export function InstantNavPrefetch() {
  const router = useRouter();
  const pathname = usePathname();
  const { navigation, portalHome } = useSidebarNavigation();

  useEffect(() => {
    const seen = new Set<string>([pathname]);
    const allowedPrefixes = [
      portalHome,
      ...navigation
        .map((item) => (typeof item.href === "string" ? toInternalPath(item.href) : null))
        .filter((href): href is string => Boolean(href)),
    ];

    const prefetch = (href: string | null | undefined) => {
      const path = toInternalPath(href);
      if (!path || seen.has(path)) return;
      if (!isAuthorizedPath(path, allowedPrefixes)) return;
      seen.add(path);
      try {
        router.prefetch(path);
      } catch {
        // Ignore prefetch failures (unsupported routes, aborted nav).
      }
    };

    const warmAuthorizedNav = () => {
      prefetch(portalHome);
      for (const item of navigation) {
        if (typeof item.href === "string") prefetch(item.href);
      }
    };

    const idleId =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(warmAuthorizedNav, { timeout: 2000 })
        : window.setTimeout(warmAuthorizedNav, 1200);

    const onPointerOver = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (anchor) prefetch(anchor.getAttribute("href"));
    };

    document.addEventListener("pointerover", onPointerOver, {
      capture: true,
      passive: true,
    });
    document.addEventListener("focusin", onPointerOver, { capture: true });

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("focusin", onPointerOver, true);
    };
  }, [navigation, pathname, portalHome, router]);

  return null;
}
