"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  generatePayrollRunAction,
  previewPayrollRunAction,
} from "@/lib/payroll/actions";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import {
  formatCurrency,
  formatPayrollMonth,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollPreviewResult } from "@/types/payroll";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";

const monthItems = getMonthSelectItems();
const yearItems = getYearSelectItems();

type PayrollRunFormProps = {
  defaultMonth: number;
  defaultYear: number;
  canRun: boolean;
};

export function PayrollRunForm({
  defaultMonth,
  defaultYear,
  canRun,
}: PayrollRunFormProps) {
  const router = useRouter();
  const [month, setMonth] = useState(String(defaultMonth));
  const [year, setYear] = useState(String(defaultYear));
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<PayrollPreviewResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePreview() {
    startTransition(async () => {
      const result = await previewPayrollRunAction({
        month: Number(month),
        year: Number(year),
        notes: notes || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setPreview(result.data);
      toast.success("Payroll preview generated");
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generatePayrollRunAction({
        month: Number(month),
        year: Number(year),
        notes: notes || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Payroll run created");
      router.push(PAYROLL_ROUTES.detail(result.data));
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm md:grid-cols-3">
        <div className="space-y-2">
          <Label>Month</Label>
          <LabeledSelect
            items={monthItems}
            value={month}
            onValueChange={setMonth}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Year</Label>
          <LabeledSelect
            items={yearItems}
            value={year}
            onValueChange={setYear}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional payroll notes"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePreview} disabled={isPending || !canRun}>
          Preview payroll
        </Button>
        <Button
          variant="default"
          onClick={handleGenerate}
          disabled={isPending || !canRun || !preview}
        >
          Generate payroll
        </Button>
      </div>

      {preview ? (
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">
                Preview — {formatPayrollMonth(preview.month, preview.year)}
              </h2>
              <p className="text-xs text-muted-foreground">
                {preview.employeeCount} employees · Gross{" "}
                {formatCurrency(preview.totalGross)} · Net{" "}
                {formatCurrency(preview.totalNet)}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">Deductions</th>
                  <th className="px-3 py-2">Net</th>
                  <th className="px-3 py-2">LOP Days</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item) => (
                  <tr key={item.employeeId} className="border-b">
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.employeeCode}
                        {!item.hasSalaryStructure ? " · No salary structure" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">{item.departmentName ?? "—"}</td>
                    <td className="px-3 py-2">{formatCurrency(item.grossSalary)}</td>
                    <td className="px-3 py-2">
                      {formatCurrency(item.totalDeductions)}
                    </td>
                    <td className="px-3 py-2">{formatCurrency(item.netSalary)}</td>
                    <td className="px-3 py-2">
                      {item.breakdown.attendance.lopDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
