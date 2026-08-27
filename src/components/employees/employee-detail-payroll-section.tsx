"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Download, FileText, FileStack, IndianRupee, Wallet } from "lucide-react";

import { EmployeeDetailPayslipDrawer } from "@/components/employees/employee-detail-payslip-drawer";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { Button } from "@/components/common/button";
import { FilterSelect } from "@/components/common/filter-select";
import { SECTION_HEADING_ROW_CLASS } from "@/components/common/table-header-classes";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
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

function monthFromPayrollMonth(payrollMonth: string): number | null {
  if (!payrollMonth) return null;
  const value = payrollMonth.length === 7 ? `${payrollMonth}-01` : payrollMonth;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCMonth() + 1;
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

const PAYROLL_MONTH_ITEMS = [
  { value: "all", label: "All months" },
  ...getMonthSelectItems(),
];

type EmployeeDetailPayrollSectionProps = {
  data: EmployeePayrollData | null;
};

export function EmployeeDetailPayrollSection({ data }: EmployeeDetailPayrollSectionProps) {
  const searchParams = useSearchParams();
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const yearRaw = Number.parseInt(searchParams.get("year") ?? "", 10);
  const monthRaw = Number.parseInt(searchParams.get("month") ?? "", 10);
  const initialYear = yearRaw >= 2000 && yearRaw <= 2100 ? yearRaw : new Date().getFullYear();
  const initialMonth =
    monthRaw >= 1 && monthRaw <= 12 ? monthRaw : new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(
    searchParams.has("month") ? initialMonth : "all",
  );

  function syncPeriodUrl(next: { month: number | "all"; year: number }) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "payroll");
    params.set("year", String(next.year));
    if (next.month === "all") params.delete("month");
    else params.set("month", String(next.month));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function handleYearChange(year: number) {
    setSelectedYear(year);
    syncPeriodUrl({ month: selectedMonth, year });
  }

  function handleMonthChange(month: number | "all") {
    setSelectedMonth(month);
    syncPeriodUrl({ month, year: selectedYear });
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
  const yearPayslips = payslips.filter(
    (row) => yearFromPayrollMonth(row.payrollMonth) === selectedYear,
  );
  const filteredPayslips =
    selectedMonth === "all"
      ? yearPayslips
      : yearPayslips.filter(
          (row) => monthFromPayrollMonth(row.payrollMonth) === selectedMonth,
        );
  const yearNetPay = yearPayslips.reduce((total, row) => total + row.netSalary, 0);
  const periodLabel =
    selectedMonth === "all"
      ? String(selectedYear)
      : format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
          value={String(filteredPayslips.length)}
          icon={FileStack}
          accent="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-500/10"
        />
        <div className="flex items-center justify-center rounded-xl border-0 bg-card p-3">
          <div className="flex w-full flex-col gap-2">
            <div className="grid h-9 grid-cols-[3rem_1fr] items-center rounded-lg border bg-muted/30 px-3">
              <span className="text-xs font-medium text-muted-foreground">Month</span>
              <FilterSelect
                items={PAYROLL_MONTH_ITEMS}
                value={selectedMonth === "all" ? "all" : String(selectedMonth)}
                onValueChange={(value) =>
                  handleMonthChange(
                    value === "all" ? "all" : Number.parseInt(value, 10),
                  )
                }
                placeholder="Select"
                className="w-full"
                triggerClassName="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="grid h-9 grid-cols-[3rem_1fr] items-center rounded-lg border bg-muted/30 px-3">
              <span className="text-xs font-medium text-muted-foreground">Year</span>
              <FilterSelect
                items={payrollYearItems(selectedYear)}
                value={String(selectedYear)}
                onValueChange={(value) => handleYearChange(Number.parseInt(value, 10))}
                placeholder="Select"
                className="w-full"
                triggerClassName="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border-0 bg-card">
        <p className={SECTION_HEADING_ROW_CLASS}>
          Salary structure
        </p>
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
        <section className="overflow-hidden rounded-xl border-0 bg-card">
          <p className={SECTION_HEADING_ROW_CLASS}>
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

      <section className="overflow-hidden rounded-xl border-0 bg-card">
        <p className={SECTION_HEADING_ROW_CLASS}>
          Payslip history
        </p>
        {filteredPayslips.length > 0 ? (
          <div className="max-h-[min(28rem,calc(100dvh-22rem))] overflow-auto p-4">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
                <tr className="border-white/10 bg-transparent hover:bg-white/5">
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Month</th>
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Payslip #</th>
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Gross</th>
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Net</th>
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Credit date</th>
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                  <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 text-right align-middle text-xs font-semibold uppercase tracking-wide text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayslips.map((row) => (
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
                        <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
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
            No payslips issued for {periodLabel}. Payslips will appear here once payroll is
            processed.
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
