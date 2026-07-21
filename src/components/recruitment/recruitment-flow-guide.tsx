import Link from "next/link";
import { ArrowRight, Briefcase, FileCheck, Send, UserPlus } from "lucide-react";

import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";

type SourceItem = { source: string; count: number };

const STEPS = [
  {
    title: "Post job",
    description: "Create a role and set status to Open.",
    href: RECRUITMENT_ROUTES.jobs,
    icon: Briefcase,
  },
  {
    title: "Add leads",
    description: "Add applicants and pick a source to track where they came from.",
    href: RECRUITMENT_ROUTES.candidates,
    icon: UserPlus,
  },
  {
    title: "Interview",
    description: "Schedule rounds and move candidates through stages.",
    href: RECRUITMENT_ROUTES.interviews,
    icon: FileCheck,
  },
  {
    title: "Send offer",
    description: "Create an offer and mark Sent when the candidate receives it.",
    href: RECRUITMENT_ROUTES.offers,
    icon: Send,
  },
] as const;

export function RecruitmentFlowGuide({ sources }: { sources: SourceItem[] }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">How recruitment works</h2>
        <p className="text-xs text-muted-foreground">
          Post roles, capture leads, track stages, and send offers — all in one place.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="group rounded-xl border bg-background p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">Step {index + 1}</span>
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            <span className="mt-2 inline-flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Open <ArrowRight className="ml-1 h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-xl border bg-muted/20 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">Lead sources</p>
          <Link href={RECRUITMENT_ROUTES.analytics} className="text-[11px] font-medium text-primary">
            View analytics
          </Link>
        </div>
        {sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No leads yet. When you add candidates, set Source (LinkedIn, Referral, etc.) to track
            where applicants come from.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sources.map((item) => (
              <span
                key={item.source}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs"
              >
                <span className="font-medium">{item.source}</span>
                <span className="tabular-nums text-muted-foreground">{item.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
