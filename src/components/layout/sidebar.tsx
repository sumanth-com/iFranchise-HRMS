"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SidebarNavIcon } from "@/components/layout/sidebar-nav-icon";
import { useNavigation } from "@/hooks/use-permissions";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

function resolveActiveHref(
  pathname: string,
  portalHome: string,
  hrefs: string[],
): string | null {
  const matches = hrefs.filter(
    (href) =>
      pathname === href || (href !== portalHome && pathname.startsWith(href)),
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { portalHome, portalLabel } = useAuth();
  const navigation = useNavigation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Self-service": true,
    Administration: true,
  });

  const activeHref = resolveActiveHref(
    pathname,
    portalHome,
    navigation.map((item) => item.href),
  );

  function toggleSection(section: string) {
    setOpenSections((current) => ({
      ...current,
      [section]: !(current[section] ?? true),
    }));
  }

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b px-4",
          isCollapsed && "justify-center px-2",
        )}
      >
        <Link href={portalHome} className="group/brand flex items-center gap-2 font-semibold">
          <span className="sidebar-brand-mark flex size-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground">
            IF
          </span>
          {!isCollapsed ? (
            <span className="truncate text-sm">{portalLabel}</span>
          ) : null}
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2">
        {navigation.map((item, index) => {
          const isActive = activeHref === item.href;
          const Icon = item.icon;
          const prevSection = index > 0 ? navigation[index - 1]?.section : undefined;
          const showSection = item.section && item.section !== prevSection && !isCollapsed;
          const sectionOpen = item.section ? (openSections[item.section] ?? true) : true;

          return (
            <div key={item.href} className="shrink-0">
              {showSection ? (
                <button
                  type="button"
                  onClick={() => toggleSection(item.section!)}
                  className="mb-2 mt-4 flex w-full items-center justify-between border-t px-3 pt-4 text-left text-sm font-medium text-sidebar-foreground first:mt-0 first:border-t-0 first:pt-0"
                >
                  <span>{item.section}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      sectionOpen && "rotate-180",
                    )}
                  />
                </button>
              ) : null}
              {sectionOpen || isCollapsed ? (
                <Link
                  href={item.disabled ? "#" : item.href}
                  aria-disabled={item.disabled}
                  title={isCollapsed ? item.title : undefined}
                  className={cn(
                    "group/nav flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    item.section && !isCollapsed && "ml-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    item.disabled && "pointer-events-none opacity-50",
                    isCollapsed && "justify-center px-2",
                  )}
                >
                  <SidebarNavIcon icon={Icon} active={isActive} />
                  {!isCollapsed ? <span className="truncate">{item.title}</span> : null}
                </Link>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
