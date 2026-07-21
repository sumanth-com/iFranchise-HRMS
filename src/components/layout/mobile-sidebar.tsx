"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/common/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
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

export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, setMobileOpen } = useSidebar();
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
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="flex w-64 flex-col p-0">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>{portalLabel}</SheetTitle>
        </SheetHeader>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2">
          {navigation.map((item, index) => {
            const isActive = activeHref === item.href;
            const Icon = item.icon;
            const prevSection = index > 0 ? navigation[index - 1]?.section : undefined;
            const showSection = item.section && item.section !== prevSection;
            const sectionOpen = item.section ? (openSections[item.section] ?? true) : true;

            return (
              <div key={item.href} className="shrink-0">
                {showSection ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(item.section!)}
                    className="mb-2 mt-4 flex w-full items-center justify-between border-t px-3 pt-4 text-left text-sm font-medium text-foreground first:mt-0 first:border-t-0 first:pt-0"
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
