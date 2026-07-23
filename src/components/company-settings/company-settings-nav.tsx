"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  COMPANY_SETTINGS_ROUTES,
  COMPANY_SETTINGS_SECTIONS,
  isCompanySettingsSection,
} from "@/lib/company-settings/constants";
import { cn } from "@/lib/utils";

export function CompanySettingsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section") ?? "profile";
  const activeSection = isCompanySettingsSection(sectionParam) ? sectionParam : "profile";

  if (!pathname.startsWith(COMPANY_SETTINGS_ROUTES.base)) return null;

  return (
    <nav
      aria-label="Company settings sections"
      className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm"
    >
      {COMPANY_SETTINGS_SECTIONS.map((section) => {
        const href = COMPANY_SETTINGS_ROUTES.section(section.id);
        const isActive = activeSection === section.id;

        return (
          <Link
            key={section.id}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {section.title}
          </Link>
        );
      })}
    </nav>
  );
}
