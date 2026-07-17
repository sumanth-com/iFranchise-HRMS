import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  getEmployeeLeaveBalanceSnapshot,
  listLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { LeaveListItem } from "@/types/leave";
import { CalendarCheck, CalendarClock, CalendarX } from "lucide-react";

export default async function EmployeeLeavePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "leave.view",
  ]);
  const supabase = await createClient();
  const employeeId = profile.employee.id;

  const [balances, requests] = await Promise.all([
    getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
    listLeaveRequests(supabase, profile, { employeeId, page: 1, pageSize: 25 }),
  ]);

  const totalBalance = balances.reduce((sum, row) => sum + row.balanceDays, 0);
  const pending = requests.data.filter((row) => row.leaveStatus === "pending").length;
  const approved = requests.data.filter((row) => row.leaveStatus === "approved").length;

  const columns: DataTableColumn<LeaveListItem>[] = [
    { key: "leaveTypeName", header: "Leave Type" },
    {
      key: "dates",
      header: "Dates",
      render: (row) => (
        <span className="whitespace-nowrap text-sm">
          {row.startDate === row.endDate
            ? formatLeaveDate(row.startDate)
            : `${formatLeaveDate(row.startDate)} – ${formatLeaveDate(row.endDate)}`}
        </span>
      ),
    },
    { key: "totalDays", header: "Days", render: (row) => String(row.totalDays) },
    {
      key: "leaveStatus",
      header: "Status",
      render: (row) => <LeaveStatusBadge status={row.leaveStatus} />,
    },
    {
      key: "appliedAt",
      header: "Applied",
      render: (row) => formatLeaveDate(row.appliedAt),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Leave</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your leave balances and request history.
            </p>
          </div>
          <Button className="gap-1.5" nativeButton={false} render={<Link href={EMPLOYEE_ROUTES.leave + "/new"} />}>
            <CalendarPlus className="size-4" />
            Apply Leave
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <EmployeeStatCard label="Available Balance" value={`${Math.round(totalBalance * 100) / 100} days`} icon={CalendarCheck} accent="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-500/10" />
          <EmployeeStatCard label="Pending" value={String(pending)} icon={CalendarClock} accent="text-amber-600 dark:text-amber-400" iconBg="bg-amber-500/10" />
          <EmployeeStatCard label="Approved" value={String(approved)} icon={CalendarX} accent="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-500/10" />
        </div>

        {balances.length > 0 ? (
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Leave Balances</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {balances.map((balance) => (
                <div key={balance.leaveTypeCode} className="rounded-lg border bg-muted/20 px-3 py-2">
                  <p className="text-sm font-medium">{balance.leaveTypeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {balance.balanceDays} available · {balance.usedDays} used · {balance.pendingDays} pending
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">My Requests</h2>
          <DataTable
            columns={columns}
            data={requests.data}
            emptyMessage="You haven't submitted any leave requests yet."
          />
        </section>
      </div>
    </div>
  );
}
