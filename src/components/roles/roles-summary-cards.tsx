import { Shield, ShieldCheck, ShieldPlus, Users } from "lucide-react";

import type { RolesDashboardStats } from "@/types/roles";

const CARDS = [
  {
    key: "totalRoles" as const,
    label: "Total Roles",
    icon: Shield,
    accent: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    key: "systemRoles" as const,
    label: "System Roles",
    icon: ShieldCheck,
    accent: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    key: "customRoles" as const,
    label: "Custom Roles",
    icon: ShieldPlus,
    accent: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    key: "usersAssigned" as const,
    label: "Users Assigned",
    icon: Users,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
];

export function RolesSummaryCards({ stats }: { stats: RolesDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{stats[card.key]}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
