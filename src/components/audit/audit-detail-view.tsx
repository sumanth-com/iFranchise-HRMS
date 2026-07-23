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

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No data recorded.</p>
      ) : (
        <dl className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={`${title}-${row.label}`} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
              <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
              <dd className="text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function AuditDetailView({ detail }: { detail: AuditDetail }) {
  const recordLabel = formatAuditRecordLabel(detail);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              {humanizeActivityDescription(
                detail.description,
                formatAuditAction(detail.action),
              )}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(detail.occurredAt), "EEEE, MMMM d, yyyy 'at' HH:mm:ss")}
            </p>
          </div>
          <div className="flex gap-2">
            <AuditPriorityBadge priority={detail.priority} />
            <AuditStatusBadge status={detail.eventStatus} />
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Performed By</dt>
            <dd className="mt-1 text-sm font-medium">{detail.userName ?? "System"}</dd>
            {detail.userEmail ? <dd className="text-xs text-muted-foreground">{detail.userEmail}</dd> : null}
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Role</dt>
            <dd className="mt-1 text-sm">{detail.roleName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Module</dt>
            <dd className="mt-1 text-sm">{formatAuditModule(detail.module)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Action</dt>
            <dd className="mt-1 text-sm">{formatAuditAction(detail.action)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Record</dt>
            <dd className="mt-1 text-sm font-medium">{recordLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Source</dt>
            <dd className="mt-1 text-sm">{formatAuditTableLabel(detail.tableName)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">IP Address</dt>
            <dd className="mt-1 text-sm">{detail.ipAddress ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Browser</dt>
            <dd className="mt-1 text-sm">{detail.browser ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Operating System</dt>
            <dd className="mt-1 text-sm">{detail.operatingSystem ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Device Type</dt>
            <dd className="mt-1 text-sm">{detail.deviceType ?? "—"}</dd>
          </div>
          {detail.reason ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium uppercase text-muted-foreground">Reason</dt>
              <dd className="mt-1 text-sm">{detail.reason}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AuditDataPanel title="Before Values" data={detail.oldRecord} />
        <AuditDataPanel title="After Values" data={detail.newRecord} />
      </div>
    </div>
  );
}
