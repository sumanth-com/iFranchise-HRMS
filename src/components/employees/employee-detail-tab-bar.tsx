"use client";

import {
  EMPLOYEE_TABS,
  EMPLOYEE_TAB_LABELS,
  type EmployeeTab,
} from "@/lib/employees/constants";
import { cn } from "@/lib/utils";

export function EmployeeDetailTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: EmployeeTab;
  onTabChange: (tab: EmployeeTab) => void;
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-6 px-1">
        {EMPLOYEE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
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
