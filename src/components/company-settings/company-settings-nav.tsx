"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  COMPANY_SETTINGS_GROUPS,
  COMPANY_SETTINGS_ROUTES,
  COMPANY_SETTINGS_SECTIONS,
} from "@/lib/company-settings/constants";
import type { CompanySettingsSection } from "@/types/company-settings";

export function CompanySettingsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = (searchParams.get("section") ?? "profile") as CompanySettingsSection;

  if (!pathname.startsWith(COMPANY_SETTINGS_ROUTES.base)) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Company Settings</h1>
          <p className="text-xs text-muted-foreground">
            Organization profile, HR policies, and platform controls in one place
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {COMPANY_SETTINGS_GROUPS.map((group) => {
          const sections = COMPANY_SETTINGS_SECTIONS.filter((s) => s.group === group.id);
          return (
            <div key={group.id} className="space-y-1.5">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <nav className="flex flex-wrap gap-1.5">
                {sections.map((section) => {
                  const href = COMPANY_SETTINGS_ROUTES.section(section.id);
                  const isActive = activeSection === section.id;
                  return (
                    <Link
                      key={section.id}
                      href={href}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {section.title}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>
    </div>
  );
}
