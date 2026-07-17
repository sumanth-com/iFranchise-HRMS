import { format, parseISO } from "date-fns";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { listEmployeeAssets } from "@/lib/assets/services/asset-queries";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { AssetAssignmentItem } from "@/types/assets";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  returned: "bg-muted text-muted-foreground",
  lost: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  damaged: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default async function EmployeeAssetsPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);
  const supabase = await createClient();
  const assets = await listEmployeeAssets(
    supabase,
    profile.employee.organizationId,
    profile.employee.id,
  );

  const columns: DataTableColumn<AssetAssignmentItem>[] = [
    {
      key: "assetName",
      header: "Asset",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.assetName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.assetCode}</p>
        </div>
      ),
    },
    { key: "categoryName", header: "Category", render: (row) => row.categoryName ?? "—" },
    {
      key: "assignedDate",
      header: "Assigned",
      render: (row) => format(parseISO(row.assignedDate), "dd MMM yyyy"),
    },
    {
      key: "assignmentStatus",
      header: "Status",
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            STATUS_STYLES[row.assignmentStatus] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {row.assignmentStatus}
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Company assets currently or previously assigned to you.
          </p>
        </div>
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <DataTable
            columns={columns}
            data={assets}
            emptyMessage="No assets have been assigned to you."
          />
        </section>
      </div>
    </div>
  );
}
