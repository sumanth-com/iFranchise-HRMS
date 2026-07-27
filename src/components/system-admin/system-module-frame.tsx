import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type SystemModuleFrameProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SystemModuleFrame({
  title,
  description,
  children,
  className,
}: SystemModuleFrameProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3 overflow-hidden", className)}>
      <div className="shrink-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export function SystemMetric({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          variant === "success" && "text-emerald-600",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SystemPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card shadow-sm", className)}>
      {title ? (
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="p-3">{children}</div>
    </div>
  );
}

export function downloadBase64(filename: string, mimeType: string, contentBase64: string) {
  const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
