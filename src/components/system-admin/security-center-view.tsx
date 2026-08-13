import { format } from "date-fns";
import {
  AlertTriangle,
  KeyRound,
  ShieldAlert,
  UserX,
} from "lucide-react";
import type { ReactNode } from "react";

import { AuditStatusBadge } from "@/components/audit/audit-status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { formatAuditAction, formatAuditModule } from "@/lib/audit/constants";
import type { SecurityCenterData } from "@/lib/system-admin/services/security-center-service";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import { cn } from "@/lib/utils";

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: typeof ShieldAlert;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "danger" && "bg-red-500/10 text-red-600",
            tone === "warning" && "bg-amber-500/10 text-amber-600",
            tone === "default" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function deviceSummary(item: {
  ipAddress: string | null;
  browser: string | null;
  deviceType: string | null;
}) {
  const ip = item.ipAddress?.trim().toLowerCase();
  const usefulIp =
    ip && ip !== "::1" && ip !== "127.0.0.1" && ip !== "localhost"
      ? item.ipAddress
      : null;

  return [usefulIp, item.browser, item.deviceType].filter(Boolean).join(" · ");
}

function ScrollPanel({
  title,
  children,
  empty,
  isEmpty,
}: {
  title: string;
  children: ReactNode;
  empty: { title: string; description: string };
  isEmpty: boolean;
}) {
  return (
    <section className="flex max-h-[22rem] min-h-[14rem] flex-col overflow-hidden rounded-xl border bg-card shadow-sm xl:max-h-none xl:min-h-0">
      <div className="shrink-0 border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {isEmpty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <EmptyState title={empty.title} description={empty.description} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      )}
    </section>
  );
}

function EventList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: SecurityCenterData["recentLogins"];
}) {
  return (
    <ScrollPanel
      title={title}
      isEmpty={items.length === 0}
      empty={{ title: "Nothing here", description: empty }}
    >
      <ul className="divide-y">
        {items.map((item) => {
          const device = deviceSummary(item);
          return (
            <li key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    {humanizeActivityDescription(
                      item.description,
                      formatAuditAction(item.action),
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.userName ?? "System"}
                    {item.roleName ? ` · ${item.roleName}` : ""} ·{" "}
                    {formatAuditModule(item.module)} ·{" "}
                    {format(new Date(item.occurredAt), "dd MMM yyyy · h:mm a")}
                  </p>
                  {device ? (
                    <p className="mt-1 text-xs text-muted-foreground">{device}</p>
                  ) : null}
                </div>
                <AuditStatusBadge status={item.eventStatus} />
              </div>
            </li>
          );
        })}
      </ul>
    </ScrollPanel>
  );
}

export function SecurityCenterView({ data }: { data: SecurityCenterData }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 xl:overflow-hidden md:gap-4 md:p-5">
      <header className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Login activity, failed attempts, suspended accounts, and high-priority
          security events.
        </p>
      </header>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Failed logins (24h)"
          value={data.failedLogins24h}
          icon={AlertTriangle}
          tone={data.failedLogins24h > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="Login events (24h)"
          value={data.loginEvents24h}
          icon={KeyRound}
        />
        <MetricCard
          label="Security alerts (24h)"
          value={data.securityEvents24h}
          icon={ShieldAlert}
          tone={data.securityEvents24h > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Suspended accounts"
          value={data.suspendedAccounts.length}
          icon={UserX}
          tone={data.suspendedAccounts.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid auto-rows-fr gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:grid-rows-2 xl:overflow-hidden">
        <EventList
          title="Failed login attempts"
          empty="No failed logins in recent history."
          items={data.recentFailedLogins}
        />
        <EventList
          title="Recent successful logins"
          empty="No successful login events recorded yet."
          items={data.recentLogins}
        />
        <EventList
          title="Security events"
          empty="No high-priority security events right now."
          items={data.recentSecurityEvents}
        />

        <ScrollPanel
          title="Suspended accounts"
          isEmpty={data.suspendedAccounts.length === 0}
          empty={{
            title: "No suspended accounts",
            description: "Suspended portal accounts will appear here for review.",
          }}
        >
          <ul className="divide-y">
            {data.suspendedAccounts.map((account) => (
              <li key={account.id} className="px-4 py-3">
                <p className="text-sm font-medium">{account.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {account.employeeCode} · {account.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last login:{" "}
                  {account.lastLoginAt
                    ? format(new Date(account.lastLoginAt), "dd MMM yyyy · h:mm a")
                    : "Never"}
                </p>
              </li>
            ))}
          </ul>
        </ScrollPanel>
      </div>

      <p className="shrink-0 text-xs text-muted-foreground">
        Password policies, MFA enrollment, and token signing remain configured via
        environment and identity provider settings — not editable as raw secrets here.
      </p>
    </div>
  );
}
