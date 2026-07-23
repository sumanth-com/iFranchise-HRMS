"use client";

import { format } from "date-fns";
import Link from "next/link";

import {
  AuditPriorityBadge,
  AuditStatusBadge,
} from "@/components/audit/audit-status-badge";
import { AUDIT_ROUTES, formatAuditAction, formatAuditModule } from "@/lib/audit/constants";
import { formatAuditRecordLabel } from "@/lib/audit/display";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import type { AuditListItem } from "@/types/audit";

export function AuditTimeline({ items }: { items: AuditListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        No audit activity found for the selected filters.
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute bottom-0 left-4 top-0 w-px bg-border" />
      {items.map((item) => (
        <div key={item.id} className="relative flex gap-4 pb-8 pl-10">
          <div className="absolute left-2.5 top-1.5 size-3 rounded-full border-2 border-primary bg-background" />
          <div className="min-w-0 flex-1 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {humanizeActivityDescription(
                    item.description,
                    formatAuditAction(item.action),
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.userName ?? "System"} · {formatAuditModule(item.module)} ·{" "}
                  {format(new Date(item.occurredAt), "MMM d, yyyy HH:mm:ss")}
                </p>
              </div>
              <div className="flex gap-2">
                <AuditPriorityBadge priority={item.priority} />
                <AuditStatusBadge status={item.eventStatus} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Record: {formatAuditRecordLabel(item)}</span>
              {item.ipAddress ? <span>IP: {item.ipAddress}</span> : null}
              {item.browser ? <span>{item.browser}</span> : null}
            </div>
            <Link href={AUDIT_ROUTES.detail(item.id)} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              View details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
