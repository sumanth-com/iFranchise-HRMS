import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, Video } from "lucide-react";

import { InterviewRoundProgress } from "@/components/recruitment/interview-round-progress";
import {
  INTERVIEW_TYPE_LABELS,
  RECRUITMENT_ROUTES,
} from "@/lib/recruitment/constants";
import { cn } from "@/lib/utils";
import type { InterviewTrackItem } from "@/types/recruitment";

function parseInterviewDate(dateStr: string) {
  try {
    return parseISO(dateStr);
  } catch {
    return new Date(dateStr);
  }
}

export function UpcomingInterviewsPanel({
  tracks,
  limit = 3,
  className,
}: {
  tracks: InterviewTrackItem[];
  limit?: number;
  className?: string;
}) {
  const items = tracks.slice(0, limit);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-2 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Upcoming interviews</h2>
            <p className="text-[10px] text-muted-foreground">Candidate round progress</p>
          </div>
        </div>
        <Link
          href={RECRUITMENT_ROUTES.interviews}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 text-center">
            <Calendar className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-medium text-muted-foreground">No interviews scheduled</p>
            <Link
              href={RECRUITMENT_ROUTES.interviews}
              className="mt-1 text-[11px] font-medium text-primary hover:underline"
            >
              Schedule one
            </Link>
          </div>
        ) : (
          items.map((track, index) => {
            const date = parseInterviewDate(track.nextDate);
            const isOnline = track.interviewType !== "offline";
            const activeRound =
              track.rounds.find((r) => r.interviewStatus === "scheduled") ??
              track.rounds[track.rounds.length - 1];

            return (
              <div
                key={`${track.candidateId}-${track.nextDate}-${track.nextTime}-${index}`}
                className="rounded-xl border bg-background p-2.5 transition hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{track.candidateName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{track.jobTitle}</p>
                  </div>
                  <span className="shrink-0 rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {format(date, "MMM d")} · {track.nextTime}
                  </span>
                </div>

                <div className="mt-2.5 px-1">
                  <InterviewRoundProgress rounds={track.rounds} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  {activeRound ? (
                    <span className="font-medium text-foreground">{activeRound.roundName}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {track.nextTime}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {isOnline ? (
                      <Video className="h-3 w-3" />
                    ) : (
                      <MapPin className="h-3 w-3" />
                    )}
                    {INTERVIEW_TYPE_LABELS[track.interviewType]}
                  </span>
                  {track.interviewerName ? (
                    <span>With {track.interviewerName}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
