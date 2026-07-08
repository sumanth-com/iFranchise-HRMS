"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Plus,
  Undo2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import {
  assignAssetAction,
  returnAssetAction,
  transferAssetAction,
} from "@/lib/assets/actions";
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSETS_ROUTES,
  CONDITION_LABELS,
  canAssignAssets,
  canReturnAssets,
} from "@/lib/assets/constants";
import {
  assignAssetSchema,
  returnAssetSchema,
  transferAssetSchema,
  type AssignAssetValues,
  type ReturnAssetValues,
  type TransferAssetValues,
} from "@/lib/validations/assets";
import type {
  AssetAssignmentItem,
  AssetAssignmentListResult,
  AssetsLookups,
  AssetCondition,
} from "@/types/assets";

type AssignFormInput = {
  assetId: string;
  employeeId: string;
  assignedDate: string;
  expectedReturnDate: string | null;
  conditionBefore: AssetCondition;
  remarks: string | null;
};

type ReturnFormInput = {
  assignmentId: string;
  returnedDate: string;
  conditionAfter: AssetCondition;
  returnRemarks: string | null;
  markAs: "returned" | "lost" | "damaged";
};

type TransferFormInput = {
  assignmentId: string;
  toEmployeeId: string;
  assignedDate: string;
  expectedReturnDate: string | null;
  conditionBefore: AssetCondition;
  remarks: string | null;
};

type Props = {
  result: AssetAssignmentListResult;
  lookups: AssetsLookups;
  permissionCodes: string[];
};

type ModalMode = "assign" | "transfer" | "return" | "lost" | "damaged" | null;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AssignmentsManagement({ result, lookups, permissionCodes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<AssetAssignmentItem | null>(null);

  const canAssign = canAssignAssets(permissionCodes);
  const canReturn = canReturnAssets(permissionCodes);

  const assignForm = useForm<AssignFormInput>({
    resolver: zodResolver(assignAssetSchema) as never,
    defaultValues: {
      assetId: "",
      employeeId: "",
      assignedDate: todayIso(),
      expectedReturnDate: null,
      conditionBefore: "good",
      remarks: null,
    },
  });

  const returnForm = useForm<ReturnFormInput>({
    resolver: zodResolver(returnAssetSchema) as never,
    defaultValues: {
      assignmentId: "",
      returnedDate: todayIso(),
      conditionAfter: "good",
      returnRemarks: null,
      markAs: "returned",
    },
  });

  const transferForm = useForm<TransferFormInput>({
    resolver: zodResolver(transferAssetSchema) as never,
    defaultValues: {
      assignmentId: "",
      toEmployeeId: "",
      assignedDate: todayIso(),
      expectedReturnDate: null,
      conditionBefore: "good",
      remarks: null,
    },
  });

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`${ASSETS_ROUTES.assignments}?${params.toString()}`);
    });
  }

  function openAssign() {
    setSelected(null);
    assignForm.reset({
      assetId: "",
      employeeId: "",
      assignedDate: todayIso(),
      expectedReturnDate: null,
      conditionBefore: "good",
      remarks: null,
    });
    setMode("assign");
  }

  const openReturn = useCallback(
    (row: AssetAssignmentItem, markAs: "returned" | "lost" | "damaged") => {
      setSelected(row);
      returnForm.reset({
        assignmentId: row.id,
        returnedDate: todayIso(),
        conditionAfter: markAs === "damaged" ? "damaged" : "good",
        returnRemarks: null,
        markAs,
      });
      setMode(markAs === "returned" ? "return" : markAs);
    },
    [returnForm],
  );

  const openTransfer = useCallback(
    (row: AssetAssignmentItem) => {
      setSelected(row);
      transferForm.reset({
        assignmentId: row.id,
        toEmployeeId: "",
        assignedDate: todayIso(),
        expectedReturnDate: row.expectedReturnDate,
        conditionBefore: "good",
        remarks: null,
      });
      setMode("transfer");
    },
    [transferForm],
  );

  function onAssign(values: AssignFormInput) {
    startTransition(async () => {
      const res = await assignAssetAction(values as AssignAssetValues);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Asset assigned");
      setMode(null);
      router.refresh();
    });
  }

  function onReturn(values: ReturnFormInput) {
    startTransition(async () => {
      const res = await returnAssetAction(values as ReturnAssetValues);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      const labels = {
        returned: "Asset returned",
        lost: "Asset marked as lost",
        damaged: "Damage report recorded",
      } as const;
      toast.success(labels[values.markAs]);
      setMode(null);
      router.refresh();
    });
  }

  function onTransfer(values: TransferFormInput) {
    startTransition(async () => {
      const res = await transferAssetAction(values as TransferAssetValues);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Asset transferred");
      setMode(null);
      router.refresh();
    });
  }

  const columns = useMemo<
    DataTableColumn<AssetAssignmentItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "assetCode",
        header: "Asset",
        render: (row) => (
          <div>
            <p className="font-medium">{row.assetName}</p>
            <p className="text-xs text-muted-foreground">
              {row.assetCode}
              {row.categoryName ? ` · ${row.categoryName}` : ""}
            </p>
          </div>
        ),
      },
      {
        key: "employeeName",
        header: "Employee",
        render: (row) => (
          <div>
            <p className="font-medium">{row.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
          </div>
        ),
      },
      {
        key: "departmentName",
        header: "Department",
        render: (row) => row.departmentName ?? "—",
      },
      {
        key: "assignedDate",
        header: "Assigned",
        render: (row) => format(new Date(row.assignedDate), "dd MMM yyyy"),
      },
      {
        key: "expectedReturnDate",
        header: "Expected Return",
        render: (row) =>
          row.expectedReturnDate
            ? format(new Date(row.expectedReturnDate), "dd MMM yyyy")
            : "—",
      },
      {
        key: "assignmentStatus",
        header: "Status",
        render: (row) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {ASSIGNMENT_STATUS_LABELS[row.assignmentStatus]}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          if (row.assignmentStatus !== "active") return null;
          return (
            <div className="flex flex-wrap gap-1">
              {canReturn ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => openReturn(row, "returned")}
                  aria-label="Return"
                  title="Return"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              ) : null}
              {canAssign ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => openTransfer(row)}
                  aria-label="Transfer"
                  title="Transfer"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              ) : null}
              {canReturn ? (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openReturn(row, "lost")}
                    aria-label="Mark lost"
                    title="Mark lost"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openReturn(row, "damaged")}
                    aria-label="Damage report"
                    title="Damage report"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canAssign, canReturn, openReturn, openTransfer],
  );

  const returnModalTitle =
    mode === "lost"
      ? "Mark Asset as Lost"
      : mode === "damaged"
        ? "Damage Report"
        : "Return Asset";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign assets to employees, transfer custody, and record returns.
          </p>
        </div>
        {canAssign ? (
          <Button onClick={openAssign}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Asset
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <Input
          placeholder="Search asset or employee…"
          defaultValue={searchParams.get("search") ?? ""}
          onBlur={(e) => updateParams({ search: e.target.value || undefined })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value || undefined });
            }
          }}
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All employees" },
            ...lookups.employees.map((e) => ({ value: e.id, label: e.label })),
          ]}
          value={searchParams.get("employeeId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ employeeId: value === "__all__" ? undefined : value })
          }
          placeholder="Employee"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All assets" },
            ...lookups.allAssets.map((a) => ({ value: a.id, label: a.label })),
          ]}
          value={searchParams.get("assetId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ assetId: value === "__all__" ? undefined : value })
          }
          placeholder="Asset"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All statuses" },
            ...Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={searchParams.get("assignmentStatus") || "__all__"}
          onValueChange={(value) =>
            updateParams({ assignmentStatus: value === "__all__" ? undefined : value })
          }
          placeholder="Status"
        />
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description="Assign an available asset to an employee to get started."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} · {result.total} assignments
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1 || isPending}
            onClick={() => updateParams({ page: String(result.page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page * result.pageSize >= result.total || isPending}
            onClick={() => updateParams({ page: String(result.page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={mode === "assign"}
        onOpenChange={(next) => !next && setMode(null)}
        title="Assign Asset"
        description="Assign an available asset to an employee."
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={assignForm.handleSubmit(onAssign)} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="mr-2 h-4 w-4" />
            )}
            Assign
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <EmployeeSelect
              employees={lookups.employees}
              value={assignForm.watch("employeeId")}
              onValueChange={(value) =>
                assignForm.setValue("employeeId", value, { shouldValidate: true })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Asset (available)</Label>
            <LabeledSelect
              items={lookups.availableAssets.map((a) => ({
                value: a.id,
                label: a.label,
              }))}
              value={assignForm.watch("assetId")}
              onValueChange={(value) =>
                assignForm.setValue("assetId", value, { shouldValidate: true })
              }
              placeholder="Select available asset"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assigned Date</Label>
              <Input type="date" {...assignForm.register("assignedDate")} />
            </div>
            <div className="space-y-2">
              <Label>Expected Return</Label>
              <Input type="date" {...assignForm.register("expectedReturnDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <LabeledSelect
              items={Object.entries(CONDITION_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={assignForm.watch("conditionBefore")}
              onValueChange={(value) =>
                assignForm.setValue("conditionBefore", value as AssetCondition, {
                  shouldDirty: true,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...assignForm.register("remarks")}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={mode === "transfer"}
        onOpenChange={(next) => !next && setMode(null)}
        title="Transfer Asset"
        description={
          selected
            ? `Transfer ${selected.assetName} from ${selected.employeeName}.`
            : undefined
        }
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={transferForm.handleSubmit(onTransfer)} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            )}
            Transfer
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Employee</Label>
            <EmployeeSelect
              employees={lookups.employees.filter((e) => e.id !== selected?.employeeId)}
              value={transferForm.watch("toEmployeeId")}
              onValueChange={(value) =>
                transferForm.setValue("toEmployeeId", value, { shouldValidate: true })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Transfer Date</Label>
              <Input type="date" {...transferForm.register("assignedDate")} />
            </div>
            <div className="space-y-2">
              <Label>Expected Return</Label>
              <Input type="date" {...transferForm.register("expectedReturnDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <LabeledSelect
              items={Object.entries(CONDITION_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={transferForm.watch("conditionBefore")}
              onValueChange={(value) =>
                transferForm.setValue("conditionBefore", value as AssetCondition, {
                  shouldDirty: true,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...transferForm.register("remarks")}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={mode === "return" || mode === "lost" || mode === "damaged"}
        onOpenChange={(next) => !next && setMode(null)}
        title={returnModalTitle}
        description={
          selected
            ? `${selected.assetName} · ${selected.employeeName}`
            : undefined
        }
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={returnForm.handleSubmit(onReturn)} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {mode === "lost"
              ? "Mark Lost"
              : mode === "damaged"
                ? "Submit Report"
                : "Confirm Return"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {mode === "return" ? "Returned Date" : "Report Date"}
            </Label>
            <Input type="date" {...returnForm.register("returnedDate")} />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <LabeledSelect
              items={Object.entries(CONDITION_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={returnForm.watch("conditionAfter")}
              onValueChange={(value) =>
                returnForm.setValue("conditionAfter", value as AssetCondition, {
                  shouldDirty: true,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...returnForm.register("returnRemarks")}
              placeholder={
                mode === "lost"
                  ? "Describe how the asset was lost…"
                  : mode === "damaged"
                    ? "Describe the damage…"
                    : "Return notes…"
              }
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
