"use client";

import { format } from "date-fns";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { KpiStatusBadge } from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
  ProgressBar,
} from "@/components/performance/performance-ui-primitives";
import {
  KPI_MEASUREMENT_LABELS,
  KPI_PERIOD_LABELS,
} from "@/lib/performance/constants";
import { formatKpiTarget } from "@/lib/performance/services/performance-utils";
import type { KpiListItem } from "@/types/performance";

type Props = {
  record: KpiListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProgress?: () => void;
  canUpdate?: boolean;
};

export function KpiDetailModal({
  record,
  open,
  onOpenChange,
  onUpdateProgress,
  canUpdate = false,
}: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={record?.title ?? "KPI details"}
      description={record ? `${record.employeeName} · measurable performance target` : undefined}
      contentClassName="sm:max-w-lg"
      showCancel={false}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {canUpdate && onUpdateProgress ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                onUpdateProgress();
              }}
            >
              Update progress
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      }
    >
      {!record ? null : (
        <div className="space-y-4">
          <KpiStatusBadge status={record.kpiStatus} />

          <PerformanceSection title="Measurement">
            <DetailGrid>
              <DetailField label="Employee" value={record.employeeName} />
              <DetailField label="Department" value={record.departmentName ?? "—"} />
              <DetailField
                label="Target"
                value={formatKpiTarget(record.targetValue, record.measurementType)}
              />
              <DetailField
                label="Current value"
                value={formatKpiTarget(record.currentValue, record.measurementType)}
              />
              <DetailField
                label="Measurement type"
                value={KPI_MEASUREMENT_LABELS[record.measurementType]}
              />
              <DetailField label="Frequency" value={KPI_PERIOD_LABELS[record.kpiPeriod]} />
              <DetailField label="Weightage" value={`${record.weightage}%`} />
              <DetailField label="Manager" value={record.managerName ?? "—"} />
            </DetailGrid>
          </PerformanceSection>

          <PerformanceSection title="Progress">
            <ProgressBar value={record.completionPercentage} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Period start"
                value={
                  record.startDate ? format(new Date(record.startDate), "MMM d, yyyy") : "—"
                }
              />
              <DetailField
                label="Period end"
                value={
                  record.endDate ? format(new Date(record.endDate), "MMM d, yyyy") : "—"
                }
              />
            </div>
          </PerformanceSection>

          {record.progressComments || record.evidenceNotes ? (
            <PerformanceSection title="Notes">
              {record.progressComments ? (
                <p className="text-sm text-muted-foreground">{record.progressComments}</p>
              ) : null}
              {record.evidenceNotes ? (
                <p className="mt-2 text-sm text-muted-foreground">{record.evidenceNotes}</p>
              ) : null}
            </PerformanceSection>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
