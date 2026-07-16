"use client";

import { AlertTriangle, ArrowRight, Clock, ShieldAlert, Zap } from "lucide-react";
import { format } from "date-fns";

import { BarRow } from "@/components/reports/report-chart-cards";
import type {
  CeoApprovalsCategoryCount,
  CeoApprovalsKpis,
  CeoApprovalsQueueRow,
  ExecutiveApprovalType,
} from "@/types/ceo-approvals";
import { cn } from "@/lib/utils";

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function PriorityTile({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex h-full min-h-[5.5rem] flex-col justify-between rounded-lg border bg-background/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function PendingByTypePanel({
  categories,
  activeType,
  onSelectType,
}: {
  categories: CeoApprovalsCategoryCount[];
  activeType?: ExecutiveApprovalType;
  onSelectType: (type: ExecutiveApprovalType | undefined) => void;
}) {
  const items = [...categories]
    .filter((item) => item.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 6);
  const max = Math.max(1, ...items.map((item) => item.pending));

  return (
    <Panel title="Pending by Type" subtitle="Where decisions are waiting">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending approvals by type.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const selected = activeType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                className={cn(
                  "w-full rounded-lg text-left transition-colors",
                  selected ? "ring-1 ring-primary/40" : undefined,
                )}
                onClick={() =>
                  onSelectType(selected ? undefined : item.type)
                }
              >
                <BarRow
                  label={item.label}
                  value={item.pending}
                  max={max}
                  color="bg-primary"
                  formatValue={(value) => String(value)}
                />
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function NeedsAttentionPanel({
  kpis,
  dueSoon,
  onView,
}: {
  kpis: CeoApprovalsKpis;
  dueSoon: CeoApprovalsQueueRow[];
  onView: (requestId: string) => void;
}) {
  return (
    <Panel title="Needs Attention" subtitle="Act on these first">
      <div className="grid grid-cols-2 gap-2">
        <PriorityTile
          label="Overdue"
          value={String(kpis.overdueRequests)}
          detail={
            kpis.overdueRequests > 0 ? "Past due date" : "Nothing overdue"
          }
          icon={<AlertTriangle className="size-3.5" />}
          tone={
            kpis.overdueRequests > 0 ? "text-destructive" : undefined
          }
        />
        <PriorityTile
          label="High Priority"
          value={String(kpis.highPriority)}
          detail={
            kpis.highPriority > 0 ? "Critical or high" : "No urgent items"
          }
          icon={<Zap className="size-3.5" />}
          tone={kpis.highPriority > 0 ? "text-destructive" : undefined}
        />
        <PriorityTile
          label="Escalated"
          value={String(kpis.escalatedRequests)}
          detail="Waiting on CEO review"
          icon={<ShieldAlert className="size-3.5" />}
          tone={
            kpis.escalatedRequests > 0
              ? "text-violet-600 dark:text-violet-400"
              : undefined
          }
        />
        <PriorityTile
          label="This Week"
          value={String(kpis.waitingThisWeek)}
          detail="Submitted in last 7 days"
          icon={<Clock className="size-3.5" />}
        />
      </div>

      {dueSoon.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Next Due
          </p>
          <ul className="space-y-1.5">
            {dueSoon.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                  onClick={() => onView(item.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.approvalTypeLabel}
                      {item.dueAt
                        ? ` · Due ${format(new Date(item.dueAt), "d MMM")}`
                        : ""}
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

export function CeoApprovalsPanels({
  categories,
  kpis,
  queueRows,
  activeType,
  onSelectType,
  onView,
}: {
  categories: CeoApprovalsCategoryCount[];
  kpis: CeoApprovalsKpis;
  queueRows: CeoApprovalsQueueRow[];
  activeType?: ExecutiveApprovalType;
  onSelectType: (type: ExecutiveApprovalType | undefined) => void;
  onView: (requestId: string) => void;
}) {
  const dueSoon = [...queueRows]
    .filter((row) =>
      ["pending_ceo", "escalated", "forwarded", "submitted", "reviewed"].includes(
        row.status,
      ),
    )
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 4);

  return (
    <div className="grid w-full shrink-0 gap-3 lg:grid-cols-2 lg:items-stretch">
      <PendingByTypePanel
        categories={categories}
        activeType={activeType}
        onSelectType={onSelectType}
      />
      <NeedsAttentionPanel kpis={kpis} dueSoon={dueSoon} onView={onView} />
    </div>
  );
}
