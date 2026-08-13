"use client";

import { cn } from "@/lib/utils";

type Props = {
  healthy: boolean;
  responseMs: number;
  activeEmployees: number;
  auditEvents24h: number;
  storageBuckets: number;
  className?: string;
};

const CONNECTIONS = [
  { label: "API gateway", load: 72 },
  { label: "Auth service", load: 54 },
  { label: "Object storage", load: 63 },
  { label: "Query cache", load: 81 },
] as const;

export function SystemDatabasePulse({
  healthy,
  responseMs,
  activeEmployees,
  auditEvents24h,
  storageBuckets,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "sys-db-stage relative flex h-full min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-emerald-200/80 bg-[#f7fffb] shadow-sm",
        className,
      )}
      data-tone={healthy ? "healthy" : "critical"}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_12%,rgba(16,185,129,0.12),transparent_46%)]" />

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-emerald-100 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Live database
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {healthy ? "PostgreSQL cluster online" : "Database unreachable"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            healthy
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-red-500/10 text-red-700",
          )}
        >
          <span
            className={cn(
              "sys-db-breathe size-1.5 rounded-full",
              healthy ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          {healthy ? "Live" : "Critical"}
        </span>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 bg-[#f7fffb] p-4">
        {/* Hero — mint always on, modern data-core (no drum) */}
        <div className="relative flex min-h-[11.5rem] items-center justify-center overflow-hidden rounded-2xl border border-emerald-200/80 bg-[linear-gradient(165deg,#ffffff_0%,#f0fdf4_42%,#dcfce7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.16)_1px,transparent_0)] [background-size:16px_16px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(16,185,129,0.18),transparent_58%)]" />

          {/* Soft rings */}
          <div className="sys-db-orbit absolute size-40 rounded-full border border-emerald-300/50 border-t-emerald-500/80" />
          <div className="sys-db-orbit-rev absolute size-52 rounded-full border border-dashed border-emerald-300/70 border-b-emerald-500/60" />
          <div
            className="sys-db-orbit absolute size-60 rounded-full border border-emerald-200/80"
            style={{ animationDuration: "24s" }}
          />

          <div className="sys-db-orbit absolute size-52">
            <span className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]" />
            <span className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.45)]" />
            <span className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          </div>

          {/* New center: hexagonal data core */}
          <div className="sys-db-core relative z-10 flex size-[5.75rem] items-center justify-center">
            <div className="sys-db-breathe absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />

            {/* Outer hex ring */}
            <div
              className="sys-db-orbit absolute size-[5.4rem] opacity-80"
              style={{
                clipPath:
                  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                background:
                  "linear-gradient(145deg, rgba(16,185,129,0.35), rgba(255,255,255,0.2), rgba(5,150,105,0.45))",
                padding: "2px",
              }}
            >
              <div
                className="size-full bg-[#f0fdf4]"
                style={{
                  clipPath:
                    "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                }}
              />
            </div>

            {/* Inner glass hex */}
            <div
              className="relative z-10 flex size-[3.6rem] items-center justify-center shadow-[0_10px_28px_rgba(16,185,129,0.28)]"
              style={{
                clipPath:
                  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                background:
                  "linear-gradient(160deg, #6ee7b7 0%, #10b981 45%, #047857 100%)",
              }}
            >
              <div
                className="flex size-[2.55rem] items-center justify-center bg-white/20 backdrop-blur-[1px]"
                style={{
                  clipPath:
                    "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                }}
              >
                <span className="sys-db-breathe size-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              </div>
              <div className="sys-db-shine pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>

            {/* Tiny orbiting chips */}
            <span className="sys-db-orbit absolute size-16">
              <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 rounded-sm bg-emerald-600" />
            </span>
          </div>

          {/* Side signal lines */}
          <div className="pointer-events-none absolute inset-y-7 left-5 flex w-9 flex-col justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={`l-${i}`}
                className="sys-db-spark h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-emerald-500 to-transparent"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-7 right-5 flex w-9 flex-col justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={`r-${i}`}
                className="sys-db-spark h-[2px] w-full origin-right rounded-full bg-gradient-to-l from-emerald-500 to-transparent"
                style={{ animationDelay: `${i * 0.2 + 0.1}s` }}
              />
            ))}
          </div>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-semibold tracking-wide text-emerald-700 shadow-[0_4px_14px_rgba(16,185,129,0.18)]">
            STREAMING · {responseMs}ms
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
          <div className="flex min-h-0 flex-col rounded-xl border border-emerald-100/80 bg-white p-3 transition-colors duration-300 hover:border-emerald-200 hover:bg-gradient-to-b hover:from-white hover:to-emerald-50/80">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Throughput
              </p>
              <p className="text-[11px] font-medium tabular-nums text-emerald-700">
                {responseMs}ms
              </p>
            </div>
            <div className="relative flex min-h-[4.5rem] flex-1 items-end gap-[3px] overflow-hidden rounded-lg border border-emerald-50 bg-emerald-50/40 px-2 py-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="sys-db-bar min-w-0 flex-1 rounded-sm bg-[linear-gradient(180deg,#6ee7b7,#10b981)]"
                  style={{
                    height: `${35 + ((i * 17) % 55)}%`,
                    animationDelay: `${(i % 8) * 0.1}s`,
                    animationDuration: `${1.1 + (i % 5) * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-100/80 bg-white transition-colors duration-300 hover:border-emerald-200 hover:bg-gradient-to-b hover:from-white hover:to-emerald-50/70">
            <div className="border-b border-emerald-50 px-3 py-2">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Connections
              </p>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-emerald-50/80 overflow-y-auto">
              {CONNECTIONS.map((item, i) => (
                <li key={item.label} className="flex items-center gap-2.5 px-3 py-2">
                  <span
                    className="sys-db-breathe size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-foreground">{item.label}</p>
                      <p className="text-[11px] font-medium text-emerald-600">{item.load}%</p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-emerald-50">
                      <div
                        className="sys-db-load h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        style={{
                          width: `${item.load}%`,
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sys-db-ticker shrink-0 overflow-hidden rounded-lg border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-white px-3 py-2 font-mono text-[10px] text-emerald-700 transition-colors duration-300 hover:from-emerald-50 hover:via-emerald-100/80 hover:to-emerald-50">
          <div className="sys-db-ticker-track flex gap-10 whitespace-nowrap">
            <span>SELECT employees · {activeEmployees} active</span>
            <span>INSERT audit_logs · {auditEvents24h}/24h</span>
            <span>STORAGE buckets · {storageBuckets}</span>
            <span>HEALTH ping · {responseMs}ms</span>
            <span>SELECT employees · {activeEmployees} active</span>
            <span>INSERT audit_logs · {auditEvents24h}/24h</span>
            <span>STORAGE buckets · {storageBuckets}</span>
            <span>HEALTH ping · {responseMs}ms</span>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricChip label="Latency" value={`${responseMs}ms`} healthy={healthy} />
          <MetricChip label="Active users" value={String(activeEmployees)} healthy={healthy} />
          <MetricChip label="Audit 24h" value={String(auditEvents24h)} healthy={healthy} />
          <MetricChip label="Buckets" value={String(storageBuckets)} healthy={healthy} />
        </div>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  healthy,
}: {
  label: string;
  value: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-100/70 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:bg-gradient-to-b hover:from-white hover:to-emerald-50">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          healthy ? "text-foreground" : "text-red-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}
