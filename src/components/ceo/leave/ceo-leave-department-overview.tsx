"use client";

import { LeavePanel } from "@/components/ceo/leave/ceo-leave-tables";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import type { CeoDepartmentLeaveOverview } from "@/types/ceo-leave";
import { cn } from "@/lib/utils";

function availabilityColor(percent: number) {
  if (percent >= 90) return "bg-emerald-500";
  if (percent >= 80) return "bg-amber-500";
  return "bg-rose-500";
}

export function CeoLeaveDepartmentOverview({
  departments,
}: {
  departments: CeoDepartmentLeaveOverview[];
}) {
  const columns: DataTableColumn<CeoDepartmentLeaveOverview>[] = [
    {
      key: "departmentName",
      header: "Department",
      render: (row) => <span className="font-medium">{row.departmentName}</span>,
    },
    {
      key: "totalEmployees",
      header: "Employees",
      className: "tabular-nums",
      render: (row) => row.totalEmployees,
    },
    {
      key: "employeesOnLeave",
      header: "On Leave",
      className: "tabular-nums",
      render: (row) => row.employeesOnLeave,
    },
    {
      key: "leavePercent",
      header: "Leave %",
      className: "tabular-nums",
      render: (row) => `${row.leavePercent}%`,
    },
    {
      key: "availabilityPercent",
      header: "Availability",
      className: "min-w-[10rem]",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-full max-w-[7rem] overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", availabilityColor(row.availabilityPercent))}
              style={{ width: `${row.availabilityPercent}%` }}
            />
          </div>
          <span className="tabular-nums text-sm text-muted-foreground">
            {row.availabilityPercent}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <LeavePanel
      title="Department Leave Overview"
      description="Availability across departments based on employees currently on leave."
    >
      <DataTable
        columns={columns}
        data={departments}
        emptyMessage="No department data available."
      />
    </LeavePanel>
  );
}
