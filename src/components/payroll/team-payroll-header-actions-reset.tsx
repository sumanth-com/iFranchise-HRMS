"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { SELF_PAYROLL_ROUTES, TEAM_PAYROLL_SECTIONS } from "@/lib/payroll/constants";

import { useOptionalTeamPayrollHeaderActions } from "./team-payroll-header-actions";

const HEADER_CTA_PATHS = new Set([
  `${SELF_PAYROLL_ROUTES.team}/${TEAM_PAYROLL_SECTIONS["salary-structures"]}`,
  `${SELF_PAYROLL_ROUTES.team}/${TEAM_PAYROLL_SECTIONS.bonuses}`,
  `${SELF_PAYROLL_ROUTES.team}/${TEAM_PAYROLL_SECTIONS.reimbursements}`,
]);

/** Clears tab-specific header CTAs when navigating away from tabs that set them. */
export function TeamPayrollHeaderActionsReset() {
  const pathname = usePathname();
  const context = useOptionalTeamPayrollHeaderActions();
  const setHeaderActions = context?.setHeaderActions;

  useEffect(() => {
    if (!setHeaderActions) return;
    if (!HEADER_CTA_PATHS.has(pathname)) {
      setHeaderActions(null);
    }
  }, [pathname, setHeaderActions]);

  return null;
}
