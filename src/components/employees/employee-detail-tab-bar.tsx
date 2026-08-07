"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  EMPLOYEE_ROUTES,
  EMPLOYEE_TABS,
  EMPLOYEE_TAB_LABELS,
  type EmployeeTab,
} from "@/lib/employees/constants";
import type { EmployeeRouteIdentity } from "@/types/employee";
import { cn } from "@/lib/utils";

function resolveActiveTab(tabParam: string | null): EmployeeTab {
  if (tabParam && EMPLOYEE_TABS.includes(tabParam as EmployeeTab)) {
    return tabParam as EmployeeTab;
  }
  return "overview";
}

export function EmployeeDetailTabBar({
  employee,
  onTabChange,
}: {
  employee: EmployeeRouteIdentity;
  onTabChange?: (tab: EmployeeTab) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = resolveActiveTab(searchParams.get("tab"));

  function setTab(tab: EmployeeTab) {
    onTabChange?.(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${EMPLOYEE_ROUTES.detail(employee)}?${params.toString()}`);
  }

  return (
    <div className="-mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-6 px-1">
        {EMPLOYEE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setTab(tab)}
            className={cn(
              "shrink-0 border-b-2 px-1 py-3 text-sm transition-colors",
              activeTab === tab
                ? "border-teal-700 font-medium text-teal-800 dark:border-teal-500 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {EMPLOYEE_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
    </div>
  );
}
