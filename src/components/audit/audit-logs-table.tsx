"use client";

import { format } from "date-fns";
import { Eye, Loader2, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { AuditDetailView } from "@/components/audit/audit-detail-view";
import { AuditExportButtons } from "@/components/audit/audit-export-buttons";
import { AuditStatusBadge } from "@/components/audit/audit-status-badge";
import { Button } from "@/components/common/button";
import {
  SECTION_HEADING_ROW_CLASS,
} from "@/components/common/table-header-classes";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Modal } from "@/components/common/modal";
import {
  bulkDeleteAuditLogsAction,
  deleteAuditLogAction,
  getAuditLogDetailAction,
  logAuditViewAction,
} from "@/lib/audit/actions";
import {
  formatAuditAction,
  formatAuditModule,
  resolveAuditRoutes,
} from "@/lib/audit/constants";
import { formatAuditRecordLabel } from "@/lib/audit/display";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import { cn } from "@/lib/utils";
import type { AuditDetail, AuditListItem, AuditListResult } from "@/types/audit";

function rowGrid(canSelect: boolean) {
  return canSelect
    ? "grid grid-cols-[2rem_6.5rem_minmax(0,1.15fr)_minmax(0,1fr)_6.25rem_7.5rem] items-start gap-x-4 gap-y-2 px-4 sm:gap-x-6 sm:px-5"
    : "grid grid-cols-[6.5rem_minmax(0,1.15fr)_minmax(0,1fr)_6.25rem_7.5rem] items-start gap-x-5 gap-y-2 px-4 sm:gap-x-8 sm:px-5";
}

type Props = {
  result: AuditListResult;
  canExport: boolean;
  filters: Record<string, string | undefined>;
  routesBasePath?: string;
  /** Super Admin can soft-delete entries from the table. */
  canDelete?: boolean;
};

function AuditLogRow({
  row,
  canDelete,
  canSelect,
  selected,
  busy,
  onToggle,
  onView,
  onDelete,
}: {
  row: AuditListItem;
  canDelete: boolean;
  canSelect: boolean;
  selected: boolean;
  busy: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onView: (row: AuditListItem) => void;
  onDelete: (row: AuditListItem) => void;
}) {
  const moduleLabel = formatAuditModule(row.module);
  const actionLabel = formatAuditAction(row.action);
  const record = formatAuditRecordLabel(row);
  const description = humanizeActivityDescription(row.description, "");

  return (
    <article
      className={cn(
        rowGrid(canSelect),
        "border-b border-border/70 py-4 last:border-b-0 hover:bg-muted/20",
        selected && "bg-muted/25",
        busy && "pointer-events-none opacity-50",
      )}
    >
      {canSelect ? (
        <div className="flex justify-center pt-1">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={selected}
            disabled={busy}
            onChange={(e) => onToggle(row.id, e.target.checked)}
            aria-label={`Select audit entry from ${row.userName ?? "System"}`}
          />
        </div>
      ) : null}

      <div className="text-xs text-muted-foreground sm:text-sm">
        <p className="font-medium text-foreground">
          {format(new Date(row.occurredAt), "dd MMM yyyy")}
        </p>
        <p>{format(new Date(row.occurredAt), "HH:mm:ss")}</p>
      </div>

      <div className="min-w-0 space-y-1.5 pr-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-foreground">{row.userName ?? "System"}</p>
          {row.roleName ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {row.roleName}
            </span>
          ) : null}
        </div>

        {description ? (
          <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      <div className="min-w-0 space-y-1 pr-2">
        <p className="text-sm font-medium leading-snug text-foreground">
          {moduleLabel} · {actionLabel}
        </p>
        <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
          {record}
        </p>
      </div>

      <div className="flex justify-center pt-0.5">
        <AuditStatusBadge status={row.eventStatus} />
      </div>

      <div className="flex justify-end gap-1.5 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          disabled={busy}
          onClick={() => onView(row)}
          title="View audit detail"
        >
          <Eye className="size-3.5" />
          View
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => onDelete(row)}
            title="Delete audit entry"
            aria-label="Delete audit entry"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function AuditLogsTable({
  result,
  canExport,
  filters,
  routesBasePath,
  canDelete = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const routes = resolveAuditRoutes(routesBasePath);

  const [items, setItems] = useState(result.items);
  const [total, setTotal] = useState(result.total);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [detail, setDetail] = useState<AuditDetail | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AuditListItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  useEffect(() => {
    setItems(result.items);
    setTotal(result.total);
    setSelectedIds(new Set());
  }, [result.items, result.total, result.page]);

  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${routes.logs}?${params.toString()}`);
  };

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(items.map((item) => item.id)));
  }

  function openView(row: AuditListItem) {
    setViewOpen(true);
    setDetail(null);
    setViewLoading(true);
    startTransition(async () => {
      const [detailResult] = await Promise.all([
        getAuditLogDetailAction(row.id),
        logAuditViewAction(row.id).catch(() => undefined),
      ]);
      setViewLoading(false);
      if (!detailResult.success) {
        toast.error(detailResult.message);
        setViewOpen(false);
        return;
      }
      setDetail(detailResult.data);
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeletePending(true);
    setBusyId(targetId);
    startTransition(async () => {
      const result = await deleteAuditLogAction(targetId);
      setDeletePending(false);
      setBusyId(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== targetId));
      setTotal((current) => Math.max(0, current - 1));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(targetId);
        return next;
      });
      setDeleteTarget(null);
      if (detail?.id === targetId) {
        setViewOpen(false);
        setDetail(null);
      }
      toast.success("Audit entry removed");
      router.refresh();
    });
  }

  function confirmBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkPending(true);
    startTransition(async () => {
      const result = await bulkDeleteAuditLogsAction(ids);
      setBulkPending(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const deletedIds = new Set(ids);
      setItems((current) => current.filter((item) => !deletedIds.has(item.id)));
      setTotal((current) => Math.max(0, current - result.data.deleted));
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
      if (detail && deletedIds.has(detail.id)) {
        setViewOpen(false);
        setDetail(null);
      }
      toast.success(
        result.data.deleted === 1
          ? "1 audit entry removed"
          : `${result.data.deleted} audit entries removed`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? "No audit entries on this page"
            : `Showing ${(result.page - 1) * result.pageSize + 1}–${Math.min(result.page * result.pageSize, Math.max(total, items.length))} · page ${result.page}`}
          {canDelete && selectedCount > 0 ? (
            <span className="text-foreground"> · {selectedCount} selected</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? <AuditExportButtons filters={filters} disabled={isPending || bulkPending} /> : null}
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={selectedCount === 0 || isPending || bulkPending}
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Bulk Delete{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No audit logs"
          description="Activity will appear here as users interact with the HRMS."
        />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div
            className="max-h-[min(68dvh,42rem)] overflow-y-auto overscroll-contain scroll-smooth"
            aria-label="Audit log entries"
          >
            <header
              className={cn(
                rowGrid(canDelete),
                SECTION_HEADING_ROW_CLASS,
                "sticky top-0 z-10 grid items-center",
              )}
            >
              {canDelete ? (
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all audit entries on this page"
                  />
                </div>
              ) : null}
              <span>Time</span>
              <span>Activity</span>
              <span>Event</span>
              <span className="text-center">Status</span>
              <span className="text-right">Actions</span>
            </header>

            <div className={cn(isPending && "pointer-events-none opacity-60")}>
              {items.map((row) => (
                <AuditLogRow
                  key={row.id}
                  row={row}
                  canDelete={canDelete}
                  canSelect={canDelete}
                  selected={selectedIds.has(row.id)}
                  busy={busyId === row.id || bulkPending}
                  onToggle={toggleOne}
                  onView={openView}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {total > result.pageSize ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Page {result.page}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page <= 1 || isPending}
              onClick={() => setPage(result.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page * result.pageSize >= total || isPending}
              onClick={() => startTransition(() => setPage(result.page + 1))}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Next"}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setDetail(null);
            setViewLoading(false);
          }
        }}
        title="Audit detail"
        description="Who did what, and any recorded changes."
        contentClassName="sm:max-w-3xl"
        showCancel={false}
        footer={
          <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="max-h-[min(70vh,40rem)] overflow-y-auto pr-1">
          {viewLoading ? (
            <div className="flex min-h-[12rem] items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : detail ? (
            <AuditDetailView detail={detail} compact />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load this audit entry.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteTarget(null);
        }}
        title="Delete audit entry?"
        description={
          deleteTarget
            ? `Remove this log from the Audit Trail. This hides the entry from normal views.`
            : undefined
        }
        showCancel={false}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={deletePending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending || !deleteTarget}
              onClick={confirmDelete}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {deleteTarget.userName ?? "System"}
              </span>{" "}
              · {formatAuditModule(deleteTarget.module)} ·{" "}
              {formatAuditAction(deleteTarget.action)}
            </p>
            <p className="line-clamp-3">
              {humanizeActivityDescription(
                deleteTarget.description,
                formatAuditAction(deleteTarget.action),
              )}
            </p>
            <p className="text-xs">
              {format(new Date(deleteTarget.occurredAt), "dd MMM yyyy · HH:mm:ss")}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={bulkConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !bulkPending) setBulkConfirmOpen(false);
        }}
        title="Delete selected audit entries?"
        description={`Remove ${selectedCount} selected log${selectedCount === 1 ? "" : "s"} from the Audit Trail.`}
        showCancel={false}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={bulkPending}
              onClick={() => setBulkConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={bulkPending || selectedCount === 0}
              onClick={confirmBulkDelete}
            >
              {bulkPending ? "Deleting..." : `Delete ${selectedCount}`}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Selected entries will be hidden from normal views. This action is limited to the
          rows you checked on this page.
        </p>
      </Modal>
    </div>
  );
}
