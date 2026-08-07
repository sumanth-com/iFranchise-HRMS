"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, FileText, FileStack, IndianRupee, Wallet } from "lucide-react";

import { EmployeeDetailPayslipDrawer } from "@/components/employees/employee-detail-payslip-drawer";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { EmployeePayrollData } from "@/types/employee-payroll";
import type { PayrollStatus, PayslipListItem } from "@/types/payroll";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PayrollStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  processed: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  approved: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function StatusPill({ status }: { status: PayrollStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
      )}
    >
      {PAYROLL_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function fmtMonth(value: string) {
  if (!value) return "—";
  try {
    return format(parseISO(value.length === 7 ? `${value}-01` : value), "MMM yyyy");
  } catch {
    return value;
  }
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function money(value: number, currency = "INR") {
  return formatCurrency(value, currency);
}

type EmployeeDetailPayrollSectionProps = {
  data: EmployeePayrollData | null;
};

export function EmployeeDetailPayrollSection({ data }: EmployeeDetailPayrollSectionProps) {
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openPayslip(id: string) {
    setActivePayslipId(id);
    setDrawerOpen(true);
  }

  async function downloadPayslip(row: PayslipListItem) {
    if (!row.canEmployeeAccess) return;
    try {
      const response = await fetch(`/api/payslips/${row.id}/pdf`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `payslip-${row.payslipNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      openPayslip(row.id);
    }
  }

  if (!data || !data.hasAnyData) {
    return (
      <EmptyState
        title="No payroll data"
        description="Salary structure and payslip history will appear here once payroll is configured."
      />
    );
  }

  const currency = data.currencyCode;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EmployeeStatCard
          label="Current net salary"
          value={
            data.kpis.currentNetSalary != null
              ? money(data.kpis.currentNetSalary, currency)
              : "—"
          }
          icon={Wallet}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <EmployeeStatCard
          label="Current gross salary"
          value={
            data.kpis.currentGrossSalary != null
              ? money(data.kpis.currentGrossSalary, currency)
              : "—"
          }
          icon={IndianRupee}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <EmployeeStatCard
          label="YTD net pay"
          value={money(data.ytd.net, currency)}
          icon={Wallet}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
        />
        <EmployeeStatCard
          label="Payslips issued"
          value={String(data.payslips.length)}
          icon={FileStack}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {data.salaryStructure ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          <p className="bg-black px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
            Salary structure
          </p>
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoTile
              label="Effective from"
              value={fmtDate(data.salaryStructure.effectiveFrom)}
            />
            <InfoTile
              label="Gross salary"
              value={money(data.salaryStructure.grossSalary, currency)}
            />
            <InfoTile
              label="Net salary"
              value={money(data.salaryStructure.netSalary, currency)}
            />
            <InfoTile
              label="Basic"
              value={money(data.salaryStructure.basicSalary, currency)}
            />
            <InfoTile
              label="HRA"
              value={money(data.salaryStructure.hraAmount, currency)}
            />
            <InfoTile
              label="Transport"
              value={money(data.salaryStructure.transportAllowance, currency)}
            />
          </div>
        </section>
      ) : null}

      {data.bank ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          <p className="bg-black px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
            Bank account
          </p>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <InfoTile label="Bank" value={data.bank.bankName} />
            <InfoTile label="Account holder" value={data.bank.accountHolderName} />
            <InfoTile label="Account number" value={data.bank.accountNumberMasked} />
            <InfoTile label="IFSC" value={data.bank.ifscCode ?? "—"} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card">
        <p className="bg-black px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
          Payslip history
        </p>
        {data.payslips.length > 0 ? (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Month</th>
                  <th className="pb-2 pr-3 font-medium">Payslip #</th>
                  <th className="pb-2 pr-3 font-medium">Gross</th>
                  <th className="pb-2 pr-3 font-medium">Net</th>
                  <th className="pb-2 pr-3 font-medium">Credit date</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.payslips.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-medium">{fmtMonth(row.payrollMonth)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{row.payslipNumber}</td>
                    <td className="py-3 pr-3 tabular-nums">{money(row.grossSalary, currency)}</td>
                    <td className="py-3 pr-3 tabular-nums font-medium">
                      {money(row.netSalary, currency)}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {fmtDate(row.salaryCreditDate)}
                    </td>
                    <td className="py-3 pr-3">
                      {row.availability === "under_review" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          HR Review
                        </span>
                      ) : (
                        <StatusPill status={row.payrollStatus} />
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!row.canEmployeeAccess}
                          onClick={() => openPayslip(row.id)}
                        >
                          <FileText className="size-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!row.canEmployeeAccess}
                          onClick={() => void downloadPayslip(row)}
                        >
                          <Download className="size-3.5" />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No payslips issued yet.
          </div>
        )}
      </section>

      <EmployeeDetailPayslipDrawer
        payslipId={activePayslipId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/15 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
