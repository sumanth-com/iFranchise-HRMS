import type { AuditListItem } from "@/types/audit";
import type { ReportColumn, ReportKey, ReportResult } from "@/types/reports";
import {
  formatAuditAction,
  formatAuditModule,
} from "@/lib/audit/constants";
import { formatAuditRecordLabel } from "@/lib/audit/display";
import { reportToCsv, reportToExcelXml } from "@/lib/reports/services/reports-utils";
import type { AuditExportFormat } from "@/types/audit";

function buildAuditReport(items: AuditListItem[]): ReportResult {
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
    occurredAt: item.occurredAt,
    userName: item.userName ?? "—",
    roleName: item.roleName ?? "—",
    module: formatAuditModule(item.module),
    action: formatAuditAction(item.action),
    recordId: formatAuditRecordLabel(item),
    description: item.description ?? "—",
    ipAddress: item.ipAddress ?? "—",
    deviceType: item.deviceType ?? "—",
    browser: item.browser ?? "—",
    eventStatus: item.eventStatus,
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

export function exportAuditLogs(items: AuditListItem[], format: AuditExportFormat) {
  const result = buildAuditReport(items);
  if (format === "excel") return reportToExcelXml(result);
  return reportToCsv(result);
}

export function auditRowsForExport(items: AuditListItem[]) {
  return buildAuditReport(items);
}
