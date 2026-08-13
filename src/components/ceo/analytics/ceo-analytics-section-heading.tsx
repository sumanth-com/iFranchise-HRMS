"use client";

import { SectionHelpButton } from "@/components/common/section-help-button";
import {
  CEO_ANALYTICS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";

type AnalyticsHelpKey = keyof typeof CEO_ANALYTICS_SECTION_HELP;

export function CeoAnalyticsSectionHeading({
  title,
  description,
  helpKey,
}: {
  title: string;
  description: string;
  helpKey: AnalyticsHelpKey;
}) {
  const help = CEO_ANALYTICS_SECTION_HELP[helpKey];

  return (
    <div>
      <SectionHelpButton
        title={help.title}
        points={[...help.points]}
        description={CEO_SECTION_HELP_DESCRIPTION}
      >
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </SectionHelpButton>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CeoAnalyticsEmptyNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
      {message}
    </div>
  );
}
