"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
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
import {
  formatNotificationDisplayText,
  formatNotificationModule,
  getNotificationsRoutes,
} from "@/lib/notifications/constants";
import {
  attachNotificationSoundUnlock,
  playNotificationSound,
} from "@/lib/notifications/play-notification-sound";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import type {
  NotificationBellData,
  NotificationBellItem,
} from "@/types/notifications";

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const { portalHome } = useAuth();
  const routes = useMemo(
    () => getNotificationsRoutes(portalHome),
    [portalHome],
  );
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
        (item) =>
          item.status === "unread" && !knownIdsRef.current.has(item.id),
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

  function removeFromBell(itemId: string) {
    setData((prev) => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1),
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  }

  function openNotification(item: NotificationBellItem) {
    setOpen(false);
    router.push(`${routes.center}?id=${item.id}`);
  }

  function markAsRead(item: NotificationBellItem, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    removeFromBell(item.id);
    startTransition(async () => {
      const res = await markNotificationReadAction(item.id);
      if (!res.success) {
        toast.error(res.message);
        await refresh();
        return;
      }
      await refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
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
                setData((prev) => ({
                  ...prev,
                  unreadCount: 0,
                  items: [],
                }));
                startTransition(async () => {
                  const res = await markAllNotificationsReadAction();
                  if (res.success) {
                    toast.success("All marked as read");
                    await refresh();
                  } else {
                    toast.error(res.message);
                    await refresh();
                  }
                });
              }}
            >
              {isPending ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : null}
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data.items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No unread notifications
          </div>
        ) : (
          data.items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-pointer flex-col items-start gap-2 p-3"
              onClick={() => openNotification(item)}
            >
              <div className="min-w-0 w-full flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    item.status === "unread" && "text-foreground",
                  )}
                >
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {formatNotificationDisplayText(item.message)}
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {formatNotificationModule(item.module)}
                </span>
                <div className="flex items-center gap-2">
                  <NotificationPriorityBadge priority={item.priority} />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-medium text-primary">
                  Open in notifications
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={isPending}
                  onClick={(event) => markAsRead(item, event)}
                >
                  Mark as read
                </Button>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link
              href={routes.center}
              className="w-full justify-center text-center"
            >
              View all notifications
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
