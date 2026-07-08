"use client";

import { format } from "date-fns";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ASSET_STATUS_LABELS, ASSIGNMENT_STATUS_LABELS } from "@/lib/assets/constants";
import type {
  AssetAssignmentItem,
  AssetItem,
  AssetsReportData,
} from "@/types/assets";

type Props = {
  report: AssetsReportData;
};

export function AssetsReportsView({ report }: Props) {
  const utilTotal =
    report.utilization.available +
    report.utilization.assigned +
    report.utilization.maintenance +
    report.utilization.other;
  const maxDept = Math.max(1, ...report.departmentWise.map((d) => d.count));
  const maxCost = Math.max(1, ...report.maintenanceCost.map((m) => m.total));

  const warrantyColumns: DataTableColumn<AssetItem & Record<string, unknown>>[] = [
    {
      key: "assetCode",
      header: "Asset",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.assetCode}</p>
        </div>
      ),
    },
    {
      key: "warrantyExpiry",
      header: "Warranty Expiry",
      render: (row) =>
        row.warrantyExpiry
          ? format(new Date(row.warrantyExpiry), "dd MMM yyyy")
          : "—",
    },
    {
      key: "assetStatus",
      header: "Status",
      render: (row) => ASSET_STATUS_LABELS[row.assetStatus],
    },
  ];

  const lostColumns: DataTableColumn<AssetItem & Record<string, unknown>>[] = [
    {
      key: "assetCode",
      header: "Asset",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.assetCode}</p>
        </div>
      ),
    },
    {
      key: "categoryName",
      header: "Category",
      render: (row) => row.categoryName ?? "—",
    },
    {
      key: "purchaseCost",
      header: "Cost",
      render: (row) =>
        row.purchaseCost != null
          ? `₹${row.purchaseCost.toLocaleString("en-IN")}`
          : "—",
    },
  ];

  const returnedColumns: DataTableColumn<
    AssetAssignmentItem & Record<string, unknown>
  >[] = [
    {
      key: "assetCode",
      header: "Asset",
      render: (row) => (
        <div>
          <p className="font-medium">{row.assetName}</p>
          <p className="text-xs text-muted-foreground">{row.assetCode}</p>
        </div>
      ),
    },
    {
      key: "employeeName",
      header: "Employee",
      render: (row) => row.employeeName,
    },
    {
      key: "returnedDate",
      header: "Returned",
      render: (row) =>
        row.returnedDate
          ? format(new Date(row.returnedDate), "dd MMM yyyy")
          : "—",
    },
    {
      key: "assignmentStatus",
      header: "Status",
      render: (row) => ASSIGNMENT_STATUS_LABELS[row.assignmentStatus],
    },
  ];

  const utilBars = [
    { label: "Available", value: report.utilization.available, color: "bg-emerald-500/70" },
    { label: "Assigned", value: report.utilization.assigned, color: "bg-violet-500/70" },
    {
      label: "Maintenance",
      value: report.utilization.maintenance,
      color: "bg-amber-500/70",
    },
    { label: "Other", value: report.utilization.other, color: "bg-muted-foreground/50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Utilization, warranty, maintenance cost, lost and returned assets.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Utilization</h2>
        {utilTotal === 0 ? (
          <p className="text-sm text-muted-foreground">No assets to report.</p>
        ) : (
          <div className="space-y-3">
            {utilBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{bar.label}</span>
                  <span className="font-medium">
                    {bar.value}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({Math.round((bar.value / utilTotal) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${bar.color}`}
                    style={{ width: `${(bar.value / utilTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Department-wise Assets</h2>
        {report.departmentWise.length === 0 ? (
          <p className="text-sm text-muted-foreground">No departmental data.</p>
        ) : (
          <div className="space-y-3">
            {report.departmentWise.map((item) => (
              <div key={item.departmentName}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.departmentName}</span>
                  <span className="font-medium">
                    {item.count}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({item.assigned} assigned)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(item.count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Maintenance Cost (monthly)</h2>
        {report.maintenanceCost.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance costs recorded.</p>
        ) : (
          <div className="space-y-3">
            {report.maintenanceCost.map((item) => (
              <div key={item.month}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.month}</span>
                  <span className="font-medium">
                    ₹{item.total.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500/70"
                    style={{ width: `${(item.total / maxCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Warranty Expiry</h2>
        {report.warrantyExpiry.length === 0 ? (
          <EmptyState
            title="No warranty expiries"
            description="No assets with upcoming or listed warranty dates."
          />
        ) : (
          <DataTable columns={warrantyColumns} data={report.warrantyExpiry} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Lost Assets</h2>
        {report.lostAssets.length === 0 ? (
          <EmptyState title="No lost assets" description="No assets currently marked lost." />
        ) : (
          <DataTable columns={lostColumns} data={report.lostAssets} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Returned Assets</h2>
        {report.returnedAssets.length === 0 ? (
          <EmptyState
            title="No returned assets"
            description="Returned assignment records will appear here."
          />
        ) : (
          <DataTable columns={returnedColumns} data={report.returnedAssets} />
        )}
      </section>
    </div>
  );
}
