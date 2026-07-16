"use client";

import { format } from "date-fns";
import { Archive, Eye } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import { formatNotificationDisplayText } from "@/lib/notifications/constants";
import type { CeoNotificationListItem } from "@/types/ceo-notifications";
import { cn } from "@/lib/utils";

type Props = {
  rows: CeoNotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onArchive: (id: string) => void;
};

export function CeoNotificationsTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
  onArchive,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Inbox</h2>
        <p className="text-xs text-muted-foreground">
          {total} notification{total === 1 ? "" : "s"}
          {isLoading ? " · Refreshing…" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
          No notifications match these filters.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const unread = row.status === "unread";
            return (
              <li
                key={row.id}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-sm transition-opacity",
                  unread && "border-primary/25 bg-primary/[0.03]",
                  isLoading && "opacity-60",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onView(row.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {unread ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />
                      ) : null}
                      <p className="text-sm font-semibold tracking-tight">
                        {formatNotificationDisplayText(row.title)}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {formatNotificationDisplayText(row.message)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{row.categoryLabel}</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {format(new Date(row.createdAt), "d MMM yyyy HH:mm")}
                      </span>
                      {row.departmentName ? (
                        <>
                          <span>·</span>
                          <span>{row.departmentName}</span>
                        </>
                      ) : null}
                    </div>
                  </button>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <NotificationPriorityBadge priority={row.priority} />
                    <NotificationStatusBadge status={row.status} />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() => onView(row.id)}
                    >
                      <Eye className="size-3.5" />
                      View
                    </Button>
                    {row.status !== "archived" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => onArchive(row.id)}
                      >
                        <Archive className="size-3.5" />
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
