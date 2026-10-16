"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { Button, POLICY_HEADER_BUTTON_CLASS } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DesignationCombobox } from "@/components/performance/designation-combobox";
import {
  cancelEmploymentConfirmationDraftAction,
  confirmEmploymentToFullTimeAction,
  fetchEmploymentConfirmationDetailAction,
  fetchProbationCandidatesAction,
  saveEmploymentConfirmationDraftAction,
} from "@/lib/employees/actions/employment-confirmation-actions";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type {
  EmploymentConfirmationDetail,
  ProbationCandidate,
  ProbationCandidateStatus,
} from "@/types/employment-confirmation";
import type { LookupOption } from "@/types/employee";

const STATUS_LABELS: Record<ProbationCandidateStatus, string> = {
  approaching: "Approaching",
  due: "Due",
  overdue: "Overdue",
  pending_review: "Pending review",
  confirmed: "Confirmed",
};

function statusClassName(status: ProbationCandidateStatus): string {
  if (status === "overdue") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  if (status === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "pending_review") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-blue-200 bg-blue-50 text-blue-900";
}

type Props = {
  candidates: ProbationCandidate[];
  designations: LookupOption[];
  canManage: boolean;
  /** When embedded under Team Payroll, hide the page-level heading. */
  compactHeader?: boolean;
  policyHref?: string;
};

type FormState = {
  employeeId: string;
  confirmationId?: string;
  newDesignationId: string;
  newDesignationTitle: string;
  newGrossSalary: string;
  effectiveDate: string;
  probationEndDate: string;
  dateOfJoining: string | null;
  notes: string;
  employeeName: string;
  currentGrossSalary: number | null;
  currencyCode: string;
  currentDesignationTitle: string | null;
  readOnly: boolean;
};

function candidateToForm(
  candidate: ProbationCandidate,
  designations: LookupOption[],
): FormState {
  const designationId =
    candidate.proposedDesignationId ?? candidate.designationId ?? "";
  const designationTitle =
    candidate.proposedDesignationTitle ??
    designations.find((row) => row.id === designationId)?.label ??
    candidate.designationTitle ??
    "";

  return {
    employeeId: candidate.employeeId,
    confirmationId: candidate.confirmationId ?? undefined,
    newDesignationId: designationId,
    newDesignationTitle: designationTitle,
    newGrossSalary: String(
      candidate.proposedGrossSalary ?? candidate.currentGrossSalary ?? "",
    ),
    effectiveDate:
      candidate.proposedEffectiveDate ??
      candidate.probationEndDate ??
      candidate.fullTimeEffectiveDate ??
      "",
    probationEndDate: candidate.probationEndDate ?? "",
    dateOfJoining: candidate.dateOfJoining,
    notes: "",
    employeeName: `${candidate.employeeName} (${candidate.employeeCode})`,
    currentGrossSalary: candidate.currentGrossSalary,
    currencyCode: candidate.currencyCode,
    currentDesignationTitle: candidate.designationTitle,
    readOnly: candidate.candidateStatus === "confirmed",
  };
}

export function ProbationConfirmationView({
  candidates: initialCandidates,
  designations: initialDesignations,
  canManage,
  compactHeader = false,
  policyHref,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const submitLockRef = useRef(false);
  const [rows, setRows] = useState(initialCandidates);
  const [designations, setDesignations] = useState(initialDesignations);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [detail, setDetail] = useState<EmploymentConfirmationDetail | null>(null);
  const [activeMode, setActiveMode] = useState<"draft" | "confirm" | "cancel" | null>(
    null,
  );

  useEffect(() => {
    setRows(initialCandidates);
  }, [initialCandidates]);

  useEffect(() => {
    setDesignations(initialDesignations);
  }, [initialDesignations]);

  const employeeOptions = useMemo(
    () =>
      rows.map((row) => ({
        value: row.employeeId,
        label: `${row.employeeName} (${row.employeeCode})`,
      })),
    [rows],
  );

  const visibleRows = useMemo(() => {
    if (!selectedEmployeeId) return rows;
    return rows.filter((row) => row.employeeId === selectedEmployeeId);
  }, [rows, selectedEmployeeId]);

  function openCandidate(candidate: ProbationCandidate) {
    setSelectedEmployeeId(candidate.employeeId);
    setForm(candidateToForm(candidate, designations));
    setDetail(null);
    if (candidate.confirmationId) {
      startTransition(async () => {
        const result = await fetchEmploymentConfirmationDetailAction(
          candidate.confirmationId!,
        );
        if (result.success) setDetail(result.data);
      });
    }
  }

  function closeDialog() {
    setForm(null);
    setDetail(null);
    setActiveMode(null);
  }

  async function refreshCandidatesLocally() {
    const result = await fetchProbationCandidatesAction();
    if (result.success) {
      setRows(result.data);
      return result.data;
    }
    return null;
  }

  function runAction(mode: "draft" | "confirm" | "cancel") {
    if (!form || submitLockRef.current || isPending) return;
    submitLockRef.current = true;
    setActiveMode(mode);

    startTransition(async () => {
      try {
        if (mode === "cancel") {
          if (!form.confirmationId) {
            toast.error("No draft to cancel");
            return;
          }
          const result = await cancelEmploymentConfirmationDraftAction(
            form.confirmationId,
          );
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Draft cancelled");
          closeDialog();
          await refreshCandidatesLocally();
          return;
        }

        const designationTitle = form.newDesignationTitle.trim();
        const payload = {
          employeeId: form.employeeId,
          confirmationId: form.confirmationId,
          newDesignationId: form.newDesignationId || null,
          newDesignationTitle: designationTitle || null,
          newGrossSalary: Number(form.newGrossSalary),
          effectiveDate: form.effectiveDate,
          probationEndDate: form.probationEndDate || null,
          notes: form.notes || null,
        };

        if (!payload.newDesignationId && !designationTitle) {
          toast.error("Enter or select a full-time designation");
          return;
        }
        if (!(payload.newGrossSalary > 0)) {
          toast.error("Enter a valid proposed salary");
          return;
        }
        if (!payload.effectiveDate) {
          toast.error("Enter the effective date");
          return;
        }
        if (form.dateOfJoining && payload.effectiveDate < form.dateOfJoining) {
          toast.error("Effective date cannot be before the joining date");
          return;
        }

        if (mode === "draft") {
          const result = await saveEmploymentConfirmationDraftAction(payload);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Confirmation draft saved");
          if (designationTitle && !form.newDesignationId) {
            setDesignations((prev) =>
              prev.some(
                (row) =>
                  row.label.trim().toLowerCase() === designationTitle.toLowerCase(),
              )
                ? prev
                : [...prev, { id: `pending:${designationTitle}`, label: designationTitle }],
            );
          }
          closeDialog();
          await refreshCandidatesLocally();
          return;
        }

        const result = await confirmEmploymentToFullTimeAction(payload);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Employee confirmed to full-time");
        if (designationTitle) {
          setDesignations((prev) =>
            prev.some(
              (row) =>
                row.label.trim().toLowerCase() === designationTitle.toLowerCase(),
            )
              ? prev
              : [...prev, { id: `new:${designationTitle}`, label: designationTitle }],
          );
        }

        // Optimistic local update for the confirmed employee, then soft-refresh list.
        setRows((prev) =>
          prev.map((row) =>
            row.employeeId === form.employeeId
              ? {
                  ...row,
                  candidateStatus: "confirmed",
                  confirmationStatus: "confirmed",
                  confirmationId: result.data.confirmationId,
                  proposedDesignationTitle: designationTitle || row.proposedDesignationTitle,
                  proposedGrossSalary: payload.newGrossSalary,
                  proposedEffectiveDate: payload.effectiveDate,
                  designationTitle: designationTitle || row.designationTitle,
                  currentGrossSalary: payload.newGrossSalary,
                }
              : row,
          ),
        );
        closeDialog();
        void refreshCandidatesLocally();
      } finally {
        submitLockRef.current = false;
        setActiveMode(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {!compactHeader ? (
        <h1 className="text-2xl font-semibold tracking-tight">
          Probation & Confirmation
        </h1>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="probation-employee" className="sr-only">
            Employee
          </Label>
          <SearchableSelect
            options={employeeOptions}
            value={selectedEmployeeId}
            onValueChange={(value) => {
              setSelectedEmployeeId(value);
              if (!value) return;
              const candidate = rows.find((row) => row.employeeId === value);
              if (candidate) openCandidate(candidate);
            }}
            placeholder="Select employee to review"
            allowNone
            noneLabel="All employees"
            emptyMessage="No probation employees"
          />
        </div>
        {policyHref ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("shrink-0 gap-1.5 self-start sm:self-auto", POLICY_HEADER_BUTTON_CLASS)}
            nativeButton={false}
            render={<Link href={policyHref} />}
          >
            <FileText className="size-4" />
            Payroll Policy
          </Button>
        ) : null}
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          title="No probation candidates"
          description="Employees on probation who are approaching or past their probation end date will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Probation end</th>
                  <th className="px-4 py-3 font-medium">Current salary</th>
                  <th className="px-4 py-3 font-medium">Proposed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.employeeId} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.employeeCode}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.designationTitle ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div>{row.probationEndDate ?? "—"}</div>
                      {row.daysUntilProbationEnd != null ? (
                        <div className="text-xs text-muted-foreground">
                          {row.daysUntilProbationEnd < 0
                            ? `${Math.abs(row.daysUntilProbationEnd)} day(s) overdue`
                            : row.daysUntilProbationEnd === 0
                              ? "Due today"
                              : `${row.daysUntilProbationEnd} day(s) left`}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.currentGrossSalary != null
                        ? formatCurrency(row.currentGrossSalary, row.currencyCode)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.proposedDesignationTitle ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.proposedGrossSalary != null
                          ? formatCurrency(row.proposedGrossSalary, row.currencyCode)
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          statusClassName(row.candidateStatus),
                        )}
                      >
                        {STATUS_LABELS[row.candidateStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openCandidate(row)}
                      >
                        {row.candidateStatus === "confirmed" ? "View" : "Review"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {form ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {form.readOnly ? "Confirmation record" : "Review confirmation"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="font-medium">{form.employeeName}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    <span>Joining date: {form.dateOfJoining ?? "—"}</span>
                    <span>Probation end: {form.probationEndDate || "—"}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Current designation: {form.currentDesignationTitle ?? "—"}
                  </div>
                  <div className="text-muted-foreground">
                    Current salary:{" "}
                    {form.currentGrossSalary != null
                      ? formatCurrency(form.currentGrossSalary, form.currencyCode)
                      : "—"}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full-time designation</Label>
                    <DesignationCombobox
                      designations={designations}
                      valueId={form.newDesignationId}
                      valueLabel={form.newDesignationTitle}
                      disabled={form.readOnly || !canManage || isPending}
                      onChange={({ id, label }) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                newDesignationId: id,
                                newDesignationTitle: label,
                              }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proposed-salary">Proposed monthly salary</Label>
                    <Input
                      id="proposed-salary"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.newGrossSalary}
                      disabled={form.readOnly || !canManage || isPending}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, newGrossSalary: event.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="effective-date">Effective date</Label>
                    <Input
                      id="effective-date"
                      type="date"
                      value={form.effectiveDate}
                      disabled={form.readOnly || !canManage || isPending}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, effectiveDate: event.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probation-end">Probation end date</Label>
                    <Input
                      id="probation-end"
                      type="date"
                      value={form.probationEndDate}
                      disabled={form.readOnly || !canManage || isPending}
                      onChange={(event) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, probationEndDate: event.target.value }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation-notes">Notes</Label>
                  <Input
                    id="confirmation-notes"
                    value={form.notes}
                    disabled={form.readOnly || !canManage || isPending}
                    onChange={(event) =>
                      setForm((prev) =>
                        prev ? { ...prev, notes: event.target.value } : prev,
                      )
                    }
                    placeholder="Optional notes"
                  />
                </div>

                {detail?.events?.length ? (
                  <div className="space-y-2">
                    <Label>Audit history</Label>
                    <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3 text-xs">
                      {detail.events.map((event) => (
                        <li key={event.id} className="border-b pb-2 last:border-0 last:pb-0">
                          <div className="font-medium capitalize">
                            {event.eventType.replaceAll("_", " ")}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
                  Close
                </Button>
                {canManage && !form.readOnly ? (
                  <>
                    {form.confirmationId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => runAction("cancel")}
                      >
                        {activeMode === "cancel" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Cancel draft
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => runAction("draft")}
                    >
                      {activeMode === "draft" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Save draft
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction("confirm")}
                    >
                      {activeMode === "confirm" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Confirm full-time
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
