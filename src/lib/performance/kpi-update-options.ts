import { KPI_STATUS_LABELS } from "@/lib/performance/constants";
import type { KpiAssignmentStatus, KpiListItem } from "@/types/performance";

export const KPI_SELECT_NONE = "__none__";

export const KPI_STATUS_UPDATE_OPTIONS = [
  { value: "Not started yet", label: "Not started yet" },
  { value: "Working on it", label: "Working on it" },
  { value: "On track", label: "On track" },
  { value: "Blocked / waiting", label: "Blocked / waiting" },
  { value: "Completed", label: "Completed" },
] as const;

export const KPI_EVIDENCE_NOTE_OPTIONS = [
  { value: "Shared evidence / links", label: "Shared evidence / links" },
  { value: "Waiting on input / approval", label: "Waiting on input / approval" },
  { value: "Risk / blocker details", label: "Risk / blocker details" },
] as const;

export function kpiSelectValue(value: string | null | undefined) {
  const v = value?.trim();
  if (!v || v === KPI_SELECT_NONE) return undefined;
  return v;
}

export function kpiSelectToField(value: string | null | undefined) {
  const v = value?.trim();
  if (!v || v === KPI_SELECT_NONE) return undefined;
  return v;
}

/** Maps saved employee/HR status-update text to badge color keys. */
export function kpiStatusUpdateToBadgeKey(
  progressComment: string | null | undefined,
): string | null {
  const value = progressComment?.trim();
  if (!value) return null;

  switch (value) {
    case "Not started yet":
      return "not_started";
    case "Working on it":
      return "in_progress";
    case "On track":
      return "on_track";
    case "Blocked / waiting":
      return "at_risk";
    case "Completed":
      return "completed";
    default:
      return "in_progress";
  }
}

export function getKpiRowStatusDisplay(record: {
  kpiStatus: KpiAssignmentStatus;
  progressComments: string | null;
}) {
  const update = record.progressComments?.trim();
  if (update) {
    return {
      label: update,
      statusKey: kpiStatusUpdateToBadgeKey(update) ?? record.kpiStatus,
    };
  }

  return {
    label: KPI_STATUS_LABELS[record.kpiStatus],
    statusKey: record.kpiStatus,
  };
}

export function applyKpiProgressToListItem(
  record: KpiListItem,
  values: {
    currentValue: number;
    progressComments?: string | null;
    evidenceNotes?: string | null;
    completionPercentage: number;
    kpiStatus: KpiAssignmentStatus;
  },
): KpiListItem {
  return {
    ...record,
    currentValue: values.currentValue,
    completionPercentage: values.completionPercentage,
    progressComments: values.progressComments?.trim() || null,
    evidenceNotes: values.evidenceNotes?.trim() || null,
    kpiStatus: values.kpiStatus,
  };
}
