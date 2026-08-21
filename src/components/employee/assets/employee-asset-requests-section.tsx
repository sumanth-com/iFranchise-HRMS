"use client";

import { format, parseISO, isValid } from "date-fns";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AssetRecordDeleteDialog } from "@/components/assets/asset-record-delete-dialog";
import {
  AssetRequestDetailDialog,
  type AssetRequestViewModel,
} from "@/components/assets/asset-request-detail-dialog";
import { EmployeeAssetRequestEditDialog } from "@/components/employee/assets/employee-asset-request-edit-dialog";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { parseEmployeeRequestDetails } from "@/lib/assets/activity-utils";
import { MAINTENANCE_STATUS_LABELS } from "@/lib/assets/constants";
import { employeeDeleteAssetRequestAction } from "@/lib/employee/actions/employee-asset-actions";
import { isOpenRepairMaintenance } from "@/lib/employee/assets/asset-display";
import type { EmployeeAsset, EmployeeAssetRequest } from "@/types/employee-assets";
import { cn } from "@/lib/utils";

const TYPE_ITEMS = [
  { value: "all", label: "All types" },
  { value: "report", label: "Reports" },
  { value: "replace", label: "Replace" },
  { value: "status", label: "Status" },
  { value: "return", label: "Return" },
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

function formatWhen(value: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd MMM yyyy · h:mm a");
}

type Props = {
  requests: EmployeeAssetRequest[];
  assets?: EmployeeAsset[];
  readOnly?: boolean;
};

export function EmployeeAssetRequestsSection({
  requests,
  assets = [],
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activityType, setActivityType] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAssetRequest | null>(null);
  const [viewTarget, setViewTarget] = useState<AssetRequestViewModel | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeAssetRequest | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const yearItems = useMemo(() => buildYearItems(), []);
  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.assetId, asset])),
    [assets],
  );

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      if (activityType !== "all" && request.requestKind !== activityType) return false;
      const parsed = parseISO(request.submittedAt);
      if (!isValid(parsed)) return true;
      if (month !== "all" && parsed.getMonth() + 1 !== Number(month)) return false;
      if (year !== "all" && parsed.getFullYear() !== Number(year)) return false;
      return true;
    });
  }, [requests, activityType, month, year]);

  function openView(request: EmployeeAssetRequest) {
    const asset = assetsById.get(request.assetId);
    setViewTarget({
      title: request.requestLabel,
      assetName: request.assetName,
      assetCode: request.assetCode,
      submittedAt: request.submittedAt,
      issue: request.issue,
      notes: request.notes,
      categoryName: asset?.categoryName,
      brand: asset?.brand,
      model: asset?.model,
      imageUrl: asset?.imageUrl,
    });
    setViewOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await employeeDeleteAssetRequestAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Request deleted");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const columns: DataTableColumn<EmployeeAssetRequest & Record<string, unknown>>[] = [
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
      key: "type",
      header: "Type",
      render: (row) => {
        const underRepair = isOpenRepairMaintenance(row.issue, row.maintenanceStatus);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span>{row.requestLabel}</span>
            {underRepair ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Under repair
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "details",
      header: "Details",
      render: (row) => (
        <span className="line-clamp-2 text-sm">
          {parseEmployeeRequestDetails(row.issue, row.notes).message || row.issue}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const underRepair = isOpenRepairMaintenance(row.issue, row.maintenanceStatus);
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
              underRepair
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {underRepair ? "Under repair" : MAINTENANCE_STATUS_LABELS[row.maintenanceStatus]}
          </span>
        );
      },
    },
    {
      key: "when",
      header: "Sent",
      render: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatWhen(row.submittedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => openView(row)}
          >
            <Eye className="size-3.5" />
          </Button>
          {!readOnly ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  setEditTarget(row);
                  setEditOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => setDeleteTarget(row)}
              >
                {isPending && deleteTarget?.id === row.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Sent reports & requests</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track issue reports, replacement requests, return requests, and status updates you have submitted.
        </p>
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
            title="No matching requests"
            description="Reports, replacement, return, and status updates you send will appear here."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered as (EmployeeAssetRequest & Record<string, unknown>)[]}
          />
        )}
      </div>

      <AssetRequestDetailDialog
        request={viewTarget}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewTarget(null);
        }}
      />

      {!readOnly ? (
        <EmployeeAssetRequestEditDialog
          request={editTarget}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditTarget(null);
          }}
        />
      ) : null}

      <AssetRecordDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete this request?"
        description={
          deleteTarget
            ? `${deleteTarget.requestLabel} for ${deleteTarget.assetName} (${deleteTarget.assetCode})`
            : undefined
        }
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
