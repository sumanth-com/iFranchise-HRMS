import { format } from "date-fns";

import {
  DataTable,
  EmptyState,
  PageScroll,
  type DataTableColumn,
} from "@/components/common";

type PlaceholderRecord = {
  id: string;
  module: string;
  status: string;
  updatedAt: string;
};

const placeholderData: PlaceholderRecord[] = [];

const columns: DataTableColumn<PlaceholderRecord>[] = [
  { key: "id", header: "ID" },
  { key: "module", header: "Module" },
  { key: "status", header: "Status" },
  { key: "updatedAt", header: "Last Updated" },
];

export default function DashboardPage() {
  return (
    <PageScroll>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Foundation ready. HRMS modules will be added here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="mt-1 text-2xl font-semibold">
            {format(new Date(), "MMM d, yyyy")}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Modules</p>
          <p className="mt-1 text-2xl font-semibold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">System Status</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            Ready
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Module Registry</h2>
        {placeholderData.length === 0 ? (
          <EmptyState
            title="No modules installed"
            description="Business modules will appear here once they are added to the platform."
          />
        ) : (
          <DataTable columns={columns} data={placeholderData} />
        )}
      </div>
    </PageScroll>
  );
}
