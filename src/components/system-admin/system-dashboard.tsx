"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  Mail,
  Server,
  Shield,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { SystemDashboardStats } from "@/lib/system-admin/queries";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
};

function StatCard({ title, value, description, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            variant === "success" && "bg-emerald-500/10 text-emerald-600",
            variant === "warning" && "bg-amber-500/10 text-amber-600",
            variant === "danger" && "bg-red-500/10 text-red-600",
            variant === "default" && "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

type SystemDashboardProps = {
  stats: SystemDashboardStats;
};

export function SystemDashboard({ stats }: SystemDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          description="Accounts with active status"
          icon={Activity}
          variant="success"
        />
        <StatCard
          title="Active Sessions"
          value={stats.activeSessionsEstimate}
          description="Estimated from active accounts"
          icon={Server}
        />
        <StatCard
          title="Storage Buckets"
          value={stats.storageUsageMb ?? "—"}
          description="Configured storage buckets"
          icon={HardDrive}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Audit Events (24h)"
          value={stats.auditEvents24h}
          icon={Activity}
        />
        <StatCard
          title="Security Alerts (24h)"
          value={stats.securityAlerts24h}
          icon={AlertTriangle}
          variant={stats.securityAlerts24h > 0 ? "warning" : "default"}
        />
        <StatCard
          title="SMTP Status"
          value={stats.smtpConfigured ? "Configured" : "Not configured"}
          icon={Mail}
          variant={stats.smtpConfigured ? "success" : "warning"}
        />
        <StatCard
          title="Database Health"
          value={stats.databaseHealthy ? "Healthy" : "Degraded"}
          icon={Database}
          variant={stats.databaseHealthy ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">System Health</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Supabase</span>
              <span className="font-medium text-emerald-600">Operational</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">API</span>
              <span className="font-medium text-emerald-600">Healthy</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Maintenance Mode</span>
              <span className={cn("font-medium", stats.maintenanceMode && "text-amber-600")}>
                {stats.maintenanceMode ? "Enabled" : "Disabled"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Email Queue</span>
              <span className="font-medium">Ready</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold">Recent Role Changes</h3>
          {stats.recentRoleChanges.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No recent role changes.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.recentRoleChanges.map((event) => (
                <li key={event.id} className="text-sm">
                  <p className="font-medium">{event.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
