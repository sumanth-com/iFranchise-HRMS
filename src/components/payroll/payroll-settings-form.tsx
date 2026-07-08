"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { Label } from "@/components/ui/label";
import { savePayrollSettingsAction } from "@/lib/payroll/actions";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  payrollSettingsSchema,
  type PayrollSettingsFormInput,
  type PayrollSettingsFormValues,
} from "@/lib/validations/payroll-settings";
import type { PayrollSettingsRecord, ApprovalWorkflowRole } from "@/types/payroll-settings";

const cycleItems = toSelectItems({
  monthly: "Monthly",
  semi_monthly: "Semi Monthly",
  weekly: "Weekly",
});

const workingDaysItems = toSelectItems({
  calendar_days: "Calendar Days",
  working_days: "Working Days",
  fixed_30: "Fixed 30 Days",
});

const processingDayItems = toSelectItems({
  last_working_day: "Last working day",
  "25": "25th of month",
  "28": "28th of month",
  "1": "1st of next month",
});

const monthItems = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Date(2000, index, 1).toLocaleString("en-IN", { month: "long" }),
}));

const workflowLabels: Record<ApprovalWorkflowRole, string> = {
  hr: "HR",
  finance: "Finance",
  super_admin: "Super Admin",
};

type PayrollSettingsFormProps = {
  record: PayrollSettingsRecord;
  canEdit: boolean;
};

export function PayrollSettingsForm({ record, canEdit }: PayrollSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PayrollSettingsFormInput, unknown, PayrollSettingsFormValues>({
    resolver: zodResolver(payrollSettingsSchema),
    defaultValues: record.settings,
  });

  const workflow = form.watch("approvalWorkflow");

  function onSubmit(values: PayrollSettingsFormValues) {
    startTransition(async () => {
      const result = await savePayrollSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data.settings);
      toast.success("Payroll settings saved");
    });
  }

  function moveWorkflowItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= workflow.length) return;
    const next = [...workflow];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    form.setValue("approvalWorkflow", next, { shouldDirty: true });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-6"
    >
      <SettingsSection title="General Payroll" description="Core payroll cycle and financial defaults.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Payroll cycle">
            <LabeledSelect
              items={cycleItems}
              value={form.watch("payrollCycle")}
              onValueChange={(value) =>
                form.setValue("payrollCycle", value as PayrollSettingsFormValues["payrollCycle"], {
                  shouldDirty: true,
                })
              }
              disabled={!canEdit || isPending}
            />
          </Field>
          <Field label="Payroll processing day">
            <LabeledSelect
              items={processingDayItems}
              value={form.watch("payrollProcessingDay")}
              onValueChange={(value) =>
                form.setValue("payrollProcessingDay", value, { shouldDirty: true })
              }
              disabled={!canEdit || isPending}
            />
          </Field>
          <Field label="Salary credit date">
            <Input
              type="number"
              min={1}
              max={31}
              disabled={!canEdit || isPending}
              {...form.register("salaryCreditDate")}
            />
          </Field>
          <Field label="Financial year start">
            <LabeledSelect
              items={monthItems}
              value={String(form.watch("financialYearStartMonth"))}
              onValueChange={(value) =>
                form.setValue("financialYearStartMonth", Number(value), { shouldDirty: true })
              }
              disabled={!canEdit || isPending}
            />
          </Field>
          <Field label="Financial year end">
            <LabeledSelect
              items={monthItems}
              value={String(form.watch("financialYearEndMonth"))}
              onValueChange={(value) =>
                form.setValue("financialYearEndMonth", Number(value), { shouldDirty: true })
              }
              disabled={!canEdit || isPending}
            />
          </Field>
          <Field label="Currency">
            <Input disabled={!canEdit || isPending} {...form.register("currency")} />
          </Field>
          <Field label="Working days calculation" className="md:col-span-2">
            <LabeledSelect
              items={workingDaysItems}
              value={form.watch("workingDaysCalculation")}
              onValueChange={(value) =>
                form.setValue(
                  "workingDaysCalculation",
                  value as PayrollSettingsFormValues["workingDaysCalculation"],
                  { shouldDirty: true },
                )
              }
              disabled={!canEdit || isPending}
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Attendance Rules" description="Attendance thresholds used during payroll processing.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Minimum working hours">
            <Input type="number" step="0.5" disabled={!canEdit || isPending} {...form.register("attendanceRules.minimumWorkingHours")} />
          </Field>
          <Field label="Half day threshold (hours)">
            <Input type="number" step="0.5" disabled={!canEdit || isPending} {...form.register("attendanceRules.halfDayThreshold")} />
          </Field>
          <Field label="Late mark threshold">
            <Input disabled={!canEdit || isPending} {...form.register("attendanceRules.lateMarkThreshold")} />
          </Field>
          <Toggle label="Overtime calculation" disabled={!canEdit || isPending} {...form.register("attendanceRules.overtimeCalculation")} />
          <Toggle label="Auto calculate attendance" disabled={!canEdit || isPending} {...form.register("attendanceRules.autoCalculateAttendance")} />
          <Toggle label="Ignore weekends" disabled={!canEdit || isPending} {...form.register("attendanceRules.ignoreWeekends")} />
          <Toggle label="Ignore company holidays" disabled={!canEdit || isPending} {...form.register("attendanceRules.ignoreCompanyHolidays")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Leave Integration" description="How leave impacts payroll deductions.">
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Paid leave deduction" disabled={!canEdit || isPending} {...form.register("leaveIntegration.paidLeaveDeduction")} />
          <Toggle label="Loss of Pay deduction" disabled={!canEdit || isPending} {...form.register("leaveIntegration.lossOfPayDeduction")} />
          <Toggle label="Half day deduction" disabled={!canEdit || isPending} {...form.register("leaveIntegration.halfDayDeduction")} />
          <Toggle label="Sandwich leave policy" disabled={!canEdit || isPending} {...form.register("leaveIntegration.sandwichLeavePolicy")} />
          <Toggle label="Include holidays in leave" disabled={!canEdit || isPending} {...form.register("leaveIntegration.includeHolidaysInLeave")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Salary Components" description="Enable or disable components in payroll calculations.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Toggle label="Basic" disabled={!canEdit || isPending} {...form.register("salaryComponents.basic")} />
          <Toggle label="HRA" disabled={!canEdit || isPending} {...form.register("salaryComponents.hra")} />
          <Toggle label="Special Allowance" disabled={!canEdit || isPending} {...form.register("salaryComponents.specialAllowance")} />
          <Toggle label="Medical" disabled={!canEdit || isPending} {...form.register("salaryComponents.medical")} />
          <Toggle label="Travel" disabled={!canEdit || isPending} {...form.register("salaryComponents.travel")} />
          <Toggle label="PF" disabled={!canEdit || isPending} {...form.register("salaryComponents.pf")} />
          <Toggle label="ESI" disabled={!canEdit || isPending} {...form.register("salaryComponents.esi")} />
          <Toggle label="Professional Tax" disabled={!canEdit || isPending} {...form.register("salaryComponents.professionalTax")} />
          <Toggle label="Income Tax" disabled={!canEdit || isPending} {...form.register("salaryComponents.incomeTax")} />
          <Toggle label="Bonus" disabled={!canEdit || isPending} {...form.register("salaryComponents.bonus")} />
          <Toggle label="Reimbursement" disabled={!canEdit || isPending} {...form.register("salaryComponents.reimbursement")} />
          <Toggle label="Other Deduction" disabled={!canEdit || isPending} {...form.register("salaryComponents.otherDeduction")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Approval Workflow" description="Configure payroll approval order.">
        <div className="space-y-3">
          {workflow.map((role, index) => (
            <div
              key={`${role}-${index}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{workflowLabels[role]}</p>
                <p className="text-xs text-muted-foreground">Step {index + 1}</p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={index === 0 || isPending} onClick={() => moveWorkflowItem(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={index === workflow.length - 1 || isPending} onClick={() => moveWorkflowItem(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Payslip Settings" description="Branding and delivery options for employee payslips.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company name"><Input disabled={!canEdit || isPending} {...form.register("payslip.companyName")} /></Field>
          <Field label="Company logo path">
            <Input
              disabled={!canEdit || isPending}
              value={form.watch("payslip.companyLogoPath") ?? ""}
              onChange={(event) =>
                form.setValue("payslip.companyLogoPath", event.target.value || null, {
                  shouldDirty: true,
                })
              }
              placeholder="Optional storage path"
            />
          </Field>
          <Field label="Footer message" className="md:col-span-2"><Input disabled={!canEdit || isPending} {...form.register("payslip.footerMessage")} /></Field>
          <Field label="Authorized signature">
            <Input
              disabled={!canEdit || isPending}
              value={form.watch("payslip.authorizedSignature") ?? ""}
              onChange={(event) =>
                form.setValue("payslip.authorizedSignature", event.target.value || null, {
                  shouldDirty: true,
                })
              }
              placeholder="Optional signature label"
            />
          </Field>
          <Toggle label="Auto email payslips" disabled={!canEdit || isPending} {...form.register("payslip.autoEmailPayslips")} />
          <Toggle label="Generate PDF automatically" disabled={!canEdit || isPending} {...form.register("payslip.generatePdfAutomatically")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications" description="Payroll communication preferences.">
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Notify employee" disabled={!canEdit || isPending} {...form.register("notifications.notifyEmployee")} />
          <Toggle label="Notify finance" disabled={!canEdit || isPending} {...form.register("notifications.notifyFinance")} />
          <Toggle label="Notify HR" disabled={!canEdit || isPending} {...form.register("notifications.notifyHr")} />
          <Toggle label="Email payslip" disabled={!canEdit || isPending} {...form.register("notifications.emailPayslip")} />
          <Toggle label="Reminder before payroll run" disabled={!canEdit || isPending} {...form.register("notifications.reminderBeforePayrollRun")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Payroll Lock" description="Controls for locking payroll after approval.">
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Lock payroll after approval" disabled={!canEdit || isPending} {...form.register("payrollLock.lockAfterApproval")} />
          <Toggle label="Allow reopening" disabled={!canEdit || isPending} {...form.register("payrollLock.allowReopening")} />
          <Toggle label="Require approval before unlocking" disabled={!canEdit || isPending} {...form.register("payrollLock.requireApprovalBeforeUnlock")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Audit" description="Configuration change history.">
        <dl className="grid gap-4 sm:grid-cols-2">
          <AuditItem label="Created by" value={record.audit.createdByName ?? "System"} />
          <AuditItem label="Created date" value={format(new Date(record.audit.createdAt), "MMM d, yyyy h:mm a")} />
          <AuditItem label="Last updated by" value={record.audit.updatedByName ?? "—"} />
          <AuditItem label="Last updated date" value={format(new Date(record.audit.updatedAt), "MMM d, yyyy h:mm a")} />
        </dl>
      </SettingsSection>

      {canEdit ? (
        <StickyPageActions>
          <Button
            type="button"
            variant="outline"
            disabled={!form.formState.isDirty || isPending}
            onClick={() => form.reset(record.settings)}
          >
            Cancel changes
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </StickyPageActions>
      ) : null}
    </form>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  disabled,
  ...props
}: { label: string; disabled?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <input type="checkbox" className="size-4 rounded border-input" disabled={disabled} {...props} />
      <span>{label}</span>
    </label>
  );
}

function AuditItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
