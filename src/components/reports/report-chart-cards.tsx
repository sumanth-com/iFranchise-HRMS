export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-3 shadow-sm">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle ? (
        <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      ) : (
        <div className="mb-3" />
      )}
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function BarRow({
  label,
  value,
  max,
  color = "bg-primary",
  formatValue,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  formatValue?: (value: number) => string;
}) {
  const display = formatValue ? formatValue(value) : String(value);
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-xs">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-muted-foreground">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
