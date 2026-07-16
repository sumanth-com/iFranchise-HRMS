"use client";

import { format } from "date-fns";
import { Bell, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/common/button";
import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  archiveCeoNotificationAction,
  fetchCeoNotificationDetailAction,
  markCeoNotificationReadAction,
  navigateCeoNotificationAction,
} from "@/lib/ceo/actions/ceo-notifications-actions";
import { formatNotificationDisplayText } from "@/lib/notifications/constants";
import type { CeoNotificationDetail } from "@/types/ceo-notifications";

type Props = {
  notificationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function CeoNotificationsDrawer({
  notificationId,
  open,
  onOpenChange,
  onChanged,
}: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<CeoNotificationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isActing, startActing] = useTransition();

  function reload(id: string) {
    startTransition(async () => {
      const result = await fetchCeoNotificationDetailAction({ notificationId: id });
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }

  useEffect(() => {
    if (!open || !notificationId) {
      setDetail(null);
      setError(null);
      setMessage(null);
      return;
    }
    reload(notificationId);
  }, [open, notificationId]);

  function runAction(action: () => Promise<{ success: boolean; message: string }>) {
    startActing(async () => {
      const result = await action();
      setMessage(result.message);
      if (!result.success) return;
      if (notificationId) reload(notificationId);
      onChanged();
    });
  }

  function onNavigate(href: string) {
    if (!notificationId) return;
    startActing(async () => {
      const result = await navigateCeoNotificationAction({
        notificationId,
        href,
      });
      setMessage(result.message);
      if (!result.success) return;
      onChanged();
      onOpenChange(false);
      router.push(result.href ?? href);
    });
  }

  const usefulSupport =
    detail?.supportingInfo.filter(
      (info) => info.value && String(info.value).trim() !== "—",
    ) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="text-base">Notification</SheetTitle>
        </SheetHeader>

        {isPending && !detail ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="flex-1 px-5 py-12 text-center text-sm text-destructive">
            {error}
          </p>
        ) : detail ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold tracking-tight">
                    {formatNotificationDisplayText(detail.item.title)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {formatNotificationDisplayText(detail.item.message)}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y py-4">
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Priority
                  </dt>
                  <dd className="mt-1">
                    <NotificationPriorityBadge priority={detail.item.priority} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <NotificationStatusBadge status={detail.item.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Category
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {detail.item.categoryLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Received
                  </dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums">
                    {format(new Date(detail.item.createdAt), "d MMM yyyy HH:mm")}
                  </dd>
                </div>
                {detail.item.departmentName ? (
                  <div className="col-span-2">
                    <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Department
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {detail.item.departmentName}
                    </dd>
                  </div>
                ) : null}
                {detail.relatedModuleLabel ? (
                  <div className="col-span-2">
                    <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Related module
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {detail.relatedModuleLabel}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {usefulSupport.length > 0 ? (
                <section className="mt-5 space-y-2.5">
                  <h4 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Details
                  </h4>
                  <ul className="space-y-2">
                    {usefulSupport.map((info) => (
                      <li key={info.label} className="text-sm">
                        <span className="text-muted-foreground">{info.label}: </span>
                        <span className="font-medium">{info.value}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {message ? (
                <p className="mt-4 text-sm text-muted-foreground">{message}</p>
              ) : null}
            </div>

            <div className="shrink-0 border-t bg-background px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {detail.quickActions.slice(0, 3).map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    size="sm"
                    className="h-9"
                    disabled={isActing}
                    onClick={() => onNavigate(action.href)}
                  >
                    {action.label}
                  </Button>
                ))}
                {detail.item.status === "unread" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={isActing}
                    onClick={() =>
                      runAction(() =>
                        markCeoNotificationReadAction({
                          notificationId: detail.item.id,
                        }),
                      )
                    }
                  >
                    Mark read
                  </Button>
                ) : null}
                {detail.item.status !== "archived" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={isActing}
                    onClick={() =>
                      runAction(() =>
                        archiveCeoNotificationAction({
                          notificationId: detail.item.id,
                        }),
                      )
                    }
                  >
                    Archive
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
