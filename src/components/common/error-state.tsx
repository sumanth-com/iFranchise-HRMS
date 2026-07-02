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
};

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  icon,
  retryLabel = "Try again",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-10 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
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
