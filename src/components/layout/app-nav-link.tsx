"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  type ComponentProps,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { navigationDestination } from "@/lib/navigation/navigation-destination";
import { createIntentPrefetch } from "@/lib/navigation/intent-prefetch";

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

/** In-app link. Full RSC prefetch runs on pointer/hover, not on first paint. */
export function AppNavLink({
  prefetch = false,
  onMouseEnter,
  onPointerDown,
  href,
  ...props
}: AppNavLinkProps) {
  const router = useRouter();
  const destination = typeof href === "string" ? navigationDestination(href) : href;
  const path = hrefToPath(destination);

  const intent = useMemo(() => createIntentPrefetch((target) => {
    try { router.prefetch(target); } catch { /* Prefetch is best-effort. */ }
  }), [router]);
  useEffect(() => intent.cancel, [intent, path]);

  return (
    <Link
      href={destination}
      prefetch={prefetch}
      {...props}
      data-hrms-intent-prefetch="true"
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        if (path) intent.hover(path);
        props.onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        intent.cancel();
        props.onPointerLeave?.(event);
      }}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        if (path) intent.press(path);
        onPointerDown?.(event);
      }}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        if (path) intent.hover(path);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        intent.cancel();
        props.onMouseLeave?.(event);
      }}
      onTouchStart={(event) => {
        if (path) intent.press(path);
        props.onTouchStart?.(event);
      }}
    />
  );
}
