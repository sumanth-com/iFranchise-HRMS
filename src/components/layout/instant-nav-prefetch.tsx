"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { createIntentPrefetch } from "@/lib/navigation/intent-prefetch";

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
 * Prefetch runs on hover or pointer down, not as an idle portal-home request
 * and not as a sidebar burst.
 */
export function InstantNavPrefetch() {
  const router = useRouter();
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

    const intent = createIntentPrefetch(prefetch);
    const onPointerOver = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      // AppNavLink owns its own hover/press handling.
      if (!anchor || anchor.hasAttribute("data-hrms-intent-prefetch")) return;
      const href = anchor.getAttribute("href");
      if (href) intent.hover(href);
    };

    const onPointerOut = (event: PointerEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (anchor && !(event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget))) {
        intent.cancel();
      }
    };

    const onPointerDown = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || anchor.hasAttribute("data-hrms-intent-prefetch")) return;
      const href = anchor.getAttribute("href");
      if (href) intent.press(href);
    };

    document.addEventListener("pointerover", onPointerOver, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", onPointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerout", onPointerOut, { capture: true, passive: true });
    // Intentionally no focusin listener — keyboard focus walked the whole sidebar
    // and prefetched every module as competing RSC requests.

    return () => {
      intent.cancel();
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerout", onPointerOut, true);
    };
  }, [navKey, portalHome, router]);

  return null;
}
