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
    <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight capitalize",
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
  bodyClassName,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="shrink-0 border-b px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </div>
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-3", bodyClassName)}>
        {children}
      </div>
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
