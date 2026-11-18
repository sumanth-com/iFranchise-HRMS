import { Loader2 } from "lucide-react";

export function DashboardOpeningState() {
  return (
    <div
      className="flex min-h-[16rem] flex-1 items-center justify-center px-4 py-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
        <span>Opening your dashboard…</span>
      </div>
    </div>
  );
}
