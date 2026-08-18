"use client";

import { format, parseISO, isValid } from "date-fns";
import { Eye, Loader2, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { AssetDetailDialog } from "@/components/assets/asset-detail-dialog";
import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { getAssetDetailAction } from "@/lib/assets/actions";
import {
  canAssignAssets,
  canCreateAssets,
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

function formatActivityWhen(value: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd MMM yyyy · h:mm a");
}

export function AssetActivitySection({
  activity,
  lookups = null,
  inventory = [],
  permissionCodes = [],
  className,
  showAddButton = true,
}: Props) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [assignToEmployeeId, setAssignToEmployeeId] = useState<string | null>(null);
  const [formInitialMode, setFormInitialMode] = useState<"edit" | "assignAnother" | "create">(
    "create",
  );
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  const canCreate = lookups ? canCreateAssets(permissionCodes) : false;
  const canEdit = lookups ? canEditAssets(permissionCodes) : false;
  const canAssign = lookups ? canAssignAssets(permissionCodes) : false;

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

  function openAssignForEmployee(employeeId: string, asset?: AssetItem | null) {
    setEditingAsset(asset ?? null);
    setAssignToEmployeeId(employeeId);
    setFormInitialMode("assignAnother");
    setFormOpen(true);
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
      className: "w-36 text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              setSelectedAssetId(row.assetId);
              setDetailOpen(true);
            }}
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
          {canAssign && row.employeeId ? (
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
        </div>
      ),
    },
  ];

  const rows = activity as Row[];

  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Asset history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Register assets, review activity, and update specifications.
          </p>
        </div>
        {showAddButton && canCreate && lookups ? (
          <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={openCreate}>
            <Plus className="size-4" />
            Add asset
          </Button>
        ) : null}
      </div>
      <div className="p-4">
        {activity.length === 0 ? (
          <EmptyState
            title="No asset activity yet"
            description="Create an asset or assign one to an employee to see history here."
          />
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </div>

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
    </section>
  );
}
