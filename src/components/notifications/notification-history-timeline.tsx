"use client";

import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Modal } from "@/components/common/modal";
import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import {
  deleteNotificationAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import {
  formatNotificationDisplayText,
  formatNotificationModule,
} from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";
import type { NotificationListItem, NotificationListResult } from "@/types/notifications";

type Props = {
  result: NotificationListResult;
  historyPath: string;
  showRecipient?: boolean;
};

function formatHistoryDateLabel(dateIso: string) {
  const date = parseISO(dateIso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM yyyy");
}

function groupByDate(items: NotificationListItem[]) {
  const groups = new Map<string, NotificationListItem[]>();

  for (const item of items) {
    const key = format(parseISO(item.createdAt), "yyyy-MM-dd");
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([dateKey, groupItems]) => ({
    dateKey,
    label: formatHistoryDateLabel(groupItems[0]!.createdAt),
    items: groupItems,
  }));
}

export function NotificationHistoryTimeline({
  result,
  historyPath,
  showRecipient = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationListItem | null>(null);

  const groups = useMemo(() => groupByDate(result.items), [result.items]);

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.push(`${historyPath}?${params.toString()}`);
    },
    [historyPath, router, searchParams],
  );

  function toggleExpanded(item: NotificationListItem) {
    const nextId = expandedId === item.id ? null : item.id;
    setExpandedId(nextId);
    setParams({ id: nextId ?? undefined });

    if (nextId && item.status === "unread") {
      startTransition(async () => {
        const res = await markNotificationReadAction(item.id);
        if (res.success) router.refresh();
      });
    }
  }

  function confirmDelete(item: NotificationListItem) {
    startTransition(async () => {
      const res = await deleteNotificationAction(item.id);
      if (res.success) {
        toast.success("Removed from history");
        if (expandedId === item.id) {
          setExpandedId(null);
          setParams({ id: undefined });
        }
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No history records"
        description="Notifications matching your filters will appear here as a timeline."
      />
    );
  }

  return (
    <>
      <div className="divide-y">
        {groups.map((group) => (
          <section key={group.dateKey}>
            <div className="sticky top-0 z-10 border-b bg-muted/40 px-4 py-2 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </p>
            </div>

            <div className="relative px-4 py-2">
              <div className="absolute top-0 bottom-0 left-[1.65rem] w-px bg-border" />

              {group.items.map((item) => {
                const isExpanded = expandedId === item.id;
                const timeLabel = format(parseISO(item.createdAt), "h:mm a");
                const displayMessage = formatNotificationDisplayText(item.message);

                return (
                  <div key={item.id} className="relative pb-3 pl-8">
                    <span
                      className={cn(
                        "absolute top-2.5 left-3 size-2.5 rounded-full ring-2 ring-background",
                        item.status === "unread" ? "bg-primary" : "bg-muted-foreground/40",
                      )}
                    />

                    <div
                      className={cn(
                        "overflow-hidden rounded-lg border transition-colors",
                        isExpanded ? "border-primary/30 bg-accent/40" : "bg-card",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                              {timeLabel}
                            </span>
                            <span className="text-sm font-medium">{item.title}</span>
                            <NotificationStatusBadge status={item.status} />
                            <NotificationPriorityBadge priority={item.priority} />
                          </div>
                          {!isExpanded ? (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {displayMessage}
                            </p>
                          ) : null}
                        </div>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>

                      {isExpanded ? (
                        <div className="space-y-3 border-t px-4 py-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {displayMessage}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatNotificationModule(item.module)}
                            {showRecipient && item.recipientName
                              ? ` · ${item.recipientName}`
                              : ""}
                            {" · "}
                            {formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })}
                            {item.readAt
                              ? ` · Read ${formatDistanceToNow(parseISO(item.readAt), { addSuffix: true })}`
                              : ""}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.actionUrl ? (
                              <Link
                                href={item.actionUrl}
                                className={cn(
                                  "inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground",
                                  "hover:bg-primary/90",
                                )}
                              >
                                <ExternalLink className="size-4" />
                                Open related page
                              </Link>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="mr-2 size-4 text-destructive" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {result.total > result.pageSize ? (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            Page {result.page} · {result.total} record(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
              onClick={() => setParams({ page: String(result.page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page * result.pageSize >= result.total}
              onClick={() => setParams({ page: String(result.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete from history?"
        description="This notification will be permanently removed."
        contentClassName="sm:max-w-md"
        showCancel={false}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (deleteTarget) confirmDelete(deleteTarget);
              }}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <p className="text-sm text-muted-foreground">
            Delete &ldquo;{deleteTarget.title}&rdquo; from your history?
          </p>
        ) : null}
      </Modal>
    </>
  );
}
