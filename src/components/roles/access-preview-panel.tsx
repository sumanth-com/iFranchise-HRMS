import type { RoleAccessPreview } from "@/types/roles";
import { cn } from "@/lib/utils";

type Props = {
  preview: RoleAccessPreview;
  /** Dense one-line summary for the permissions page. */
  variant?: "full" | "summary";
  className?: string;
};

export function AccessPreviewPanel({
  preview,
  variant = "full",
  className,
}: Props) {
  const moduleCount = preview.modules.length;
  const restrictedCount = preview.restrictedModules.length;
  const actionCount = preview.modules.reduce((sum, mod) => sum + mod.actions.length, 0);

  if (variant === "summary") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2.5 text-sm",
          className,
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Portals
          </span>
          {preview.portals.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            preview.portals.map((portal) => (
              <span
                key={portal.key}
                className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                title={portal.route ?? undefined}
              >
                {portal.label.replace(" Portal", "").replace(" (administration + self-service)", "")}
              </span>
            ))
          )}
        </div>
        <div className="hidden h-4 w-px bg-border sm:block" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{moduleCount}</span> modules ·{" "}
          <span className="font-medium text-foreground">{actionCount}</span> actions ·{" "}
          <span className="font-medium text-foreground">{restrictedCount}</span> restricted
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Portals</h3>
        {preview.portals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No portal access is mapped to this role.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {preview.portals.map((portal) => (
              <li key={portal.key} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{portal.label}</span>
                {portal.route ? (
                  <span className="font-mono text-xs text-muted-foreground">{portal.route}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Modules and actions</h3>
        {preview.modules.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">This role currently has no effective permissions.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {preview.modules.map((mod) => (
              <li key={mod.module} className="rounded-lg border bg-background px-3 py-2">
                <p className="text-sm font-medium">{mod.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{mod.actions.join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Restricted</h3>
        {preview.restrictedModules.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No catalog modules are restricted for this role.</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.restrictedModules.map((mod) => mod.label).join(" · ")}
          </p>
        )}
      </section>
    </div>
  );
}
