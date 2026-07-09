"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { COMPANY_SETTINGS_ROUTES, COMPANY_SETTINGS_SECTIONS } from "@/lib/company-settings/constants";
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
            Central configuration for your HRMS
          </p>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {COMPANY_SETTINGS_SECTIONS.map((section) => {
          const href = COMPANY_SETTINGS_ROUTES.section(section.id);
          const isActive = activeSection === section.id;
          return (
            <Link
              key={section.id}
              href={href}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full",
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="block text-sm font-medium">{section.title}</span>
              <span className="hidden text-xs text-muted-foreground lg:mt-0.5 lg:block">
                {section.description}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
