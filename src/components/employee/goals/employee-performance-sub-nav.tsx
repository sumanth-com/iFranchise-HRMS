"use client";

import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { EMPLOYEE_PERFORMANCE_SUB_NAV } from "@/lib/performance/constants";
import { MyPerformanceSubNav } from "@/components/employee/goals/my-performance-sub-nav";

export function EmployeePerformanceSubNav() {
  return (
    <MyPerformanceSubNav
      items={EMPLOYEE_PERFORMANCE_SUB_NAV}
      rootHref={EMPLOYEE_ROUTES.goals}
    />
  );
}
