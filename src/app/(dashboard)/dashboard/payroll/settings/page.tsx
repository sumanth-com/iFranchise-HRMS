import { requireServerPermission } from "@/lib/permissions/server";

export default async function PayrollSettingsPage() {
  await requireServerPermission("payroll.view");

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization payroll configuration and processing preferences.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payroll cycle
            </dt>
            <dd className="mt-1 text-sm font-medium">Monthly</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Salary date
            </dt>
            <dd className="mt-1 text-sm font-medium">1st of every month</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Approval workflow
            </dt>
            <dd className="mt-1 text-sm font-medium">
              HR → Finance → Super Admin
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Currency
            </dt>
            <dd className="mt-1 text-sm font-medium">INR</dd>
          </div>
        </dl>
      </div>
    </>
  );
}
