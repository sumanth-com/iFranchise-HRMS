"use client";

import { ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/common/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OrganizationBrandTitle } from "@/components/layout/sidebar-brand";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { resolveActiveNavHref } from "@/lib/layout/sidebar-active";
import { cn } from "@/lib/utils";

export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isMobileOpen,
    setMobileOpen,
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
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="flex w-64 flex-col p-0">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle><OrganizationBrandTitle /></SheetTitle>
        </SheetHeader>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2">
          {navigation.map((item, index) => {
            const isActive = activeHref === item.href;
            const Icon = item.icon;
            const prevSection = index > 0 ? navigation[index - 1]?.section : undefined;
            const showSection = item.section && item.section !== prevSection;
            const sectionOpen = item.section ? isSectionOpen(item.section) : true;

            return (
              <div key={`${item.section ?? ""}-${item.href}`} className="shrink-0">
                {showSection ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(item.section!)}
                    className="mb-2 mt-4 flex w-full items-center justify-between border-t px-3 pt-4 text-left text-sm font-medium text-foreground first:mt-0 first:border-t-0 first:pt-0"
                    aria-expanded={sectionOpen}
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
                {sectionOpen ? (
                  <SidebarNavLink
                    href={item.href}
                    title={item.title}
                    active={isActive}
                    disabled={item.disabled}
                    indented={Boolean(item.section)}
                    icon={Icon}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="shrink-0 border-t px-4 py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setMobileOpen(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
