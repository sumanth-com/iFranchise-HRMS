"use client";

import { useEffect, useMemo, useRef } from "react";
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
 * Warm the route the user is about to open.
 * The current page is already loaded. Portal home warms on idle.
 * Other modules prefetch on hover or pointer down, not as a sidebar burst.
 */
export function InstantNavPrefetch() {
  const router = useRouter();
  const pathname = usePathname();
  const { navigation, portalHome } = useSidebarNavigation();

  // Persisted across navigations: re-warming every module on each pathname change
  // fires a burst of full RSC requests that compete with the page being navigated to.
  const seenRef = useRef<Set<string>>(new Set());

  // Stabilize effect identity when AuthProvider rebuilds `navigation` with the same hrefs.
  const navKey = useMemo(
    () =>
      navigation
        .map((item) => (typeof item.href === "string" ? item.href : ""))
        .filter(Boolean)
        .join("|"),
    [navigation],
  );

  useEffect(() => {
    const seen = seenRef.current;
    const navHrefs = navKey.split("|").filter(Boolean);
    const allowedPrefixes = [portalHome, ...navHrefs];

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

    const supportsIdle = typeof window.requestIdleCallback === "function";
    const warmHandle = supportsIdle
      ? window.requestIdleCallback(() => {
          if (portalHome && portalHome !== pathname) prefetch(portalHome);
        })
      : window.setTimeout(() => {
          if (portalHome && portalHome !== pathname) prefetch(portalHome);
        }, 1500);

    const onPointerOver = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (anchor) prefetch(anchor.getAttribute("href"));
    };

    const onPointerDown = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (anchor) prefetch(anchor.getAttribute("href"));
    };

    document.addEventListener("pointerover", onPointerOver, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", onPointerDown, {
      capture: true,
      passive: true,
    });
    // Intentionally no focusin listener — keyboard focus walked the whole sidebar
    // and prefetched every module as competing RSC requests.

    return () => {
      if (supportsIdle) {
        window.cancelIdleCallback(warmHandle);
      } else {
        window.clearTimeout(warmHandle);
      }
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [navKey, pathname, portalHome, router]);

  return null;
}
