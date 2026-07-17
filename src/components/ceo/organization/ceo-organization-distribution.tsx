"use client";

import { Building2 } from "lucide-react";

import type { CeoOrgWorkforceInsights } from "@/types/ceo-organization";

const DONUT_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#94a3b8",
];

function Donut({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = items.map((item, index) => {
    const fraction = total > 0 ? item.value / total : 0;
    const length = fraction * circumference;
    const segment = {
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      length,
      offset: -cumulative,
    };
    cumulative += length;
    return segment;
  });

  return (
    <div className="relative shrink-0">
      <svg viewBox="0 0 100 100" className="size-36 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="11"
          className="stroke-muted"
        />
        {total > 0 &&
          segments.map((segment, index) => (
            <circle
              key={index}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="11"
              stroke={segment.color}
              strokeDasharray={`${segment.length} ${circumference - segment.length}`}
              strokeDashoffset={segment.offset}
            />
          ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl leading-none font-semibold tabular-nums">{total}</span>
        <span className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">
          People
        </span>
      </div>
    </div>
  );
}

export function CeoOrganizationDistribution({
  insights,
}: {
  insights: CeoOrgWorkforceInsights;
}) {
  const items = insights.departmentDistribution;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">Workforce Distribution</h2>
          <p className="text-xs text-muted-foreground">
            Headcount split across departments for the selected scope.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No workforce data for the current filters.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Donut items={items} />
          <ul className="grid w-full min-w-0 flex-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {items.map((item, index) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
