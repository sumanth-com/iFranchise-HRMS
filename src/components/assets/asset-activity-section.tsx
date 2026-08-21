"use client";

import { format, parseISO, isValid } from "date-fns";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AssetDetailDialog } from "@/components/assets/asset-detail-dialog";
import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { AssetRecordDeleteDialog } from "@/components/assets/asset-record-delete-dialog";
import {
  AssetRequestDetailDialog,
  type AssetRequestViewModel,
} from "@/components/assets/asset-request-detail-dialog";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  deleteAssignedAssetAction,
  deleteMaintenanceAction,
  getAssetDetailAction,
} from "@/lib/assets/actions";
import {
  canAssignAssets,
  canCreateAssets,
  canDeleteAssets,
  canEditAssets,
} from "@/lib/assets/constants";
import type {
  AssetActivityItem,
  AssetItem,
  AssetsLookups,
} from "@/types/assets";
import { cn } from "@/lib/utils";

type Row = AssetActivityItem & Record<string, unknown>;

type Props = {
  activity: AssetActivityItem[];
  lookups?: AssetsLookups | null;
  inventory?: AssetItem[];
  permissionCodes?: string[];
  className?: string;
  showAddButton?: boolean;
};

const TYPE_ITEMS = [
  { value: "all", label: "All activity" },
  { value: "report", label: "Reports" },
  { value: "replace", label: "Replace" },
  { value: "return", label: "Return" },
  { value: "assigned", label: "Assigned" },
];

const MONTH_ITEMS = [
  { value: "all", label: "All months" },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: format(new Date(2026, index, 1), "MMMM"),
  })),
];

function buildYearItems() {
  const currentYear = new Date().getFullYear();
  return [
    { value: "all", label: "All years" },
    ...Array.from({ length: 5 }, (_, index) => ({
      value: String(currentYear - index),
      label: String(currentYear - index),
    })),
  ];
}

function formatActivityWhen(value: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd MMM yyyy · h:mm a");
}

function isRequestKind(kind: AssetActivityItem["kind"]) {
  return (
    kind === "issue_reported" ||
    kind === "replacement_requested" ||
    kind === "status_reported" ||
    kind === "return_requested"
  );
}

export function AssetActivitySection({
  activity,
  lookups = null,
  inventory = [],
  permissionCodes = [],
  className,
  showAddButton = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activityType, setActivityType] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestView, setRequestView] = useState<AssetRequestViewModel | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [assignToEmployeeId, setAssignToEmployeeId] = useState<string | null>(null);
  const [formInitialMode, setFormInitialMode] = useState<"edit" | "assignAnother" | "create">(
    "create",
  );
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "maintenance" | "assignment";
    id: string;
    label: string;
  } | null>(null);

  const canCreate = lookups ? canCreateAssets(permissionCodes) : false;
  const canEdit = lookups ? canEditAssets(permissionCodes) : false;
  const canAssign = lookups ? canAssignAssets(permissionCodes) : false;
  const canDelete = canDeleteAssets(permissionCodes) || canEdit;
  const yearItems = useMemo(() => buildYearItems(), []);
  const inventoryById = useMemo(
    () => new Map(inventory.map((item) => [item.id, item])),
    [inventory],
  );

  const filtered = useMemo(() => {
    return activity.filter((row) => {
      if (activityType === "report" && row.kind !== "issue_reported") return false;
      if (activityType === "replace" && row.kind !== "replacement_requested") return false;
      if (activityType === "return" && row.kind !== "return_requested") return false;
      if (activityType === "assigned" && row.kind !== "assigned") return false;
      const parsed = parseISO(row.performedAt);
      if (isValid(parsed)) {
        if (month !== "all" && parsed.getMonth() + 1 !== Number(month)) return false;
        if (year !== "all" && parsed.getFullYear() !== Number(year)) return false;
      }
      return true;
    });
  }, [activity, activityType, month, year]);

  async function openEdit(assetId: string) {
    setEditLoadingId(assetId);
    const result = await getAssetDetailAction(assetId);
    setEditLoadingId(null);
    if (!result.success) return;
    setEditingAsset(result.data.asset);
    setAssignToEmployeeId(null);
    setFormInitialMode("edit");
    setFormOpen(true);
  }

  function openCreate() {
    setEditingAsset(null);
    setAssignToEmployeeId(null);
    setFormInitialMode("create");
    setFormOpen(true);
  }

  function openAssignForEmployee(employeeId: string) {
    setEditingAsset(null);
    setAssignToEmployeeId(employeeId);
    setFormInitialMode("assignAnother");
    setFormOpen(true);
  }

  function openRow(row: AssetActivityItem) {
    const asset = inventoryById.get(row.assetId);
    if (isRequestKind(row.kind)) {
      setRequestView({
        title: row.actionLabel,
        assetName: row.assetName,
        assetCode: row.assetCode,
        employeeName: row.employeeName,
        performedByName: row.performedByName,
        submittedAt: row.performedAt,
        issue: row.remarks ?? row.actionLabel,
        notes: row.detailNotes,
        categoryName: asset?.categoryName,
        brand: asset?.brand,
        model: asset?.model,
        imagePath: asset?.imagePath,
      });
      setRequestOpen(true);
      return;
    }
    setSelectedAssetId(row.assetId);
    setDetailOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result =
        deleteTarget.type === "maintenance"
          ? await deleteMaintenanceAction(deleteTarget.id)
          : await deleteAssignedAssetAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Deleted successfully");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: DataTableColumn<Row>[] = [
    {
      key: "asset",
      header: "Asset",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.assetName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.assetCode}</p>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      render: (row) => row.employeeName ?? "—",
    },
    {
      key: "action",
      header: "Action",
      render: (row) => <span className="text-sm">{row.actionLabel}</span>,
    },
    {
      key: "when",
      header: "Date & time",
      render: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatActivityWhen(row.performedAt)}
        </span>
      ),
    },
    {
      key: "by",
      header: "Performed by",
      render: (row) => row.performedByName ?? "—",
    },
    {
      key: "view",
      header: "",
      className: "w-44 text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => openRow(row)}
          >
            <Eye className="size-3.5" />
            View
          </Button>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              disabled={editLoadingId === row.assetId}
              onClick={() => openEdit(row.assetId)}
            >
              {editLoadingId === row.assetId ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Pencil className="size-3.5" />
              )}
            </Button>
          ) : null}
          {canAssign && row.employeeId && !row.maintenanceId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              title="Add asset for employee"
              onClick={() => openAssignForEmployee(row.employeeId!)}
            >
              <Plus className="size-3.5" />
            </Button>
          ) : null}
          {canDelete && (row.maintenanceId || row.assignmentId) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              disabled={isPending}
              onClick={() =>
                setDeleteTarget(
                  row.maintenanceId
                    ? {
                        type: "maintenance",
                        id: row.maintenanceId,
                        label: `${row.actionLabel} · ${row.assetName}`,
                      }
                    : {
                        type: "assignment",
                        id: row.assignmentId!,
                        label: `${row.assetName} assigned to ${row.employeeName ?? "employee"}`,
                      },
                )
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Asset history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Employee reports, replacement requests, return requests, status updates, and assignment activity.
          </p>
        </div>
        {showAddButton && canCreate && lookups ? (
          <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={openCreate}>
            <Plus className="size-4" />
            Add asset
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="w-full sm:w-40">
          <LabeledSelect items={TYPE_ITEMS} value={activityType} onValueChange={setActivityType} />
        </div>
        <div className="w-full sm:w-40">
          <LabeledSelect items={MONTH_ITEMS} value={month} onValueChange={setMonth} />
        </div>
        <div className="w-full sm:w-32">
          <LabeledSelect items={yearItems} value={year} onValueChange={setYear} />
        </div>
      </div>

      <div className="p-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="No matching activity"
            description="Try changing the filters or wait for employees to send reports and requests."
          />
        ) : (
          <DataTable columns={columns} data={filtered as Row[]} />
        )}
      </div>

      <AssetRequestDetailDialog
        request={requestView}
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) setRequestView(null);
        }}
      />

      <AssetDetailDialog
        assetId={selectedAssetId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedAssetId(null);
        }}
      />

      {lookups ? (
        <AssetFormModal
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) {
              setEditingAsset(null);
              setAssignToEmployeeId(null);
            }
          }}
          lookups={lookups}
          editing={editingAsset}
          assignToEmployeeId={assignToEmployeeId}
          initialMode={formInitialMode}
          canAssign={canAssign}
        />
      ) : null}

      <AssetRecordDeleteDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === "assignment"
            ? "Delete this assigned asset?"
            : "Delete this record?"
        }
        description={deleteTarget?.label}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
