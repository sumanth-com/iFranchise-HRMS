import { requireServerPermission } from "@/lib/permissions/server";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";

export default async function EmployeePortalPage() {
  await requireServerPermission(PORTAL_PERMISSIONS.employee);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Employee Portal</p>
        <h1 className="mt-2 text-2xl font-semibold">Employee perspective ready</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Role mapping and route protection are active. Employee self-service can be added here next.
        </p>
      </div>
    </main>
  );
}
