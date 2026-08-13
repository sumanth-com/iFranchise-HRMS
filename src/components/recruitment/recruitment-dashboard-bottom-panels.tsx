import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, Calendar } from "lucide-react";

import { remapSubNavHref } from "@/lib/navigation/remap-sub-nav";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import type { InterviewListItem } from "@/types/recruitment";

function parseInterviewDate(dateStr: string) {
  try {
    return parseISO(dateStr);
  } catch {
    return new Date(dateStr);
  }
}

export function RecruitmentDashboardBottomPanels({
  interviews,
  basePath = RECRUITMENT_ROUTES.dashboard,
  readOnly = false,
}: {
  interviews: InterviewListItem[];
  basePath?: string;
  readOnly?: boolean;
}) {
  const interviewsHref = remapSubNavHref(
    RECRUITMENT_ROUTES.interviews,
    RECRUITMENT_ROUTES.dashboard,
    basePath,
  );

  return (
    <section className="shrink-0 rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Upcoming interviews</h2>
            <p className="text-[10px] text-muted-foreground">Scheduled candidate rounds</p>
          </div>
        </div>
        <Link href={interviewsHref} className="text-[10px] font-medium text-primary hover:underline">
          {readOnly ? "View all" : "View interviews"}
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
          No interviews scheduled.
          {readOnly ? null : (
            <>
              {" "}
              <Link href={interviewsHref} className="font-medium text-primary hover:underline">
                Schedule one
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {interviews.slice(0, 5).map((item) => {
            const date = parseInterviewDate(item.interviewDate);
            return (
              <Link
                key={item.id}
                href={interviewsHref}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2.5 py-2 transition hover:border-primary/30 hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{item.candidateName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {item.jobTitle}
                    {item.roundName ? ` · ${item.roundName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                    {format(date, "MMM d")} · {item.interviewTime}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
