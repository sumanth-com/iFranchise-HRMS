import { Inbox } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  title = "No data found",
  description = "There is nothing to display here yet.",
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="outline" size="sm">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
