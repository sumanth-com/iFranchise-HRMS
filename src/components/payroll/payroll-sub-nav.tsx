"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import {
  parseTeamPayrollSection,
  PAYROLL_SUB_NAV,
  SELF_PAYROLL_ROUTES,
  TEAM_PAYROLL_SECTIONS,
  teamPayrollSectionTitleForPortal,
  usesTeamPayrollRunLabel,
  type TeamPayrollSection,
} from "@/lib/payroll/constants";
import { cn } from "@/lib/utils";

type PayrollSubNavProps = {
  basePath?: string;
  hiddenSections?: TeamPayrollSection[];
  /**
   * Settings is Super Admin / System Admin only. Opt-in from the server page
   * after canAccessPayrollSettings — never default-show for HR/CEO layouts.
   */
  showSettings?: boolean;
  /** Probation & Confirmation for HR / CEO (hidden for Accountant by default). */
  showProbation?: boolean;
};

export function PayrollSubNav({
  basePath = SELF_PAYROLL_ROUTES.team,
  hiddenSections = [],
  showSettings = false,
  showProbation = true,
}: PayrollSubNavProps) {
  const pathname = usePathname();
  const useTeamPayrollLabel = usesTeamPayrollRunLabel(basePath);
  const isTeamPayroll = pathname === basePath || pathname.startsWith(`${basePath}/`);
  const activeSection = isTeamPayroll
    ? pathname === basePath
      ? TEAM_PAYROLL_SECTIONS.run
      : parseTeamPayrollSection(pathname.slice(basePath.length + 1).split("/")[0])
    : TEAM_PAYROLL_SECTIONS.run;
  const items = PAYROLL_SUB_NAV.filter((item) => {
    const section = item.section as TeamPayrollSection;
    if (hiddenSections.includes(section)) return false;
    if (section === TEAM_PAYROLL_SECTIONS.settings && !showSettings) return false;
    if (section === TEAM_PAYROLL_SECTIONS.probation && !showProbation) return false;
    return true;
  });

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Team payroll sections"
      >
        {items.map((item) => {
          const href = `${basePath}/${item.section}`;
          const isActive = isTeamPayroll && item.section === activeSection;

          return (
            <Link
              key={item.section}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.section === TEAM_PAYROLL_SECTIONS.run
                ? teamPayrollSectionTitleForPortal(item.section, {
                    teamPayrollLabel: useTeamPayrollLabel,
                  })
                : item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
