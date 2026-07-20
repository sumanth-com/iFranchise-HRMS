"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Check, Loader2, MoreHorizontal, Search, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
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
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import {
  NOTIFICATION_CENTER_TABS,
  NOTIFICATIONS_ROUTES,
  formatNotificationDisplayText,
  formatNotificationModule,
  formatNotificationPriority,
  type NotificationCenterTab,
} from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";
import type { NotificationListItem, NotificationListResult } from "@/types/notifications";

type Props = {
  result: NotificationListResult;
  tab: NotificationCenterTab;
  search: string;
  selectedId?: string;
  centerPath?: string;
  showTabs?: boolean;
  showToolbarSearch?: boolean;
  showMarkAllRead?: boolean;
  embedded?: boolean;
};

export function NotificationCenterSplitView({
  result,
  tab,
  search,
  selectedId,
  centerPath = NOTIFICATIONS_ROUTES.center,
  showTabs = true,
  showToolbarSearch = true,
  showMarkAllRead = true,
  embedded = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<NotificationListItem | null>(null);

  const selected =
    result.items.find((item) => item.id === selectedId) ??
    result.items.find((item) => item.id === searchParams.get("id")) ??
    null;

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.push(`${centerPath}?${params.toString()}`);
    },
    [centerPath, router, searchParams],
  );

  function markAsRead(item: NotificationListItem) {
    if (item.status === "read" || item.status === "archived") return;
    startTransition(async () => {
      const res = await markNotificationReadAction(item.id);
      if (res.success) router.refresh();
      else toast.error(res.message);
    });
  }

  function confirmDelete(item: NotificationListItem) {
    startTransition(async () => {
      const res = await deleteNotificationAction(item.id);
      if (res.success) {
        toast.success("Notification deleted");
        if (selected?.id === item.id) setParams({ id: undefined });
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function selectNotification(item: NotificationListItem) {
    setParams({ id: item.id });
    if (item.status === "unread") markAsRead(item);
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        embedded
          ? "min-h-[calc(100vh-14rem)] flex-1"
          : "min-h-[calc(100vh-10rem)] rounded-xl border bg-card shadow-sm",
      )}
    >
      {showTabs || showToolbarSearch || showMarkAllRead ? (
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {showTabs ? (
            <div className="flex flex-wrap items-center gap-1">
              {NOTIFICATION_CENTER_TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setParams({ tab: item.value, page: "1", id: undefined })}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === item.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          {showToolbarSearch || showMarkAllRead ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
              {showToolbarSearch ? (
                <div className="relative w-full min-w-0 sm:w-80 md:w-96">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    defaultValue={search}
                    className="h-9 w-full pl-9"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setParams({
                          search: event.currentTarget.value || undefined,
                          page: "1",
                          id: undefined,
                        });
                      }
                    }}
                  />
                </div>
              ) : null}
              {showMarkAllRead ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await markAllNotificationsReadAction();
                      if (res.success) {
                        toast.success("All notifications marked as read");
                        router.refresh();
                      } else toast.error(res.message);
                    });
                  }}
                >
                  {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Mark all read
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-[22rem] shrink-0 flex-col border-r md:w-80 lg:w-96">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {result.items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications in this view.
              </div>
            ) : (
              result.items.map((item) => (
                <NotificationListRow
                  key={item.id}
                  item={item}
                  isActive={selected?.id === item.id}
                  isPending={isPending}
                  onSelect={() => selectNotification(item)}
                  onMarkRead={() => markAsRead(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))
            )}
          </div>

          {result.total > result.pageSize ? (
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>
                Page {result.page} · {result.total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={result.page <= 1}
                  onClick={() => setParams({ page: String(result.page - 1) })}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={result.page * result.pageSize >= result.total}
                  onClick={() => setParams({ page: String(result.page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-background">
          {selected ? (
            <NotificationDetailPanel
              notification={selected}
              onClose={() => setParams({ id: undefined })}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                title="Select a notification"
                description="Choose a notification from the left to view full details here."
              />
            </div>
          )}
        </section>
      </div>

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
            Delete &ldquo;{deleteTarget.title}&rdquo;?
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

function NotificationListRow({
  item,
  isActive,
  isPending,
  onSelect,
  onMarkRead,
  onDelete,
}: {
  item: NotificationListItem;
  isActive: boolean;
  isPending: boolean;
  onSelect: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-1 border-b transition-colors",
        isActive ? "bg-accent" : "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "line-clamp-1 text-sm",
              item.status === "unread" ? "font-semibold text-foreground" : "font-medium",
            )}
          >
            {item.title}
          </p>
          {item.status === "unread" ? (
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
          ) : null}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {formatNotificationDisplayText(item.message)}
        </p>
        <p className="pt-0.5 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 mt-2 size-8 shrink-0"
              aria-label="Notification actions"
              disabled={isPending}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {item.status === "unread" ? (
            <DropdownMenuItem
              className="whitespace-nowrap"
              onClick={(event) => {
                event.stopPropagation();
                onMarkRead();
              }}
            >
              <Check className="mr-2 size-4" />
              Mark as read
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="whitespace-nowrap text-destructive focus:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NotificationDetailPanel({
  notification,
  onClose,
}: {
  notification: NotificationListItem;
  onClose: () => void;
}) {
  const metaParts = [
    formatNotificationModule(notification.module),
    formatNotificationPriority(notification.priority),
    format(new Date(notification.createdAt), "d MMM yyyy, h:mm a"),
  ];

  if (notification.readAt) {
    metaParts.push(`Read ${formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{notification.title}</h2>
              <NotificationStatusBadge status={notification.status} />
              <NotificationPriorityBadge priority={notification.priority} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Close notification"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <p className="max-w-2xl whitespace-pre-wrap text-[15px] leading-7 text-foreground">
          {formatNotificationDisplayText(notification.message)}
        </p>
      </div>
    </div>
  );
}
