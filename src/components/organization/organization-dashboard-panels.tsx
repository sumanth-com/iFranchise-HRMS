import type { OrganizationDashboardStats } from "@/types/organization";

function BarChart({
  title,
  data,
}: {
  title: string;
  data: { name: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No data available</p>
      ) : (
        <div className="mt-3 space-y-2">
          {data.slice(0, 5).map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="truncate pr-2">{item.name}</span>
                <span className="font-medium">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationDashboardPanels({ stats }: { stats: OrganizationDashboardStats }) {
  return (
    <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
      <BarChart title="Employees by Department" data={stats.employeesByDepartment} />
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Organization Structure</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-3 text-center">
            <p className="text-xl font-semibold">{stats.branches}</p>
            <p className="text-xs text-muted-foreground">Branches</p>
          </div>
          <div className="rounded-lg border bg-background p-3 text-center">
            <p className="text-xl font-semibold">{stats.departments}</p>
            <p className="text-xs text-muted-foreground">Departments</p>
          </div>
          <div className="rounded-lg border bg-background p-3 text-center">
            <p className="text-xl font-semibold">{stats.designations}</p>
            <p className="text-xs text-muted-foreground">Designations</p>
          </div>
          <div className="rounded-lg border bg-background p-3 text-center">
            <p className="text-xl font-semibold">{stats.workLocations}</p>
            <p className="text-xs text-muted-foreground">Work Locations</p>
          </div>
        </div>
        <div className="mt-3">
          <BarChart title="Employees by Branch" data={stats.employeesByBranch} />
        </div>
      </div>
    </div>
  );
}
