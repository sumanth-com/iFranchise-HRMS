import { cn } from "@/lib/utils";
import type { PayrollBreakdownLine } from "@/types/payroll";

type Variant = "payslip" | "dashboard";

const VARIANT_STYLES: Record<
  Variant,
  {
    shell: string;
    header: string;
    headerCell: string;
    row: string;
    rowCell: string;
    label: string;
    amount: string;
    footer: string;
    footerCell: string;
    footerLabel: string;
    footerAmount: string;
  }
> = {
  payslip: {
    shell: "border-neutral-200",
    header: "border-dashed border-neutral-300 bg-neutral-50/80",
    headerCell: "border-neutral-200 text-[10px] text-neutral-600",
    row: "border-dashed border-neutral-200",
    rowCell: "border-neutral-200 text-[13px]",
    label: "text-neutral-700",
    amount: "text-neutral-900",
    footer: "bg-neutral-100/90",
    footerCell: "border-neutral-200 text-[13px]",
    footerLabel: "text-neutral-700",
    footerAmount: "text-neutral-900",
  },
  dashboard: {
    shell: "border-border bg-card",
    header: "border-border bg-slate-50 dark:bg-muted/40",
    headerCell: "border-border text-[11px] text-foreground",
    row: "border-border",
    rowCell: "border-border text-sm",
    label: "font-medium text-foreground",
    amount: "font-semibold text-foreground",
    footer: "bg-slate-50 dark:bg-muted/35",
    footerCell: "border-border text-sm",
    footerLabel: "font-semibold text-foreground",
    footerAmount: "font-semibold text-foreground",
  },
};

export function EarningsDeductionsTable({
  earnings,
  deductions,
  grossSalary,
  totalDeductions,
  money,
  variant = "payslip",
  className,
}: {
  earnings: PayrollBreakdownLine[];
  deductions: PayrollBreakdownLine[];
  grossSalary: number;
  totalDeductions: number;
  money: (value: number) => string;
  variant?: Variant;
  className?: string;
}) {
  const maxRows = Math.max(earnings.length, deductions.length, 1);
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border",
        styles.shell,
        className,
      )}
    >
      <div className={cn("grid grid-cols-2 border-b", styles.header)}>
        <div
          className={cn(
            "grid grid-cols-[1fr_auto] gap-4 border-r px-4 py-2.5 font-semibold uppercase tracking-wide",
            styles.headerCell,
          )}
        >
          <span>Earnings</span>
          <span className="text-right">Amount</span>
        </div>
        <div
          className={cn(
            "grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 font-semibold uppercase tracking-wide",
            styles.headerCell,
          )}
        >
          <span>Deductions</span>
          <span className="text-right">Amount</span>
        </div>
      </div>

      {Array.from({ length: maxRows }).map((_, index) => (
        <div key={`row-${index}`} className={cn("grid grid-cols-2 border-b", styles.row)}>
          <div
            className={cn(
              "grid grid-cols-[1fr_auto] gap-4 border-r px-4 py-2",
              styles.rowCell,
            )}
          >
            <span className={styles.label}>{earnings[index]?.label ?? ""}</span>
            <span className={cn("tabular-nums", styles.amount)}>
              {earnings[index] ? money(earnings[index].amount) : ""}
            </span>
          </div>
          <div className={cn("grid grid-cols-[1fr_auto] gap-4 px-4 py-2", styles.rowCell)}>
            <span className={styles.label}>{deductions[index]?.label ?? ""}</span>
            <span className={cn("tabular-nums", styles.amount)}>
              {deductions[index] ? money(deductions[index].amount) : ""}
            </span>
          </div>
        </div>
      ))}

      <div className={cn("grid grid-cols-2", styles.footer)}>
        <div
          className={cn(
            "grid grid-cols-[1fr_auto] gap-4 border-r px-4 py-2.5 font-semibold",
            styles.footerCell,
          )}
        >
          <span className={styles.footerLabel}>Total Earnings</span>
          <span className={cn("tabular-nums", styles.footerAmount)}>{money(grossSalary)}</span>
        </div>
        <div
          className={cn(
            "grid grid-cols-[1fr_auto] gap-4 px-4 py-2.5 font-semibold",
            styles.footerCell,
          )}
        >
          <span className={styles.footerLabel}>Total Deductions</span>
          <span className={cn("tabular-nums", styles.footerAmount)}>
            {money(totalDeductions)}
          </span>
        </div>
      </div>
    </div>
  );
}
