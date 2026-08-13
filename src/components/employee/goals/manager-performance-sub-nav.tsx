"use client";

import { MyPerformanceSubNav } from "@/components/employee/goals/my-performance-sub-nav";
import { MANAGER_GOALS_SUB_NAV, MANAGER_ROUTES } from "@/lib/manager/constants";

export function ManagerPerformanceSubNav() {
  return (
    <MyPerformanceSubNav items={MANAGER_GOALS_SUB_NAV} rootHref={MANAGER_ROUTES.goals} />
  );
}
