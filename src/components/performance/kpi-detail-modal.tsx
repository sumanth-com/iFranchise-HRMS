"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { KpiProgressFields } from "@/components/performance/kpi-progress-fields";
import { KpiRowStatusBadge } from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
} from "@/components/performance/performance-ui-primitives";
import { updateMyKpiProgressAction } from "@/lib/employee/actions/employee-performance-actions";
import {
  KPI_MEASUREMENT_LABELS,
  KPI_PERIOD_LABELS,
} from "@/lib/performance/constants";
import {
  calculateKpiCompletion,
  deriveKpiStatus,
  formatKpiProgress,
  formatKpiTarget,
} from "@/lib/performance/services/performance-utils";
import { applyKpiProgressToListItem } from "@/lib/performance/kpi-update-options";
import { kpiProgressSchema } from "@/lib/validations/performance";
import type { KpiListItem } from "@/types/performance";

type Props = {
  record: KpiListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "default" | "employee";
  employeeDialogMode?: "view" | "update";
  onUpdated?: (record: KpiListItem) => void;
};

export function KpiDetailModal({
  record,
  open,
  onOpenChange,
  variant = "default",
  employeeDialogMode = "view",
  onUpdated,
}: Props) {
  const [displayRecord, setDisplayRecord] = useState<KpiListItem | null>(record);
  const [isPending, startTransition] = useTransition();
  const isEmployeeUpdate =
    variant === "employee" &&
    employeeDialogMode === "update" &&
    displayRecord != null &&
    displayRecord.kpiStatus !== "completed";

  const form = useForm<z.input<typeof kpiProgressSchema>>({
    resolver: zodResolver(kpiProgressSchema),
    defaultValues: {
      kpiId: "",
      currentValue: 0,
      progressComments: "",
      evidenceNotes: "",
    },
  });

  useEffect(() => {
    setDisplayRecord(record);
    if (!record) return;
    form.reset({
      kpiId: record.id,
      currentValue: record.currentValue,
      progressComments: record.progressComments ?? "",
      evidenceNotes: record.evidenceNotes ?? "",
    });
  }, [record, form]);

  function handleSave(values: z.input<typeof kpiProgressSchema>) {
    if (!displayRecord) return;

    startTransition(async () => {
      const result = await updateMyKpiProgressAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const currentValue = Number(values.currentValue);
      const completion = calculateKpiCompletion(
        currentValue,
        displayRecord.targetValue,
        displayRecord.measurementType,
      );
      const nextStatus = deriveKpiStatus(
        completion,
        displayRecord.endDate,
        currentValue,
        displayRecord.startDate,
      );

      const updated = applyKpiProgressToListItem(displayRecord, {
        currentValue,
        completionPercentage: completion,
        progressComments: values.progressComments,
        evidenceNotes: values.evidenceNotes,
        kpiStatus: nextStatus,
      });

      setDisplayRecord(updated);
      onUpdated?.(updated);
      toast.success("Your KPI update was saved");
      onOpenChange(false);
    });
  }

  const modalTitle =
    isEmployeeUpdate
      ? "Update your position"
      : displayRecord?.title ?? "KPI details";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle}
      description={
        displayRecord && variant === "default"
          ? `${displayRecord.employeeName} · ${displayRecord.employeeCode}`
          : displayRecord && isEmployeeUpdate
            ? `${displayRecord.title} · ${displayRecord.employeeCode}`
            : displayRecord
              ? `${displayRecord.employeeCode}`
              : undefined
      }
      contentClassName="sm:max-w-lg"
      showCancel={false}
      footer={
        isEmployeeUpdate ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button disabled={isPending} onClick={form.handleSubmit(handleSave)}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save update
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )
      }
    >
      {!displayRecord ? null : (
        <div className="space-y-4">
          <KpiRowStatusBadge
            kpiStatus={displayRecord.kpiStatus}
            progressComments={displayRecord.progressComments}
          />

          {isEmployeeUpdate ? (
            <>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{displayRecord.title}</p>
                <p className="mt-1 text-muted-foreground">
                  Target:{" "}
                  {formatKpiTarget(displayRecord.targetValue, displayRecord.measurementType)} ·
                  Due:{" "}
                  {displayRecord.endDate
                    ? format(new Date(displayRecord.endDate), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
              <PerformanceSection title="Update your position">
                <p className="mb-3 text-xs text-muted-foreground">
                  Select your current position and status update. HR and your manager can see this
                  on the KPI list.
                </p>
                <KpiProgressFields
                  form={form}
                  measurementType={displayRecord.measurementType}
                  disabled={isPending}
                  mode="employee"
                />
              </PerformanceSection>
            </>
          ) : (
            <>
              <PerformanceSection title="Measurement">
                <DetailGrid>
                  {variant === "default" ? (
                    <>
                      <DetailField label="Employee" value={displayRecord.employeeName} />
                      <DetailField label="Employee ID" value={displayRecord.employeeCode} />
                    </>
                  ) : null}
                  <DetailField label="Department" value={displayRecord.departmentName ?? "—"} />
                  <DetailField
                    label="Target"
                    value={formatKpiTarget(displayRecord.targetValue, displayRecord.measurementType)}
                  />
                  <DetailField
                    label="Your current position"
                    value={formatKpiProgress(
                      displayRecord.currentValue,
                      displayRecord.measurementType,
                    )}
                  />
                  <DetailField
                    label="Measurement type"
                    value={KPI_MEASUREMENT_LABELS[displayRecord.measurementType]}
                  />
                  <DetailField label="Frequency" value={KPI_PERIOD_LABELS[displayRecord.kpiPeriod]} />
                  <DetailField label="Weightage" value={`${displayRecord.weightage}%`} />
                  {variant === "default" ? (
                    <DetailField label="Manager" value={displayRecord.managerName ?? "—"} />
                  ) : null}
                </DetailGrid>
              </PerformanceSection>

              <PerformanceSection title="Timeline">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField
                    label="Period start"
                    value={
                      displayRecord.startDate
                        ? format(new Date(displayRecord.startDate), "MMM d, yyyy")
                        : "—"
                    }
                  />
                  <DetailField
                    label="Due date"
                    value={
                      displayRecord.endDate
                        ? format(new Date(displayRecord.endDate), "MMM d, yyyy")
                        : "—"
                    }
                  />
                </div>
              </PerformanceSection>
            </>
          )}

          {!isEmployeeUpdate &&
          (displayRecord.progressComments || displayRecord.evidenceNotes) ? (
            <PerformanceSection title="Employee update">
              {displayRecord.progressComments ? (
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Status update
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {displayRecord.progressComments}
                  </p>
                </div>
              ) : null}
              {displayRecord.evidenceNotes ? (
                <div className={displayRecord.progressComments ? "mt-3" : undefined}>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {displayRecord.evidenceNotes}
                  </p>
                </div>
              ) : null}
            </PerformanceSection>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
