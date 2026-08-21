"use client";

import { formatEnterpriseNotificationMessage } from "@/lib/notifications/notification-message-format";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  title?: string;
  moduleLabel?: string;
  variant?: "detail" | "preview";
  className?: string;
};

export function NotificationMessageBody({
  message,
  title,
  moduleLabel,
  variant = "detail",
  className,
}: Props) {
  const text = formatEnterpriseNotificationMessage(message);

  if (variant === "preview") {
    return (
      <p className={cn("line-clamp-2 text-sm text-muted-foreground", className)}>{text}</p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            What happened
          </p>
          {moduleLabel ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {moduleLabel}
            </span>
          ) : null}
        </div>
        {title ? (
          <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        ) : null}
        <p className="mt-2 text-[15px] leading-7 text-foreground/90 whitespace-pre-wrap">
          {text}
        </p>
        <p className="mt-4 border-t border-border/60 pt-3 text-sm leading-6 text-muted-foreground">
          This is an informational update from HR. No action is required from this screen.
        </p>
      </div>
    </div>
  );
}
