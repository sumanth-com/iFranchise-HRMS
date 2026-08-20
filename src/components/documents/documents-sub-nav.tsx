"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import { SELF_DOCUMENTS_ROUTES, TEAM_DOCUMENTS_SUB_NAV } from "@/lib/documents/constants";
import { cn } from "@/lib/utils";

export function DocumentsSubNav() {
  const pathname = usePathname();
  const isTeamDocuments =
    pathname === SELF_DOCUMENTS_ROUTES.team ||
    pathname.startsWith(`${SELF_DOCUMENTS_ROUTES.team}/`);

  const activeSection =
    pathname === SELF_DOCUMENTS_ROUTES.team
      ? "overview"
      : pathname.slice(SELF_DOCUMENTS_ROUTES.team.length + 1).split("/")[0] ?? "overview";

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Team documents sections"
      >
        {TEAM_DOCUMENTS_SUB_NAV.map((item) => {
          const isActive =
            isTeamDocuments &&
            (item.section === activeSection ||
              (item.section === "overview" && activeSection === "overview"));

          return (
            <Link
              key={item.section}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
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
