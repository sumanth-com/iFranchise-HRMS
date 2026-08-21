"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { SalaryStructureDialog } from "@/components/payroll/salary-structure-dialog";
import { useTeamPayrollHeaderActions } from "@/components/payroll/team-payroll-header-actions";
import { toEmployeeSelectItems } from "@/components/payroll/select-utils";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteSalaryStructureAction } from "@/lib/payroll/actions";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { LookupOption } from "@/types/employee";
import type { SalaryStructureItem } from "@/types/payroll";

type DialogMode = "create" | "edit";

const STATUS_FILTER_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "current", label: "Current" },
  { value: "historical", label: "Historical" },
] as const;

export function SalaryStructureTable({
  records,
  employees,
  canEdit = false,
}: {
  records: SalaryStructureItem[];
  employees: LookupOption[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const { setHeaderActions } = useTeamPayrollHeaderActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingRecord, setEditingRecord] = useState<SalaryStructureItem | undefined>();
  const [deleting, setDeleting] = useState<SalaryStructureItem | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const employeeItems = useMemo(
    () => [{ value: "all", label: "All employees" }, ...toEmployeeSelectItems(employees)],
    [employees],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.effectiveFrom);
      if (monthFilter && monthFilter !== "all" && d.getMonth() + 1 !== Number(monthFilter)) return false;
      if (yearFilter && yearFilter !== "all" && d.getFullYear() !== Number(yearFilter)) return false;
      if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;
      if (statusFilter === "current" && !r.isCurrent) return false;
      if (statusFilter === "historical" && r.isCurrent) return false;
      return true;
    });
  }, [records, monthFilter, yearFilter, employeeFilter, statusFilter]);

  const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" }),
  }));
  const YEAR_OPTIONS = [2025, 2026, 2027, 2028].map((y) => ({ value: String(y), label: String(y) }));

  const registerAddAction = useCallback(() => {
    setDialogMode("create");
    setEditingRecord(undefined);
    setDialogOpen(true);
  }, []);

  function openEditDialog(record: SalaryStructureItem) {
    setDialogMode("edit");
    setEditingRecord(record);
    setDialogOpen(true);
  }

  function handleSaved() {
    router.refresh();
  }

  function confirmDelete() {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const result = await deleteSalaryStructureAction(deleting.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Salary structure deleted");
      setDeleting(null);
      router.refresh();
    });
  }

  useEffect(() => {
    if (!canEdit) {
      setHeaderActions(null);
      return;
    }

    setHeaderActions(
      <Button type="button" size="sm" className="gap-1.5" onClick={registerAddAction}>
        <Plus className="size-4" />
        Add salary structure
      </Button>,
    );

    return () => setHeaderActions(null);
  }, [canEdit, registerAddAction, setHeaderActions]);

  const columns: ColumnDef<SalaryStructureItem>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.employeeName}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.employeeCode}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "effectiveFrom",
      header: "Effective from",
      cell: ({ row }) => format(new Date(row.original.effectiveFrom), "MMM d, yyyy"),
    },
    {
      accessorKey: "grossSalary",
      header: "Gross",
      cell: ({ row }) => formatCurrency(row.original.grossSalary),
    },
    {
      accessorKey: "netSalary",
      header: "Net",
      cell: ({ row }) => formatCurrency(row.original.netSalary),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.isCurrent ? (
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Current
          </span>
        ) : (
          <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Historical
          </span>
        ),
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }: { row: { original: SalaryStructureItem } }) => (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5"
                  onClick={() => openEditDialog(row.original)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleting(row.original)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            ),
          } as ColumnDef<SalaryStructureItem>,
        ]
      : []),
  ];

  const table = useReactTable({
    data: filteredRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <LabeledSelect
          items={[{ value: "all", label: "All months" }, ...MONTH_OPTIONS]}
          value={monthFilter}
          onValueChange={setMonthFilter}
          triggerClassName="w-[140px]"
        />
        <LabeledSelect
          items={[{ value: "all", label: "All years" }, ...YEAR_OPTIONS]}
          value={yearFilter}
          onValueChange={setYearFilter}
          triggerClassName="w-[100px]"
        />
        <LabeledSelect
          items={employeeItems}
          value={employeeFilter}
          onValueChange={(value) => setEmployeeFilter(value || "all")}
          placeholder="Employee"
          triggerClassName="w-[220px]"
        />
        <LabeledSelect
          items={[...STATUS_FILTER_ITEMS]}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value || "all")}
          placeholder="Status"
          triggerClassName="w-[150px]"
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`px-4 py-3 ${header.id === "actions" ? "text-right" : ""}`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-4 py-3 ${cell.column.id === "actions" ? "text-right" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No salary structures found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      {canEdit ? (
        <SalaryStructureDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employees={employees}
          record={editingRecord}
          mode={dialogMode}
          onSaved={handleSaved}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) setDeleting(null);
        }}
        title="Delete salary structure?"
        description={
          deleting
            ? `Remove the salary structure for ${deleting.employeeName} (${deleting.employeeCode}) effective ${format(new Date(deleting.effectiveFrom), "MMM d, yyyy")}.`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button
            variant="destructive"
            disabled={isDeletePending || !deleting}
            onClick={confirmDelete}
          >
            {isDeletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          {deleting?.isCurrent
            ? "This is the employee’s current structure. If an older structure exists, it will become current again after deletion."
            : "This historical structure will be removed from the list. Payroll already processed with it is not changed."}
        </p>
      </Modal>
    </div>
  );
}
