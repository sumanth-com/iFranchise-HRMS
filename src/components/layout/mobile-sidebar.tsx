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
import { useNavigation } from "@/hooks/use-permissions";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, setMobileOpen } = useSidebar();
  const { portalHome, portalLabel } = useAuth();
  const navigation = useNavigation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Administration: true,
  });

  function toggleSection(section: string) {
    setOpenSections((current) => ({
      ...current,
      [section]: !(current[section] ?? true),
    }));
  }

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>{portalLabel}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-2">
          {navigation.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== portalHome && pathname.startsWith(item.href));
            const Icon = item.icon;
            const prevSection = index > 0 ? navigation[index - 1]?.section : undefined;
            const showSection = item.section && item.section !== prevSection;
            const sectionOpen = item.section ? (openSections[item.section] ?? true) : true;

            return (
              <div key={item.href}>
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
                  <Link
                    href={item.disabled ? "#" : item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      item.section && "ml-2",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      item.disabled && "pointer-events-none opacity-50",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="px-4 pb-4">
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
