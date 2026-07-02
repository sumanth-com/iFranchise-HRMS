import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export function LoadingSpinner({
  className,
  size = "md",
  label = "Loading",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex items-center justify-center", className)}
    >
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
