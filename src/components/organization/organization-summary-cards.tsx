import { Building2, Briefcase, Clock, MapPin, Network, Users } from "lucide-react";

import type { OrganizationDashboardStats } from "@/types/organization";

const CARDS = [
  { key: "branches" as const, label: "Branches", icon: Building2, accent: "text-blue-600", bg: "bg-blue-500/10" },
  { key: "departments" as const, label: "Departments", icon: Network, accent: "text-violet-600", bg: "bg-violet-500/10" },
  { key: "designations" as const, label: "Designations", icon: Briefcase, accent: "text-amber-600", bg: "bg-amber-500/10" },
  { key: "workLocations" as const, label: "Locations", icon: MapPin, accent: "text-emerald-600", bg: "bg-emerald-500/10" },
  { key: "shiftTemplates" as const, label: "Shift Templates", icon: Clock, accent: "text-cyan-600", bg: "bg-cyan-500/10" },
  { key: "employmentTypes" as const, label: "Employment Types", icon: Users, accent: "text-primary", bg: "bg-primary/10" },
];

export function OrganizationSummaryCards({ stats }: { stats: OrganizationDashboardStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{stats[card.key]}</p>
              </div>
              <div className={`rounded-lg p-1.5 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
