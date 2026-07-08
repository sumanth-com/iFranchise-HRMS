import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-800",
  closed: "bg-zinc-200 text-zinc-700",
  applied: "bg-blue-100 text-blue-700",
  screening: "bg-indigo-100 text-indigo-700",
  technical: "bg-violet-100 text-violet-700",
  hr: "bg-cyan-100 text-cyan-800",
  ceo: "bg-purple-100 text-purple-800",
  offer: "bg-orange-100 text-orange-800",
  joined: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-200 text-zinc-700",
  no_show: "bg-red-100 text-red-700",
  sent: "bg-sky-100 text-sky-800",
  accepted: "bg-emerald-100 text-emerald-800",
  expired: "bg-amber-100 text-amber-800",
};

export function RecruitmentStatusBadge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
