import { format, parseISO } from "date-fns";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listPayslips } from "@/lib/payroll/services/payroll-queries";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import { createClient } from "@/lib/supabase/server";
import type { PayslipListItem } from "@/types/payroll";

function formatMonth(month: string) {
  try {
    return format(parseISO(month.length === 7 ? `${month}-01` : month), "MMMM yyyy");
  } catch {
    return month;
  }
}

export default async function EmployeePayrollPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "payslip.view",
  ]);
  const supabase = await createClient();
  const payslips = await listPayslips(supabase, profile, {
    employeeId: profile.employee.id,
    page: 1,
    pageSize: 24,
  });

  const columns: DataTableColumn<PayslipListItem>[] = [
    { key: "payrollMonth", header: "Month", render: (row) => formatMonth(row.payrollMonth) },
    { key: "payslipNumber", header: "Payslip #" },
    {
      key: "netSalary",
      header: "Net Salary",
      render: (row) => <span className="tabular-nums">{formatCurrencyInr(row.netSalary)}</span>,
    },
    {
      key: "payrollStatus",
      header: "Status",
      render: (row) => (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
          {PAYROLL_STATUS_LABELS[row.payrollStatus] ?? row.payrollStatus}
        </span>
      ),
    },
    {
      key: "issuedAt",
      header: "Issued",
      render: (row) => format(parseISO(row.issuedAt), "dd MMM yyyy"),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Payroll</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your salary payslips and payment history.
          </p>
        </div>
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <DataTable
            columns={columns}
            data={payslips.data}
            emptyMessage="No payslips available yet."
          />
        </section>
      </div>
    </div>
  );
}
