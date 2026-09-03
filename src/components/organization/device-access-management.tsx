"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Input } from "@/components/common/input";
import { setEmployeeTabletAccessAction } from "@/lib/device-access/actions";
import type { DeviceAccessEmployeeRow } from "@/lib/device-access/queries";
import { cn } from "@/lib/utils";

type DeviceAccessManagementProps = {
  employees: DeviceAccessEmployeeRow[];
  canManage: boolean;
};

export function DeviceAccessManagement({
  employees,
  canManage,
}: DeviceAccessManagementProps) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(employees);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.employeeCode, row.name, row.department, row.designation]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, search]);

  const columns: DataTableColumn<DeviceAccessEmployeeRow>[] = [
    {
      key: "employeeCode",
      header: "Employee ID",
      className: "whitespace-nowrap",
    },
    {
      key: "name",
      header: "Employee Name",
      className: "min-w-[10rem] whitespace-normal",
    },
    {
      key: "department",
      header: "Department",
    },
    {
      key: "designation",
      header: "Designation",
    },
    {
      key: "tabletAccessEnabled",
      header: "Tablet Access",
      className: "w-[10rem] whitespace-nowrap",
      render: (row) => (
        <TabletAccessToggle
          enabled={row.tabletAccessEnabled}
          disabled={!canManage || (isPending && pendingId === row.id)}
          onToggle={(next) => {
            const previous = row.tabletAccessEnabled;
            setPendingId(row.id);
            setRows((current) =>
              current.map((item) =>
                item.id === row.id ? { ...item, tabletAccessEnabled: next } : item,
              ),
            );
            startTransition(async () => {
              const result = await setEmployeeTabletAccessAction(row.id, next);
              if (!result.success) {
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? { ...item, tabletAccessEnabled: previous }
                      : item,
                  ),
                );
                toast.error(result.message);
              }
              setPendingId(null);
            });
          }}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Device Access</h1>
        <p className="mt-1 text-sm text-muted-foreground xl:whitespace-nowrap">
          Grant tablet access for Employee Self-Service. Desktop access stays
          available for everyone; HR, CEO, and management portals are not affected.
        </p>
      </div>

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by ID, name, department, or designation"
          aria-label="Search employees"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No employees match this search."
        scrollable
      />
    </div>
  );
}

function TabletAccessToggle({
  enabled,
  disabled,
  onToggle,
}: {
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label="Tablet access"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onToggle(!enabled)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-border bg-muted/60 text-muted-foreground",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          enabled ? "bg-emerald-500" : "bg-zinc-400",
        )}
        aria-hidden
      />
      {enabled ? "Enabled" : "Disabled"}
    </button>
  );
}
