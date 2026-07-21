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

const STAGE_STYLES: Record<CandidateStage, string> = {
  applied: "from-sky-500 to-blue-500",
  screening: "from-blue-500 to-indigo-500",
  technical: "from-indigo-500 to-violet-500",
  hr: "from-violet-500 to-purple-500",
  ceo: "from-purple-500 to-fuchsia-500",
  offer: "from-fuchsia-500 to-pink-500",
  joined: "from-emerald-500 to-teal-500",
  rejected: "from-rose-500 to-red-500",
};

type StageItem = { stage: CandidateStage; count: number };

type CandidatesByStagePipelineProps = {
  stages: StageItem[];
};

export function CandidatesByStagePipeline({ stages }: CandidatesByStagePipelineProps) {
  const pipeline = PIPELINE_STAGES.map((stage) => {
    const item = stages.find((entry) => entry.stage === stage);
    return { stage, count: item?.count ?? 0 };
  });
  const total = pipeline.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...pipeline.map((item) => item.count));

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-muted/20 to-violet-500/5 px-3 py-4">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-[11px] text-muted-foreground">In active pipeline</p>
        </div>
        <p className="rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
          Applied → Offer
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {pipeline.map((item, index) => {
          const width = 100 - index * 8;
          const intensity = item.count > 0 ? Math.max(28, (item.count / max) * 100) : 0;

          return (
            <div
              key={item.stage}
              className="relative transition-all"
              style={{ width: `${width}%` }}
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r px-3 py-2.5 text-white shadow-sm",
                  STAGE_STYLES[item.stage],
                )}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-white/15 transition-all"
                  style={{ width: `${intensity}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{CANDIDATE_STAGE_LABELS[item.stage]}</span>
                  <span className="text-sm font-semibold tabular-nums">{item.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
