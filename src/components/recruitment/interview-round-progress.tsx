import { cn } from "@/lib/utils";
import type { InterviewStatus, InterviewTrackRound } from "@/types/recruitment";

type InterviewRoundProgressProps = {
  rounds: InterviewTrackRound[];
  className?: string;
};

function nodeState(status: InterviewStatus) {
  if (status === "completed") {
    return {
      node: "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200",
      line: "bg-emerald-400",
      pulse: false,
    };
  }
  if (status === "scheduled") {
    return {
      node: "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30 ring-2 ring-primary/20",
      line: "bg-primary/40",
      pulse: true,
    };
  }
  if (status === "no_show") {
    return {
      node: "bg-amber-100 border-amber-300 text-amber-800",
      line: "bg-amber-200",
      pulse: false,
    };
  }
  return {
    node: "bg-muted border-border text-muted-foreground",
    line: "bg-muted",
    pulse: false,
  };
}

export function InterviewRoundProgress({ rounds, className }: InterviewRoundProgressProps) {
  if (rounds.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground">No interview rounds scheduled yet.</p>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {rounds.map((round, index) => {
          const state = nodeState(round.interviewStatus);
          const isLast = index === rounds.length - 1;
          const prevCompleted =
            index > 0 && rounds[index - 1].interviewStatus === "completed";

          return (
            <div key={`${round.roundName}-${index}`} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold tabular-nums transition-all",
                    state.node,
                    state.pulse && "animate-pulse",
                  )}
                >
                  {index + 1}
                </div>
                <span className="w-full truncate text-center text-[8px] font-medium leading-tight text-muted-foreground">
                  {round.roundName}
                </span>
              </div>

              {!isLast ? (
                <div className="relative mx-0.5 h-0.5 w-full min-w-[0.75rem] max-w-[2rem] shrink-0 rounded-full bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      prevCompleted || round.interviewStatus === "completed"
                        ? "w-full bg-emerald-400"
                        : "w-0",
                    )}
                  />
                  {state.pulse ? (
                    <span className="interview-round-connector-flow" aria-hidden />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
