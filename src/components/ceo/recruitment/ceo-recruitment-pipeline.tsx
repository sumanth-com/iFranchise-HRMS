"use client";

import { ChevronDown } from "lucide-react";

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
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Recruitment Pipeline</h2>
        <p className="text-xs text-muted-foreground">
          Stage counts and conversion · click a stage to filter candidates
        </p>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {stages.map((stage, index) => {
          const isSelected = selectedStage === stage.stage;
          return (
            <div key={stage.stage} className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-stretch">
              <button
                type="button"
                onClick={() => onSelect(isSelected ? undefined : stage.stage)}
                className={cn(
                  "flex w-full flex-col rounded-xl border px-3 py-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "bg-background hover:bg-muted/40",
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">{stage.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{stage.count}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Conversion {stage.conversionRate}%
                </p>
                <p className="mt-2 text-[11px] font-medium text-primary">
                  {isSelected ? "Clear stage filter" : "View candidates"}
                </p>
              </button>

              {index < stages.length - 1 ? (
                <div className="flex items-center justify-center py-1 lg:px-1.5 lg:py-0">
                  <ChevronDown className="size-4 text-muted-foreground lg:-rotate-90" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
