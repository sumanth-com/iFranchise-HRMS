import { format } from "date-fns";

import {
  AuditPriorityBadge,
  AuditStatusBadge,
} from "@/components/audit/audit-status-badge";
import { formatAuditAction, formatAuditModule } from "@/lib/audit/constants";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import type { AuditDetail } from "@/types/audit";

function JsonBlock({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {!data || Object.keys(data).length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No data recorded.</p>
      ) : (
        <pre className="mt-2 max-h-80 overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

export function AuditDetailView({ detail }: { detail: AuditDetail }) {
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
            <dd className="mt-1 text-sm font-mono">{detail.recordId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">Table</dt>
            <dd className="mt-1 text-sm">{detail.tableName}</dd>
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
        <JsonBlock title="Before Values" data={detail.oldRecord} />
        <JsonBlock title="After Values" data={detail.newRecord} />
      </div>
    </div>
  );
}
