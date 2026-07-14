"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPriorityBadge } from "@/components/notifications/notification-status-badge";
import {
  getNotificationBellDataAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import { formatNotificationDisplayText, formatNotificationModule, getNotificationsRoutes } from "@/lib/notifications/constants";
import {
  attachNotificationSoundUnlock,
  playNotificationSound,
} from "@/lib/notifications/play-notification-sound";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { NotificationBellData } from "@/types/notifications";

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { portalHome } = useAuth();
  const routes = useMemo(() => getNotificationsRoutes(portalHome), [portalHome]);
  const [data, setData] = useState<NotificationBellData>({
    unreadCount: 0,
    items: [],
    soundEnabled: true,
    notificationSound: "classic",
  });
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await getNotificationBellDataAction();
    if (!res.success) return;

    const next = res.data;
    if (initializedRef.current && next.soundEnabled) {
      const hasNewUnread = next.items.some(
        (item) => item.status === "unread" && !knownIdsRef.current.has(item.id),
      );
      if (hasNewUnread) playNotificationSound(next.notificationSound);
    }

    for (const item of next.items) {
      knownIdsRef.current.add(item.id);
    }
    initializedRef.current = true;
    setData(next);
  }, []);

  useEffect(() => {
    attachNotificationSoundUnlock();
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5" />
            {data.unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {data.unreadCount > 99 ? "99+" : data.unreadCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {data.unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await markAllNotificationsReadAction();
                  if (res.success) {
                    toast.success("All marked as read");
                    await refresh();
                  } else toast.error(res.message);
                });
              }}
            >
              {isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data.items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          data.items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-default flex-col items-start gap-1 p-3"
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", item.status === "unread" && "text-foreground")}>
                    {item.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {formatNotificationDisplayText(item.message)}
                  </p>
                </div>
                {item.status === "unread" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label="Mark read"
                    onClick={() => {
                      startTransition(async () => {
                        const res = await markNotificationReadAction(item.id);
                        if (res.success) await refresh();
                      });
                    }}
                  >
                    <Check className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {formatNotificationModule(item.module)}
                </span>
                <div className="flex items-center gap-2">
                  <NotificationPriorityBadge priority={item.priority} />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <Link
                href={`${routes.center}?id=${item.id}`}
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                View details
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href={routes.center} className="w-full justify-center text-center">
              View all notifications
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
