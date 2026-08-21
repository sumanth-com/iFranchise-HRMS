"use client";

import { ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { resolveActiveNavHref } from "@/lib/layout/sidebar-active";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isCollapsed,
    startNavigation,
    toggleSection,
    isSectionOpen,
    sectionsReady,
    ensureSectionOpenIfUnset,
  } = useSidebar();
  const { navigation, portalHome } = useSidebarNavigation();

  const activeHref = resolveActiveNavHref(
    pathname,
    searchParams,
    portalHome,
    navigation,
  );

  useEffect(() => {
    if (!sectionsReady || !activeHref) return;
    const activeItem = navigation.find((item) => item.href === activeHref);
    if (activeItem?.section) {
      ensureSectionOpenIfUnset(activeItem.section);
    }
  }, [activeHref, ensureSectionOpenIfUnset, navigation, sectionsReady]);

  return (
    <aside
      className={cn(
        "app-shell-sidebar hidden h-full shrink-0 flex-col border-r bg-transparent text-sidebar-foreground transition-[width] duration-200 md:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b px-4",
          isCollapsed && "justify-center px-2",
        )}
      >
        <SidebarBrand
          href={portalHome}
          collapsed={isCollapsed}
          onNavigate={() => {
            if (pathname !== portalHome) startNavigation(portalHome);
          }}
        />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2">
        {navigation.map((item, index) => {
          if (typeof item.href !== "string" || item.href.length === 0) return null;
          const isActive = activeHref === item.href;
          const Icon = item.icon;
          const prevSection = index > 0 ? navigation[index - 1]?.section : undefined;
          const showSection = item.section && item.section !== prevSection && !isCollapsed;
          const sectionOpen = item.section ? isSectionOpen(item.section) : true;

          return (
            <div key={`${item.section ?? ""}-${item.href}`} className="shrink-0">
              {showSection ? (
                <button
                  type="button"
                  onClick={() => toggleSection(item.section!)}
                  className="mb-2 mt-4 flex w-full items-center justify-between border-t px-3 pt-4 text-left text-[15px] font-semibold text-sidebar-foreground first:mt-0 first:border-t-0 first:pt-0 dark:text-white"
                  aria-expanded={sectionOpen}
                >
                  <span>{item.section}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform dark:text-white/70",
                      sectionOpen && "rotate-180",
                    )}
                  />
                </button>
              ) : null}
              {sectionOpen || isCollapsed ? (
                <SidebarNavLink
                  href={item.href}
                  title={item.title}
                  active={isActive}
                  disabled={item.disabled}
                  collapsed={isCollapsed}
                  indented={Boolean(item.section) && !isCollapsed}
                  icon={Icon}
                />
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
