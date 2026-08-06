"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/common/button";
import { formatEnterpriseNotificationMessage } from "@/lib/notifications/notification-message-format";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  actionUrl?: string | null;
  variant?: "detail" | "preview";
  className?: string;
};

export function NotificationMessageBody({
  message,
  actionUrl,
  variant = "detail",
  className,
}: Props) {
  const text = formatEnterpriseNotificationMessage(message);

  if (variant === "preview") {
    return (
      <p className={cn("line-clamp-2 text-xs text-muted-foreground", className)}>{text}</p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border bg-muted/15 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notification details
        </p>
        <p className="mt-3 text-[15px] leading-7 text-foreground">{text}</p>
      </div>

      {actionUrl?.trim() ? (
        <Link
          href={actionUrl}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View related item
        </Link>
      ) : null}
    </div>
  );
}
