import { ChevronRight } from "lucide-react";

import { CANDIDATE_STAGE_LABELS } from "@/lib/recruitment/constants";
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

const STAGE_ACCENTS: Record<CandidateStage, { bar: string; chip: string; ring: string }> = {
  applied: {
    bar: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    ring: "ring-sky-200",
  },
  screening: {
    bar: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    ring: "ring-blue-200",
  },
  technical: {
    bar: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ring: "ring-indigo-200",
  },
  hr: {
    bar: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    ring: "ring-violet-200",
  },
  ceo: {
    bar: "bg-purple-500",
    chip: "bg-purple-50 text-purple-700 border-purple-200",
    ring: "ring-purple-200",
  },
  offer: {
    bar: "bg-fuchsia-500",
    chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    ring: "ring-fuchsia-200",
  },
  joined: {
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ring: "ring-emerald-200",
  },
  rejected: {
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    ring: "ring-rose-200",
  },
};

type StageItem = { stage: CandidateStage; count: number };

type CandidatesByStagePipelineProps = {
  stages: StageItem[];
  variant?: "horizontal" | "bars";
};

export function CandidatesByStagePipeline({
  stages,
  variant = "horizontal",
}: CandidatesByStagePipelineProps) {
  const pipeline = PIPELINE_STAGES.map((stage) => {
    const item = stages.find((entry) => entry.stage === stage);
    return { stage, count: item?.count ?? 0 };
  });
  const total = pipeline.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...pipeline.map((item) => item.count));

  if (variant === "bars") {
    return (
      <div className="space-y-2">
        {pipeline.map((item) => {
          const accent = STAGE_ACCENTS[item.stage];
          const width = item.count > 0 ? Math.max((item.count / max) * 100, 12) : 0;
          return (
            <div key={item.stage} className="flex items-center gap-2">
              <span className="w-[4.5rem] shrink-0 text-[10px] font-medium text-muted-foreground">
                {CANDIDATE_STAGE_LABELS[item.stage]}
              </span>
              <div className="h-6 flex-1 rounded-md bg-muted/60">
                {width > 0 ? (
                  <div
                    className={cn("flex h-full items-center rounded-md px-2", accent.bar)}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-white">
                      {item.count}
                    </span>
                  </div>
                ) : null}
              </div>
              <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-lg font-semibold tabular-nums">{total}</p>
        <p className="text-[10px] text-muted-foreground">in pipeline</p>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-0.5 overflow-x-auto pb-1">
        {pipeline.map((item, index) => {
          const accent = STAGE_ACCENTS[item.stage];
          const isLast = index === pipeline.length - 1;

          return (
            <div key={item.stage} className="flex min-w-0 flex-1 items-center">
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center rounded-lg border bg-card px-1 py-2 text-center shadow-sm",
                  item.count > 0 && `ring-1 ${accent.ring}`,
                )}
              >
                <span
                  className={cn(
                    "mb-1.5 inline-flex min-w-[1.75rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                    accent.chip,
                  )}
                >
                  {item.count}
                </span>
                <span className="truncate text-[9px] font-medium leading-tight text-foreground">
                  {CANDIDATE_STAGE_LABELS[item.stage]}
                </span>
                <div className="mt-1.5 h-1 w-full max-w-[2.5rem] rounded-full bg-muted/70">
                  <div
                    className={cn("h-full rounded-full transition-all", accent.bar)}
                    style={{
                      width:
                        item.count > 0 ? `${Math.max((item.count / max) * 100, 20)}%` : "0%",
                    }}
                  />
                </div>
              </div>
              {!isLast ? (
                <ChevronRight
                  className="mx-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
