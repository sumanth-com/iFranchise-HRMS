"use client";

import { RefreshCw, Send, Wrench } from "lucide-react";

import { AssetDevicePreview } from "@/components/assets/asset-device-preview";
import { AssetSpecGrid } from "@/components/assets/asset-spec-display";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  AssetStatusBadge,
  AssignmentStatusBadge,
  ConditionBadge,
} from "@/components/employee/assets/employee-asset-badges";
import { categoryNameToDeviceType } from "@/lib/assets/asset-device-spec-fields";
import { resolveAssetDeviceType } from "@/lib/assets/asset-device-images";
import { MAINTENANCE_STATUS_LABELS } from "@/lib/assets/constants";
import { parseAssetRemarks, parseAssetSpecs } from "@/lib/assets/asset-spec-utils";
import { formatAssetDate, getAssetDisplayName } from "@/lib/employee/assets/asset-display";
import type { EmployeeAsset } from "@/types/employee-assets";

function fmt(date: string | null) {
  return formatAssetDate(date);
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words leading-snug">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

type Props = {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendStatus: (asset: EmployeeAsset) => void;
  onReportIssue: (asset: EmployeeAsset) => void;
  onRequestReplacement: (asset: EmployeeAsset) => void;
  readOnly?: boolean;
};

export function EmployeeAssetDetailsDialog({
  asset,
  open,
  onOpenChange,
  onSendStatus,
  onReportIssue,
  onRequestReplacement,
  readOnly = false,
}: Props) {
  const isActive = asset?.assignmentStatus === "active";
  const specs = parseAssetSpecs(asset?.notes);
  const remarks = parseAssetRemarks(asset?.notes);
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
    isActive && !readOnly && asset
      ? (
          <>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => onReportIssue(asset)}
            >
              <Wrench className="size-4" />
              Report Issue
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => onRequestReplacement(asset)}
            >
              <RefreshCw className="size-4" />
              Request Replacement
            </Button>
            <Button className="gap-1.5" onClick={() => onSendStatus(asset)}>
              <Send className="size-4" />
              Send status
            </Button>
          </>
        )
      : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={asset ? getAssetDisplayName(asset) : "Asset details"}
      description={
        asset ? `${asset.assetCode} · ${asset.categoryName ?? "Asset"}` : undefined
      }
      contentClassName="w-[min(96vw,56rem)] !max-w-[min(96vw,56rem)]"
      showCancel={false}
      footer={footer}
    >
      {asset ? (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <AssetDevicePreview
              categoryName={asset.categoryName}
              brand={asset.brand}
              model={asset.model}
              name={asset.name}
              imageUrl={asset.imageUrl}
              size="xl"
            />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md border bg-muted/40 px-2.5 py-1 font-mono text-xs font-semibold tracking-tight"
                >
                  {asset.assetCode}
                </span>
                <AssetStatusBadge status={asset.assetStatus} />
                {!isActive ? (
                  <AssignmentStatusBadge status={asset.assignmentStatus} />
                ) : null}
                <ConditionBadge condition={asset.conditionAfter ?? asset.conditionBefore} />
              </div>

              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <Detail label="Manufacturer" value={asset.brand} />
                <Detail label="Model" value={asset.model} />
                <Detail label="Serial number" value={asset.serialNumber} />
                <Detail label="Office location" value={asset.officeLocation} />
                <Detail label="Purchase date" value={fmt(asset.purchaseDate)} />
                <Detail label="Assigned date" value={fmt(asset.assignedDate)} />
                <Detail
                  label="Warranty expiry"
                  value={asset.warranty.expiry ? fmt(asset.warranty.expiry) : "—"}
                />
                <Detail label="Expected return" value={fmt(asset.expectedReturnDate)} />
              </div>
            </div>
          </div>

          <AssetSpecGrid specs={specs} title="Configuration & specs" deviceType={deviceType} />

          {remarks ? (
            <div className="rounded-lg border bg-muted/10 px-3 py-2.5 text-sm leading-relaxed">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-1.5">{remarks}</p>
            </div>
          ) : null}

          {!isActive ? (
            <div className="rounded-xl border bg-muted/10 p-4">
              <p className="text-sm font-semibold">Return details</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Detail label="Returned on" value={fmt(asset.returnedDate)} />
                <Detail label="Condition after" value={asset.conditionAfter ?? "—"} />
              </div>
              {asset.returnRemarks?.trim() ? (
                <p className="mt-2 text-xs text-muted-foreground">{asset.returnRemarks}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="text-sm font-semibold">Maintenance & service history</p>
            {asset.maintenance.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {asset.maintenance.map((record) => (
                  <li key={record.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{record.issue}</p>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {MAINTENANCE_STATUS_LABELS[record.maintenanceStatus]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>Logged {fmt(record.maintenanceDate)}</span>
                      {record.vendorName ? <span>· {record.vendorName}</span> : null}
                      {record.completedAt ? (
                        <span>· Resolved {fmt(record.completedAt.slice(0, 10))}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg border border-dashed bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
                No maintenance or service records yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
