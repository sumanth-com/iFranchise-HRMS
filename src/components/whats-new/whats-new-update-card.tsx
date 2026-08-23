import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { WhatsNewUpdate } from "@/config/whats-new-updates";
import { WHATS_NEW_ROUTE } from "@/lib/auth/constants";
import { cn } from "@/lib/utils";

type WhatsNewUpdateCardProps = {
  update: WhatsNewUpdate;
};

export function WhatsNewUpdateCard({ update }: WhatsNewUpdateCardProps) {
  return (
    <article className="landing-update-card landing-animate-up">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {update.date}
        </p>
        {update.badge ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
              update.badge === "new" && "bg-sky-500/15 text-sky-700 dark:text-sky-200",
              update.badge === "improved" && "bg-violet-500/15 text-violet-700 dark:text-violet-200",
              update.badge === "fix" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
            )}
          >
            {update.badge}
          </span>
        ) : null}
        {update.releaseLabel ? (
          <span className="text-xs font-medium text-muted-foreground">
            {update.releaseLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-300">
          {update.category}
        </p>
        <h3 className="text-xl font-semibold text-foreground">{update.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {update.description}
        </p>
      </div>

      <Link
        href={`${WHATS_NEW_ROUTE}/${update.slug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
      >
        View update
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
