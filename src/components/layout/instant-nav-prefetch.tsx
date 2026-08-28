"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
 * Priority routes prefetch immediately; the rest warm on idle.
 */
export function InstantNavPrefetch() {
  const router = useRouter();
  const { navigation, portalHome } = useSidebarNavigation();

  // Persisted across navigations: re-warming every module on each pathname change
  // fires a burst of full RSC requests that compete with the page being navigated to.
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const seen = seenRef.current;
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

    const navHrefs = navigation
      .map((item) => (typeof item.href === "string" ? item.href : null))
      .filter((href): href is string => Boolean(href));

    // Warm sidebar modules when the browser is idle so this never competes with the
    // in-flight navigation. Hover/pointer-down below still prefetches immediately, so
    // switching stays instant.
    const warmNavModules = () => {
      prefetch(portalHome);
      for (const href of navHrefs) {
        prefetch(href);
      }
    };

    const supportsIdle = typeof window.requestIdleCallback === "function";
    const warmHandle = supportsIdle
      ? window.requestIdleCallback(warmNavModules, { timeout: 2000 })
      : window.setTimeout(warmNavModules, 300);

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
    document.addEventListener("focusin", onPointerOver, { capture: true });

    return () => {
      if (supportsIdle) {
        window.cancelIdleCallback(warmHandle);
      } else {
        window.clearTimeout(warmHandle);
      }
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onPointerOver, true);
    };
  }, [navigation, portalHome, router]);

  return null;
}
