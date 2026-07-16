"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Check, Loader2, MoreHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteCeoNotificationAction,
  fetchCeoNotificationDetailAction,
  markCeoNotificationReadAction,
} from "@/lib/ceo/actions/ceo-notifications-actions";
import { formatNotificationDisplayText } from "@/lib/notifications/constants";
import type {
  CeoNotificationDetail,
  CeoNotificationListItem,
} from "@/types/ceo-notifications";
import { cn } from "@/lib/utils";

type Props = {
  rows: CeoNotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPageChange: (page: number) => void;
  onChanged: () => void;
};

export function CeoNotificationsInbox({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  selectedId,
  onSelect,
  onPageChange,
  onChanged,
}: Props) {
  const [detail, setDetail] = useState<CeoNotificationDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CeoNotificationListItem | null>(
    null,
  );
  const [isActing, startActing] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    void fetchCeoNotificationDetailAction({ notificationId: selectedId }).then(
      (result) => {
        if (cancelled) return;
        setDetailLoading(false);
        if (!result.success) {
          setDetail(null);
          setDetailError(result.message);
          return;
        }
        setDetail(result.data);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function selectItem(item: CeoNotificationListItem) {
    onSelect(item.id);
    if (item.status === "unread") {
      startActing(async () => {
        await markCeoNotificationReadAction({ notificationId: item.id });
        onChanged();
      });
    }
  }

  function markAsRead(item: CeoNotificationListItem) {
    if (item.status !== "unread") return;
    startActing(async () => {
      const result = await markCeoNotificationReadAction({
        notificationId: item.id,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Marked as read");
      onChanged();
    });
  }

  function requestDelete(item: CeoNotificationListItem) {
    // Open confirm after the menu finishes closing so the dialog isn't blocked.
    window.setTimeout(() => setDeleteTarget(item), 0);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startActing(async () => {
      const result = await deleteCeoNotificationAction({ notificationId: id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (selectedId === id) onSelect(null);
      setDeleteTarget(null);
      onChanged();
    });
  }

  return (
    <>
      <section className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm md:min-h-[36rem]">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Inbox</h2>
            <p className="text-xs text-muted-foreground">
              {total} notification{total === 1 ? "" : "s"}
              {isLoading ? " · Refreshing…" : ""}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "flex w-full shrink-0 flex-col border-r md:w-[22rem] lg:w-[26rem]",
              selectedId ? "hidden md:flex" : "flex",
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                rows.map((item) => (
                  <InboxListRow
                    key={item.id}
                    item={item}
                    isActive={selectedId === item.id}
                    disabled={isActing}
                    onSelect={() => selectItem(item)}
                    onMarkRead={() => markAsRead(item)}
                    onDelete={() => requestDelete(item)}
                  />
                ))
              )}
            </div>

            {total > pageSize ? (
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1 || isLoading}
                    onClick={() => onPageChange(page - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => onPageChange(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>

          <div
            className={cn(
              "min-w-0 flex-1 flex-col bg-background",
              selectedId ? "flex" : "hidden md:flex",
            )}
          >
            {!selectedId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
                <p className="text-sm font-medium">Select a notification</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Choose an item from the left to read it here.
                </p>
              </div>
            ) : detailLoading && !detail ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Opening…
              </div>
            ) : detailError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                <p className="text-sm text-destructive">{detailError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(null)}
                >
                  Close
                </Button>
              </div>
            ) : detail ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight">
                          {formatNotificationDisplayText(detail.item.title)}
                        </h3>
                        <NotificationStatusBadge status={detail.item.status} />
                        <NotificationPriorityBadge priority={detail.item.priority} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[
                          detail.item.categoryLabel,
                          detail.item.departmentName,
                          format(
                            new Date(detail.item.createdAt),
                            "d MMM yyyy, h:mm a",
                          ),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label="Close notification"
                      onClick={() => onSelect(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                  <p className="max-w-2xl whitespace-pre-wrap text-[15px] leading-7">
                    {formatNotificationDisplayText(detail.item.message)}
                  </p>

                  {detail.supportingInfo.filter(
                    (info) => info.value && String(info.value).trim() !== "—",
                  ).length > 0 ? (
                    <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                      {detail.supportingInfo
                        .filter(
                          (info) =>
                            info.value && String(info.value).trim() !== "—",
                        )
                        .map((info) => (
                          <div key={info.label}>
                            <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              {info.label}
                            </dt>
                            <dd className="mt-1 text-sm font-medium">
                              {info.value}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete notification?"
        description="This notification will be permanently removed."
        contentClassName="sm:max-w-md"
        showCancel={false}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isActing}
              onClick={confirmDelete}
            >
              {isActing ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <p className="text-sm text-muted-foreground">
            Delete &ldquo;
            {formatNotificationDisplayText(deleteTarget.title)}
            &rdquo;?
          </p>
        ) : null}
      </Modal>
    </>
  );
}

function InboxListRow({
  item,
  isActive,
  disabled,
  onSelect,
  onMarkRead,
  onDelete,
}: {
  item: CeoNotificationListItem;
  isActive: boolean;
  disabled: boolean;
  onSelect: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const unread = item.status === "unread";

  return (
    <div
      className={cn(
        "group flex items-start gap-1 border-b transition-colors",
        isActive ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
      >
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            unread ? "bg-primary" : "bg-transparent",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "line-clamp-1 text-sm",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {formatNotificationDisplayText(item.title)}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {formatNotificationDisplayText(item.message)}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {item.categoryLabel}
          </span>
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "mr-1 mt-2 size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100",
                isActive && "opacity-100",
              )}
              aria-label="Notification actions"
              disabled={disabled}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[10rem]" sideOffset={4}>
          {unread ? (
            <DropdownMenuItem
              className="whitespace-nowrap"
              onClick={() => onMarkRead()}
            >
              <Check className="mr-2 size-4" />
              Mark as read
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            className="whitespace-nowrap"
            onClick={() => onDelete()}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
