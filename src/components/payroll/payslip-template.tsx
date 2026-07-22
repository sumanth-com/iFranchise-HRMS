import Image from "next/image";
import { format, parseISO } from "date-fns";
import { Landmark, User, Wallet } from "lucide-react";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import { formatPayslipDisplayAddress } from "@/lib/payroll/services/payslip-branding";
import { PAYSLIP_ENGINE_NAME } from "@/lib/payroll/services/payslip-publication";
import {
  formatPayrollMonthLabel,
  formatPayslipCurrency,
} from "@/lib/payroll/services/payroll-utils";
import { EarningsDeductionsTable } from "@/components/payroll/earnings-deductions-table";
import type { PayslipDetail } from "@/types/payroll";

const ACCENT = "#5B21B6";

function fmt(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() ? value : fallback;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.length === 10 ? value : value.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-semibold text-neutral-900">
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-neutral-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-700">
      {children}
    </h2>
  );
}

export function PayslipTemplate({
  payslip,
  className = "",
}: {
  payslip: PayslipDetail;
  className?: string;
}) {
  const money = (value: number) => formatPayslipCurrency(value, payslip.currencyCode);
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim();
  const earnings =
    payslip.breakdown.earnings.length > 0
      ? payslip.breakdown.earnings
      : [
          {
            code: "gross",
            label: "Gross Earnings",
            amount: payslip.grossSalary,
            type: "earning" as const,
          },
        ];
  const displayAddress = formatPayslipDisplayAddress(payslip.organization.addressLines);

  return (
    <article
      id="payslip-print"
      className={`mx-auto w-full max-w-[210mm] bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] print:max-w-none print:shadow-none ${className}`}
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" }}
    >
      <div className="border border-neutral-200 p-8 print:border-0 print:p-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div className="flex min-w-0 items-start gap-4">
            {payslip.organization.logoUrl ? (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <Image
                  src={payslip.organization.logoUrl}
                  alt={`${payslip.organization.name} logo`}
                  fill
                  className="object-contain p-0.5"
                  unoptimized
                />
              </div>
            ) : null}
            <div className="min-w-0 pt-1">
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-950">
                {payslip.organization.name}
              </h1>
              {displayAddress.length > 0 ? (
                <div className="mt-1.5 max-w-[22rem] space-y-0.5 text-[12px] leading-snug text-neutral-500">
                  {displayAddress.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                </div>
              ) : null}
              {payslip.organization.gstNumber || payslip.organization.cin ? (
                <p className="mt-1 text-[11px] text-neutral-400">
                  {[
                    payslip.organization.gstNumber
                      ? `GST: ${payslip.organization.gstNumber}`
                      : null,
                    payslip.organization.cin ? `CIN: ${payslip.organization.cin}` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 border-l border-neutral-200 pl-6 text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Payslip
            </p>
            <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-neutral-950">
              {formatPayrollMonthLabel(payslip.payrollMonth)}
            </p>
            <p className="mt-2 text-[11px] tabular-nums text-neutral-500">
              {payslip.payslipNumber}
            </p>
          </div>
        </header>

        {/* Employee details */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <User className="size-4 text-violet-700" strokeWidth={2} />
            </div>
            <h2 className="text-base font-semibold text-neutral-900">Employee Details</h2>
          </div>
          <div className="grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
            <div className="space-y-3.5">
              <DetailField label="Employee Name" value={employeeName} />
              <DetailField label="Employee ID" value={payslip.employee.employeeCode} />
              <DetailField label="Department" value={fmt(payslip.employee.departmentName)} />
              <DetailField label="Designation" value={fmt(payslip.employee.designationTitle)} />
            </div>
            <div className="space-y-3.5">
              <DetailField label="Date of Joining" value={fmtDate(payslip.employee.dateOfJoining)} />
              <DetailField label="Bank Name" value={fmt(payslip.bankAccount?.bankName)} />
              <DetailField
                label="Bank Account No."
                value={fmt(payslip.bankAccount?.accountNumberMasked)}
              />
              <DetailField label="PAN" value={fmt(payslip.employee.pan)} />
            </div>
          </div>
        </section>

        {/* Salary summary */}
        <section className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <SectionTitle>Salary Summary</SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Gross Salary", value: payslip.grossSalary },
              { label: "Total Earnings", value: payslip.totalEarnings },
              { label: "Total Deductions", value: payslip.totalDeductions },
              { label: "Net Salary", value: payslip.netSalary, highlight: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-md border px-3 py-3 ${
                  item.highlight
                    ? "border-violet-200 bg-white"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  {item.label}
                </p>
                <p
                  className="mt-1 text-[16px] font-semibold tabular-nums tracking-tight"
                  style={item.highlight ? { color: ACCENT } : undefined}
                >
                  {money(item.value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Earnings / Deductions */}
        <section className="mt-8">
          <EarningsDeductionsTable
            earnings={earnings}
            deductions={payslip.breakdown.deductions}
            grossSalary={payslip.grossSalary}
            totalDeductions={payslip.totalDeductions}
            money={money}
          />
        </section>

        {/* Net pay + payment details */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50/90">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <div className="flex flex-1 gap-4 p-5 sm:p-6">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{ backgroundColor: ACCENT }}
              >
                <Wallet className="size-6 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-500">Net Pay</p>
                <p className="mt-0.5 text-[28px] font-bold tabular-nums leading-none tracking-tight text-neutral-900 sm:text-[32px]">
                  {money(payslip.netSalary)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                  {amountToIndianWords(payslip.netSalary)}
                </p>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Credited on {fmtDate(payslip.salaryCreditDate)}
                </p>
              </div>
            </div>

            <div className="h-px bg-neutral-200 lg:h-auto lg:w-px" aria-hidden />

            <div className="flex flex-1 flex-col justify-center gap-4 p-5 sm:p-6">
              <div>
                <p className="text-xs text-neutral-500">Payment Mode</p>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <Landmark className="size-4 shrink-0 text-neutral-400" strokeWidth={1.75} />
                  <p className="min-w-0 truncate text-sm font-semibold text-neutral-900">
                    {payslip.paymentMode}
                    <span className="font-normal text-neutral-400"> · </span>
                    {fmt(payslip.bankAccount?.bankName)}
                    <span className="font-normal text-neutral-400"> · </span>
                    <span className="tabular-nums font-semibold">
                      {fmt(payslip.bankAccount?.accountNumberMasked)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-neutral-500">Salary Credit Date</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-900">
                    {fmtDate(payslip.salaryCreditDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Transaction Reference</p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-900">
                    {fmt(payslip.transactionReference, "Salary Payroll")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-neutral-200 pt-5 text-center">
          <p className="text-[11px] leading-relaxed text-neutral-500">
            {payslip.organization.footerMessage}
          </p>
          <p className="mt-3 text-[10px] text-neutral-400">
            Generated by {PAYSLIP_ENGINE_NAME} · Version {payslip.payslipVersion} ·{" "}
            {format(new Date(), "dd MMM yyyy, HH:mm")}
          </p>
        </footer>
      </div>
    </article>
  );
}
