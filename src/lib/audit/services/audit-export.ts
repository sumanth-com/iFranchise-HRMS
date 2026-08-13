import { format } from "date-fns";

import type { AuditListItem } from "@/types/audit";
import type { ReportColumn, ReportKey, ReportResult } from "@/types/reports";
import {
  formatAuditAction,
  formatAuditModule,
} from "@/lib/audit/constants";
import { formatAuditRecordLabel } from "@/lib/audit/display";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import { reportToExcelXml } from "@/lib/reports/services/reports-utils";
import type { AuditExportFormat } from "@/types/audit";

function formatStatus(status: string) {
  if (status === "success") return "Success";
  if (status === "failed") return "Failed";
  return status;
}

function formatTimestamp(iso: string) {
  try {
    return format(new Date(iso), "dd MMM yyyy HH:mm");
  } catch {
    return iso;
  }
}

/** Full column set for Excel downloads. */
function buildAuditExcelReport(items: AuditListItem[]): ReportResult {
  const columns: ReportColumn[] = [
    { key: "occurredAt", header: "Timestamp" },
    { key: "userName", header: "User" },
    { key: "roleName", header: "Role" },
    { key: "module", header: "Module" },
    { key: "action", header: "Action" },
    { key: "recordId", header: "Record" },
    { key: "description", header: "Description" },
    { key: "ipAddress", header: "IP Address" },
    { key: "deviceType", header: "Device" },
    { key: "browser", header: "Browser" },
    { key: "eventStatus", header: "Status" },
  ];

  const rows = items.map((item) => ({
    occurredAt: formatTimestamp(item.occurredAt),
    userName: item.userName ?? "System",
    roleName: item.roleName ?? "—",
    module: formatAuditModule(item.module),
    action: formatAuditAction(item.action),
    recordId: formatAuditRecordLabel(item),
    description: humanizeActivityDescription(
      item.description,
      formatAuditAction(item.action),
    ),
    ipAddress: item.ipAddress ?? "—",
    deviceType: item.deviceType ?? "—",
    browser: item.browser ?? "—",
    eventStatus: formatStatus(item.eventStatus),
  }));

  return {
    key: "audit_logs" as ReportKey,
    title: "Audit Logs",
    columns,
    rows,
    total: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Lean, readable columns for PDF — avoids cramming 11 equal-width fields
 * onto a page (which made exports look broken).
 */
function buildAuditPdfReport(items: AuditListItem[]): ReportResult {
  const columns: ReportColumn[] = [
    { key: "occurredAt", header: "Time", width: 1.35 },
    { key: "userName", header: "User", width: 1.6 },
    { key: "module", header: "Module", width: 1.1 },
    { key: "action", header: "Action", width: 1.0 },
    { key: "description", header: "Activity", width: 2.6 },
    { key: "eventStatus", header: "Status", width: 0.75 },
  ];

  const rows = items.map((item) => {
    const actionLabel = formatAuditAction(item.action);
    const description = humanizeActivityDescription(item.description, actionLabel);
    const role = item.roleName ? ` (${item.roleName})` : "";

    return {
      occurredAt: formatTimestamp(item.occurredAt),
      userName: `${item.userName ?? "System"}${role}`,
      module: formatAuditModule(item.module),
      action: actionLabel,
      description,
      eventStatus: formatStatus(item.eventStatus),
    };
  });

  return {
    key: "audit_logs" as ReportKey,
    title: "Audit Logs",
    columns,
    rows,
    total: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function exportAuditLogs(items: AuditListItem[], format: AuditExportFormat = "excel") {
  const result = buildAuditExcelReport(items);
  if (format === "pdf") {
    throw new Error("PDF export is handled separately");
  }
  return reportToExcelXml(result);
}

export function auditRowsForExport(items: AuditListItem[]) {
  return buildAuditExcelReport(items);
}

export function auditRowsForPdfExport(items: AuditListItem[]) {
  return buildAuditPdfReport(items);
}
