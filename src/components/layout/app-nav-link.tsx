"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type MouseEvent,
  type FocusEvent,
} from "react";

type AppNavLinkProps = ComponentProps<typeof Link>;

function hrefToPath(href: AppNavLinkProps["href"]): string | null {
  if (typeof href === "string") {
    if (!href.startsWith("/") || href.startsWith("//")) return null;
    return href.split("#")[0] ?? href;
  }
  if (href && typeof href === "object" && "pathname" in href && href.pathname) {
    const search = href.search ?? "";
    return `${href.pathname}${search}`;
  }
  return null;
}

/** In-app link that fully prefetches dynamic RSC payloads (Next 15 default is partial). */
export function AppNavLink({
  prefetch = true,
  onMouseEnter,
  onFocus,
  href,
  ...props
}: AppNavLinkProps) {
  const router = useRouter();
  const path = hrefToPath(href);

  function prefetchRoute() {
    if (!path) return;
    try {
      router.prefetch(path);
    } catch {
      // Prefetch is best-effort.
    }
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      {...props}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        prefetchRoute();
        onMouseEnter?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        prefetchRoute();
        onFocus?.(event);
      }}
    />
  );
}
