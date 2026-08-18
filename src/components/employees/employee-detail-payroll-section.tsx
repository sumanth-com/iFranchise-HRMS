"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Download, FileText, FileStack, IndianRupee, Wallet } from "lucide-react";

import { EmployeeDetailPayslipDrawer } from "@/components/employees/employee-detail-payslip-drawer";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { Button } from "@/components/common/button";
import { FilterSelect } from "@/components/common/filter-select";
import { getYearSelectItems } from "@/components/payroll/select-utils";
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

function yearFromPayrollMonth(payrollMonth: string): number | null {
  if (!payrollMonth) return null;
  const value = payrollMonth.length === 7 ? `${payrollMonth}-01` : payrollMonth;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
}

function payrollYearItems(selectedYear: number | null) {
  const current = new Date().getFullYear();
  const years = new Set([
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ]);
  if (selectedYear != null) {
    years.add(selectedYear);
  }
  return getYearSelectItems([...years].sort((a, b) => a - b));
}

type EmployeeDetailPayrollSectionProps = {
  data: EmployeePayrollData | null;
};

export function EmployeeDetailPayrollSection({ data }: EmployeeDetailPayrollSectionProps) {
  const searchParams = useSearchParams();
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const yearRaw = Number.parseInt(searchParams.get("year") ?? "", 10);
  const initialYear = yearRaw >= 2000 && yearRaw <= 2100 ? yearRaw : new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  function handleYearChange(year: number) {
    setSelectedYear(year);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "payroll");
    params.set("year", String(year));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

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

  const currency = data?.currencyCode ?? "INR";
  const payslips = data?.payslips ?? [];
  const yearPayslips = payslips.filter((row) => yearFromPayrollMonth(row.payrollMonth) === selectedYear);
  const yearNetPay = yearPayslips.reduce((total, row) => total + row.netSalary, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EmployeeStatCard
          label="Current net salary"
          value={
            data?.kpis.currentNetSalary != null
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
            data?.kpis.currentGrossSalary != null
              ? money(data.kpis.currentGrossSalary, currency)
              : "—"
          }
          icon={IndianRupee}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <EmployeeStatCard
          label="YTD net pay"
          value={money(yearNetPay, currency)}
          icon={Wallet}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
        />
        <EmployeeStatCard
          label="Payslips issued"
          value={String(yearPayslips.length)}
          icon={FileStack}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-3 bg-black px-5 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white">
            Salary structure
          </p>
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-white pl-2 pr-1">
            <span className="shrink-0 text-xs text-muted-foreground">Year</span>
            <FilterSelect
              items={payrollYearItems(selectedYear)}
              value={String(selectedYear)}
              onValueChange={(value) => handleYearChange(Number.parseInt(value, 10))}
              placeholder="Select year"
              className="w-auto"
              triggerClassName="h-7 min-w-[6.5rem] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        {data?.salaryStructure ? (
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
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Salary structure will appear here once payroll is configured.
          </div>
        )}
      </section>

      {data?.bank ? (
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
        {yearPayslips.length > 0 ? (
          <div className="max-h-[min(28rem,calc(100dvh-22rem))] overflow-auto p-4">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="sticky top-0 z-10 bg-card">
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
                {yearPayslips.map((row) => (
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
            No payslips issued for {selectedYear}. Payslips will appear here once payroll is processed.
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
