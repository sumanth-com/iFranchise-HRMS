"use client";

import { format, parseISO, isValid } from "date-fns";
import { Loader2, PackagePlus, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import { AssetDevicePreview } from "@/components/assets/asset-device-preview";
import {
  AssetSpecGrid,
  AssetSpecRow,
  AssetSpecSection,
} from "@/components/assets/asset-spec-display";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { getAssetDetailAction } from "@/lib/assets/actions";
import {
  ASSET_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  CONDITION_LABELS,
} from "@/lib/assets/constants";
import { parseAssetRemarks, parseAssetSpecs } from "@/lib/assets/asset-spec-utils";
import { categoryNameToDeviceType } from "@/lib/assets/asset-device-spec-fields";
import { resolveAssetDeviceType } from "@/lib/assets/asset-device-images";
import type { AssetDetailBundle, AssetItem } from "@/types/assets";

type Props = {
  assetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  canAssign?: boolean;
  onEdit?: (asset: AssetItem) => void;
  onAssignAnother?: (asset: AssetItem) => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : value;
}

export function AssetDetailDialog({
  assetId,
  open,
  onOpenChange,
  canEdit = false,
  canAssign = false,
  onEdit,
  onAssignAnother,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AssetDetailBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assetId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAssetDetailAction(assetId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.message);
        setDetail(null);
        return;
      }
      setDetail(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [open, assetId]);

  const asset = detail?.asset;
  const specs = parseAssetSpecs(asset?.notes);
  const remarks = parseAssetRemarks(asset?.notes);
  const activeAssignment = detail?.assignments.find((a) => a.assignmentStatus === "active");
  const deviceType = asset
    ? (categoryNameToDeviceType(asset.categoryName) ??
        resolveAssetDeviceType({
          categoryName: asset.categoryName,
          brand: asset.brand,
          model: asset.model,
          name: asset.name,
        }))
    : null;

  const footer =
    asset && (canEdit && onEdit || canAssign && onAssignAnother && asset.assignedEmployeeId)
      ? (
          <>
            {canEdit && onEdit ? (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={() => onEdit(asset)}
              >
                <Pencil className="size-4" />
                Edit asset
              </Button>
            ) : null}
            {canAssign && onAssignAnother && asset.assignedEmployeeId ? (
              <Button
                type="button"
                className="gap-1.5"
                onClick={() => onAssignAnother(asset)}
              >
                <PackagePlus className="size-4" />
                Add asset
              </Button>
            ) : null}
          </>
        )
      : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={asset?.name ?? "Asset details"}
      description={
        asset
          ? `${asset.assetCode} · ${ASSET_STATUS_LABELS[asset.assetStatus]}`
          : undefined
      }
      contentClassName="w-[min(96vw,56rem)] !max-w-[min(96vw,56rem)]"
      showCancel={false}
      footer={footer}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : asset ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="flex items-center justify-center rounded-xl border bg-muted/15 p-5 lg:col-span-3">
              <AssetDevicePreview
                categoryName={asset.categoryName}
                brand={asset.brand}
                model={asset.model}
                name={asset.name}
                size="lg"
              />
            </div>

            <div className="space-y-4 lg:col-span-5">
              <AssetSpecSection title="Asset">
                <AssetSpecRow label="Asset name" value={asset.name} />
                <AssetSpecRow label="Asset ID" value={asset.assetCode} />
                <AssetSpecRow label="Category" value={asset.categoryName} />
                <AssetSpecRow label="Brand" value={asset.brand} />
                <AssetSpecRow label="Model" value={asset.model} />
                <AssetSpecRow label="Serial number" value={asset.serialNumber} />
                <AssetSpecRow label="Status" value={ASSET_STATUS_LABELS[asset.assetStatus]} />
              </AssetSpecSection>
            </div>

            <div className="space-y-4 lg:col-span-4">
              <AssetSpecSection title="Assignment">
                <AssetSpecRow
                  label="Assigned to"
                  value={activeAssignment?.employeeName ?? asset.assignedEmployeeName}
                />
                <AssetSpecRow
                  label="Department"
                  value={activeAssignment?.departmentName ?? asset.departmentName}
                />
                <AssetSpecRow
                  label="Assigned date"
                  value={formatDate(activeAssignment?.assignedDate ?? null)}
                />
                <AssetSpecRow
                  label="Condition"
                  value={
                    activeAssignment
                      ? CONDITION_LABELS[activeAssignment.conditionBefore]
                      : "—"
                  }
                />
                <AssetSpecRow label="Warranty" value={formatDate(asset.warrantyExpiry)} />
              </AssetSpecSection>
            </div>
          </div>

          <AssetSpecGrid specs={specs} title="Configuration & specs" deviceType={deviceType} />

          {remarks ? (
            <AssetSpecSection title="Notes">
              <div className="px-3 py-2.5 text-sm text-foreground">{remarks}</div>
            </AssetSpecSection>
          ) : null}

          {detail.assignments.length > 0 ? (
            <AssetSpecSection title="Timeline">
              {detail.assignments.map((row) => (
                <div key={row.id} className="px-3 py-2.5 text-sm">
                  <p className="font-medium">{ASSIGNMENT_STATUS_LABELS[row.assignmentStatus]}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.employeeName} · {formatDate(row.assignedDate)}
                  </p>
                  {row.remarks ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.remarks}</p>
                  ) : null}
                </div>
              ))}
            </AssetSpecSection>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
