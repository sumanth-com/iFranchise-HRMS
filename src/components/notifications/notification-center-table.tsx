"use client";

import { formatDistanceToNow } from "date-fns";
import { Archive, Check, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import {
  archiveNotificationAction,
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import {
  NOTIFICATION_CENTER_TABS,
  NOTIFICATIONS_ROUTES,
  formatNotificationModule,
  type NotificationCenterTab,
} from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";
import type { NotificationListItem, NotificationListResult } from "@/types/notifications";

type Props = {
  result: NotificationListResult;
  tab: NotificationCenterTab;
  search: string;
  showRecipient?: boolean;
  centerPath?: string;
};

export function NotificationCenterTable({
  result,
  tab,
  search,
  showRecipient = false,
  centerPath = NOTIFICATIONS_ROUTES.center,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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

  const columns = useMemo<DataTableColumn<NotificationListItem>[]>(() => {
    const cols: DataTableColumn<NotificationListItem>[] = [
      {
        key: "type",
        header: "Type",
        render: (row) => <span className="text-xs font-medium uppercase">{row.type}</span>,
      },
      { key: "title", header: "Title", render: (row) => <span className="font-medium">{row.title}</span> },
      {
        key: "message",
        header: "Message",
        className: "max-w-xs",
        render: (row) => <span className="line-clamp-2 text-muted-foreground">{row.message}</span>,
      },
      {
        key: "module",
        header: "Module",
        render: (row) => formatNotificationModule(row.module),
      },
      {
        key: "priority",
        header: "Priority",
        render: (row) => <NotificationPriorityBadge priority={row.priority} />,
      },
    ];

    if (showRecipient) {
      cols.push({
        key: "recipientName",
        header: "Recipient",
        render: (row) => row.recipientName ?? "—",
      });
    }

    cols.push(
      {
        key: "createdAt",
        header: "Created At",
        render: (row) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <NotificationStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-1">
            {row.actionUrl ? (
              <Link
                href={row.actionUrl}
                className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-primary hover:underline"
              >
                Open
              </Link>
            ) : null}
            {row.status === "unread" ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mark read"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await markNotificationReadAction(row.id);
                    if (res.success) toast.success("Marked as read");
                    else toast.error(res.message);
                  });
                }}
              >
                <Check className="size-4" />
              </Button>
            ) : null}
            {row.status !== "archived" ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Archive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await archiveNotificationAction(row.id);
                    if (res.success) toast.success("Archived");
                    else toast.error(res.message);
                  });
                }}
              >
                <Archive className="size-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteNotificationAction(row.id);
                  if (res.success) toast.success("Deleted");
                  else toast.error(res.message);
                });
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    );

    return cols;
  }, [isPending, showRecipient]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {NOTIFICATION_CENTER_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setParams({ tab: item.value, page: "1" })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === item.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search notifications..."
            defaultValue={search}
            className="w-full sm:w-64"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParams({ search: e.currentTarget.value || undefined, page: "1" });
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await markAllNotificationsReadAction();
                if (res.success) toast.success("All notifications marked as read");
                else toast.error(res.message);
              });
            }}
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Mark all read
          </Button>
        </div>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up. New alerts will appear here."
        />
      ) : (
        <DataTable columns={columns} data={result.items} />
      )}

      {result.total > result.pageSize ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {result.page} · {result.total} total
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
    </div>
  );
}
