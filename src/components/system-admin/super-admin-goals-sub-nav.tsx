"use client";

import { MyPerformanceSubNav } from "@/components/employee/goals/my-performance-sub-nav";
import { SUPER_ADMIN_GOALS_SUB_NAV, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export function SuperAdminGoalsSubNav() {
  return (
    <MyPerformanceSubNav items={SUPER_ADMIN_GOALS_SUB_NAV} rootHref={SYSTEM_ADMIN_ROUTES.goals} />
  );
}
