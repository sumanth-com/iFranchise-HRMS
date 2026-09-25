import { AlertCircle } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  /**
   * `muted` — calm inline module fallback (preferred for unexpected load failures).
   * `destructive` — reserved for rare blocking page failures.
   */
  variant?: "muted" | "destructive";
};

export function ErrorState({
  title = "We couldn't load this section",
  description = "Please try again. If the problem continues, contact your HR administrator.",
  icon,
  retryLabel = "Retry",
  onRetry,
  className,
  variant = "muted",
}: ErrorStateProps) {
  const isDestructive = variant === "destructive";
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border p-10 text-center",
        isDestructive
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-muted/30",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          isDestructive
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon ?? <AlertCircle className="size-6" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" size="sm">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
