import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthNoticeVariant = "info" | "warning" | "success";

type AuthNoticeProps = {
  children: ReactNode;
  variant?: AuthNoticeVariant;
  title?: string;
  className?: string;
};

const VARIANT_STYLES: Record<
  AuthNoticeVariant,
  {
    shell: string;
    iconWrap: string;
    icon: string;
    title: string;
    body: string;
    Icon: typeof Info;
  }
> = {
  info: {
    shell:
      "border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-500/25 dark:bg-indigo-500/10",
    iconWrap: "bg-[#5f55ee]/15 text-[#5f55ee] dark:bg-[#5f55ee]/20 dark:text-indigo-300",
    icon: "text-[#5f55ee] dark:text-indigo-300",
    title: "text-slate-900 dark:text-indigo-100",
    body: "text-slate-600 dark:text-slate-300",
    Icon: Info,
  },
  warning: {
    shell:
      "border-amber-200/90 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-500/10",
    iconWrap: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    icon: "text-amber-700 dark:text-amber-300",
    title: "text-amber-950 dark:text-amber-100",
    body: "text-amber-900/90 dark:text-amber-200/90",
    Icon: AlertCircle,
  },
  success: {
    shell:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    iconWrap: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    icon: "text-emerald-700 dark:text-emerald-300",
    title: "text-emerald-950 dark:text-emerald-100",
    body: "text-emerald-900/90 dark:text-emerald-200/90",
    Icon: CheckCircle2,
  },
};

/** Soft HRMS notice used on auth pages (login, forgot, reset). */
export function AuthNotice({
  children,
  variant = "info",
  title,
  className,
}: AuthNoticeProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.Icon;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-sm",
        styles.shell,
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
          styles.iconWrap,
        )}
      >
        <Icon className={cn("size-4", styles.icon)} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 space-y-0.5">
        {title ? (
          <p className={cn("text-sm font-semibold", styles.title)}>{title}</p>
        ) : null}
        <p className={cn("text-[13px] leading-snug font-medium", styles.body)}>
          {children}
        </p>
      </div>
    </div>
  );
}
