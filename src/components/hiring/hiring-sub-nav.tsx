"use client";

import { useEffect, useTransition } from "react";
import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname, useRouter } from "next/navigation";

import { HIRING_SUB_NAV, RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { remapSubNavItems } from "@/lib/navigation/remap-sub-nav";
import { cn } from "@/lib/utils";

type HiringSubNavProps = {
  basePath?: string;
  items?: ReadonlyArray<{ title: string; href: string }>;
};

function isHiringNavActive(pathname: string, href: string, moduleRoot: string) {
  if (href === moduleRoot) {
    return pathname === href;
  }
  if (href === `${moduleRoot}/onboarding`) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HiringSubNav({
  basePath = RECRUITMENT_ROUTES.dashboard,
  items,
}: HiringSubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const navItems = remapSubNavItems(
    items ?? HIRING_SUB_NAV,
    RECRUITMENT_ROUTES.dashboard,
    basePath,
  );

  // Proactively warm and prefetch all sibling tab routes on mount
  useEffect(() => {
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          for (const item of navItems) {
            try {
              router.prefetch(item.href);
            } catch {
              // ignore
            }
          }
        })
      : setTimeout(() => {
          for (const item of navItems) {
            try {
              router.prefetch(item.href);
            } catch {
              // ignore
            }
          }
        }, 50);

    return () => {
      if (window.cancelIdleCallback && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as NodeJS.Timeout);
      }
    };
  }, [navItems, router]);

  return (
    <div className="flex justify-center">
      <nav className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
        {navItems.map((item) => {
          const isActive = isHiringNavActive(pathname, item.href, basePath);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => {
                try {
                  router.prefetch(item.href);
                } catch {
                  // ignore
                }
              }}
              onPointerDown={() => {
                startTransition(() => {
                  router.prefetch(item.href);
                });
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
