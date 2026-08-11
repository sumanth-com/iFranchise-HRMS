"use client";

import { HR_HUB_ROUTES, HR_MY_GOALS_SUB_NAV } from "@/lib/dashboard/hr-hub-routes";
import { MyPerformanceSubNav } from "@/components/employee/goals/my-performance-sub-nav";

export function HrMyGoalsSubNav() {
  return (
    <MyPerformanceSubNav items={HR_MY_GOALS_SUB_NAV} rootHref={HR_HUB_ROUTES.myGoals} />
  );
}
