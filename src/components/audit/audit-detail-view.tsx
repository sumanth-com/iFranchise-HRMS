import { format } from "date-fns";

import {
  AuditPriorityBadge,
  AuditStatusBadge,
} from "@/components/audit/audit-status-badge";
import { formatAuditAction, formatAuditModule } from "@/lib/audit/constants";
import {
  formatAuditRecordLabel,
  formatAuditTableLabel,
  sanitizeAuditRecordData,
} from "@/lib/audit/display";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import type { AuditDetail } from "@/types/audit";

function AuditDataPanel({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | null;
}) {
  const rows = sanitizeAuditRecordData(data);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <dl className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
            <dd className="text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{trimmed}</dd>
    </div>
  );
}

function isSyntheticRecordId(recordId: string | null | undefined) {
  if (!recordId?.trim()) return true;
  const id = recordId.trim().toLowerCase();
  return (
    id === "system" ||
    id.startsWith("export-") ||
    id.startsWith("bulk-delete-") ||
    id.startsWith("view-")
  );
}

function isLocalIp(ip: string | null | undefined) {
  if (!ip?.trim()) return true;
  const value = ip.trim().toLowerCase();
  return value === "::1" || value === "127.0.0.1" || value === "localhost";
}

function isGenericSource(tableName: string | null | undefined) {
  if (!tableName?.trim()) return true;
  const value = tableName.trim().toLowerCase();
  return value === "application" || value === "audit_logs";
}

function usefulRecordLabel(detail: AuditDetail): string | null {
  if (isSyntheticRecordId(detail.recordId)) return null;

  const label = formatAuditRecordLabel(detail).trim();
  if (!label || label === "—" || label === "System" || label === "Audit log entry") {
    return null;
  }

  const moduleAction = `${formatAuditModule(detail.module)} · ${formatAuditAction(detail.action)}`;
  if (label === moduleAction) return null;

  const description = humanizeActivityDescription(
    detail.description,
    formatAuditAction(detail.action),
  );
  if (label === description) return null;

  return label;
}

export function AuditDetailView({
  detail,
  compact = false,
}: {
  detail: AuditDetail;
  compact?: boolean;
}) {
  const recordLabel = usefulRecordLabel(detail);
  const sourceLabel = isGenericSource(detail.tableName)
    ? null
    : formatAuditTableLabel(detail.tableName);
  const ipLabel = isLocalIp(detail.ipAddress) ? null : detail.ipAddress;
  const beforeRows = sanitizeAuditRecordData(detail.oldRecord);
  const afterRows = sanitizeAuditRecordData(detail.newRecord);
  const hasChangePanels = beforeRows.length > 0 || afterRows.length > 0;

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className={compact ? "space-y-4" : "rounded-xl border bg-card p-6 shadow-sm"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={compact ? "text-base font-semibold" : "text-xl font-semibold"}>
              {humanizeActivityDescription(
                detail.description,
                formatAuditAction(detail.action),
              )}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(detail.occurredAt), "EEEE, MMMM d, yyyy 'at' HH:mm:ss")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {detail.priority === "high" || detail.priority === "critical" ? (
              <AuditPriorityBadge priority={detail.priority} />
            ) : null}
            <AuditStatusBadge status={detail.eventStatus} />
          </div>
        </div>

        <dl
          className={
            compact
              ? "mt-4 grid gap-3 sm:grid-cols-2"
              : "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Performed By</dt>
            <dd className="mt-1 text-sm font-medium">{detail.userName ?? "System"}</dd>
            {detail.userEmail ? (
              <dd className="text-xs text-muted-foreground">{detail.userEmail}</dd>
            ) : null}
          </div>
          <DetailField label="Role" value={detail.roleName} />
          <DetailField label="Module" value={formatAuditModule(detail.module)} />
          <DetailField label="Action" value={formatAuditAction(detail.action)} />
          <DetailField label="Record" value={recordLabel} />
          <DetailField label="Source" value={sourceLabel} />
          <DetailField label="IP Address" value={ipLabel} />
          <DetailField label="Browser" value={detail.browser} />
          <DetailField label="Operating System" value={detail.operatingSystem} />
          <DetailField label="Device Type" value={detail.deviceType} />
          {detail.reason ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Reason</dt>
              <dd className="mt-1 text-sm">{detail.reason}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {hasChangePanels ? (
        <div
          className={
            beforeRows.length > 0 && afterRows.length > 0
              ? compact
                ? "grid gap-3"
                : "grid gap-4 lg:grid-cols-2"
              : "grid gap-3"
          }
        >
          <AuditDataPanel title="Before Values" data={detail.oldRecord} />
          <AuditDataPanel title="After Values" data={detail.newRecord} />
        </div>
      ) : null}
    </div>
  );
}
