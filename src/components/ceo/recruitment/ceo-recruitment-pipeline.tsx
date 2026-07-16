"use client";

import { cn } from "@/lib/utils";
import type { CandidateStage } from "@/types/recruitment";
import type { CeoRecruitmentPipelineStage } from "@/types/ceo-recruitment";

type CeoRecruitmentPipelineProps = {
  stages: CeoRecruitmentPipelineStage[];
  selectedStage?: CandidateStage;
  onSelect: (stage: CandidateStage | undefined) => void;
};

export function CeoRecruitmentPipeline({
  stages,
  selectedStage,
  onSelect,
}: CeoRecruitmentPipelineProps) {
  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Recruitment Pipeline</h2>
        <p className="text-xs text-muted-foreground">
          Click a stage to filter candidates
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {stages.map((stage) => {
          const isSelected = selectedStage === stage.stage;
          return (
            <button
              key={stage.stage}
              type="button"
              onClick={() => onSelect(isSelected ? undefined : stage.stage)}
              className={cn(
                "flex min-h-[5.5rem] w-full min-w-0 flex-col justify-between rounded-xl border bg-card px-3 py-3 text-left shadow-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:border-primary/30 hover:bg-primary/[0.02]",
              )}
            >
              <p className="line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">
                {stage.label}
              </p>
              <div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {stage.count}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {stage.conversionRate}% conversion
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
