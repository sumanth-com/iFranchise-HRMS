import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function LeaveSettingsPage() {
  await requireServerPermission("leave_type.view");
  const supabase = await createClient();

  const { data: settings } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .limit(1)
    .maybeSingle();

  const leaveRules =
    (settings?.settings as { leave_rules?: Record<string, unknown> } | null)
      ?.leave_rules ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization leave policies and approval configuration.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-medium">Leave rules</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(leaveRules).map(([key, value]) => (
            <div key={key} className="rounded-lg border px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-1 text-sm font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
