import Link from "next/link";

import { CANDIDATE_STAGE_LABELS, RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { cn } from "@/lib/utils";
import type { CandidateStage } from "@/types/recruitment";

const PIPELINE_STAGES: CandidateStage[] = [
  "applied",
  "screening",
  "technical",
  "hr",
  "ceo",
  "offer",
];

const STAGE_THEME: Record<
  CandidateStage,
  { bar: string; glow: string; label: string; dot: string }
> = {
  applied: {
    bar: "bg-sky-500",
    glow: "shadow-sky-200",
    label: "text-sky-700",
    dot: "bg-sky-500",
  },
  screening: {
    bar: "bg-blue-500",
    glow: "shadow-blue-200",
    label: "text-blue-700",
    dot: "bg-blue-500",
  },
  technical: {
    bar: "bg-indigo-500",
    glow: "shadow-indigo-200",
    label: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  hr: {
    bar: "bg-violet-500",
    glow: "shadow-violet-200",
    label: "text-violet-700",
    dot: "bg-violet-500",
  },
  ceo: {
    bar: "bg-purple-500",
    glow: "shadow-purple-200",
    label: "text-purple-700",
    dot: "bg-purple-500",
  },
  offer: {
    bar: "bg-fuchsia-500",
    glow: "shadow-fuchsia-200",
    label: "text-fuchsia-700",
    dot: "bg-fuchsia-500",
  },
  joined: {
    bar: "bg-emerald-500",
    glow: "shadow-emerald-200",
    label: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  rejected: {
    bar: "bg-rose-500",
    glow: "shadow-rose-200",
    label: "text-rose-700",
    dot: "bg-rose-500",
  },
};

type StageItem = { stage: CandidateStage; count: number };

export function RecruitmentPipelinePanel({
  stages,
  title = "Active pipeline",
  subtitle = "Candidates across hiring stages",
}: {
  stages: StageItem[];
  title?: string;
  subtitle?: string;
}) {
  const pipeline = PIPELINE_STAGES.map((stage) => {
    const item = stages.find((entry) => entry.stage === stage);
    return { stage, count: item?.count ?? 0 };
  });
  const total = pipeline.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...pipeline.map((item) => item.count));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-br from-primary/10 to-violet-500/10">
            <span className="text-lg font-bold tabular-nums text-primary">{total}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-muted-foreground">
              {total === 0 ? "No candidates in flow" : subtitle}
            </p>
          </div>
        </div>
        <Link
          href={RECRUITMENT_ROUTES.candidates}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View candidates
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 items-end gap-3 rounded-xl border border-dashed bg-muted/20 px-3 pb-2 pt-4">
        {pipeline.map((item) => {
          const theme = STAGE_THEME[item.stage];
          const height =
            item.count > 0 ? Math.max((item.count / max) * 100, 18) : 0;

          return (
            <div
              key={item.stage}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "text-sm font-bold tabular-nums transition-colors",
                  item.count > 0 ? theme.label : "text-muted-foreground",
                )}
              >
                {item.count}
              </span>
              <div className="relative flex h-28 w-full items-end justify-center">
                <div className="absolute inset-x-0 bottom-0 h-full rounded-lg bg-background/60" />
                {height > 0 ? (
                  <div
                    className={cn(
                      "relative w-full max-w-10 rounded-t-lg shadow-sm transition-all group-hover:shadow-md",
                      theme.bar,
                      theme.glow,
                    )}
                    style={{ height: `${height}%` }}
                  />
                ) : (
                  <div className="h-1 w-full max-w-8 rounded-full bg-muted" />
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 px-0.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    item.count > 0 ? theme.dot : "bg-muted-foreground/30",
                  )}
                />
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                  {CANDIDATE_STAGE_LABELS[item.stage]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
