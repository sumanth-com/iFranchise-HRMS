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
 * Priority routes prefetch immediately; the rest warm on idle.
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

    const navHrefs = navigation
      .map((item) => (typeof item.href === "string" ? item.href : null))
      .filter((href): href is string => Boolean(href));

    // Immediately prefetch all sidebar navigation modules for instant switching
    prefetch(portalHome);
    for (const href of navHrefs) {
      prefetch(href);
    }

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
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onPointerOver, true);
    };
  }, [navigation, pathname, portalHome, router]);

  return null;
}
