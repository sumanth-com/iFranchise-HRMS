"use client";

import { Eye, MapPin, RefreshCw, Send, Undo2, Wrench } from "lucide-react";

import { AssetDevicePreview } from "@/components/assets/asset-device-preview";
import { Button } from "@/components/common/button";
import {
  formatAssetDate,
  getAssetDisplayName,
  getAssetDisplaySubtitle,
  isEmployeeAssetUnderRepair,
} from "@/lib/employee/assets/asset-display";
import type { EmployeeAsset } from "@/types/employee-assets";

type Props = {
  asset: EmployeeAsset;
  onViewDetails: (asset: EmployeeAsset) => void;
  onSendStatus: (asset: EmployeeAsset) => void;
  onReportIssue: (asset: EmployeeAsset) => void;
  onRequestReplacement: (asset: EmployeeAsset) => void;
  onReturnAsset: (asset: EmployeeAsset) => void;
  readOnly?: boolean;
};

export function EmployeeAssetCard({
  asset,
  onViewDetails,
  onSendStatus,
  onReportIssue,
  onRequestReplacement,
  onReturnAsset,
  readOnly = false,
}: Props) {
  const isActive = asset.assignmentStatus === "active";
  const displayName = getAssetDisplayName(asset);
  const subtitle = getAssetDisplaySubtitle(asset);
  const underRepair = isActive && isEmployeeAssetUnderRepair(asset);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-stretch">
      <div className="flex shrink-0 flex-col items-center justify-center gap-2.5 border-b bg-muted/10 px-3 py-3.5 sm:w-[11.5rem] sm:border-b-0 sm:border-r">
        <AssetDevicePreview
          categoryName={asset.categoryName}
          brand={asset.brand}
          model={asset.model}
          name={asset.name}
          imageUrl={asset.imageUrl}
          size="md"
          className="w-full"
        />
        <div className="flex w-full flex-col items-center gap-1.5 text-center">
          {underRepair ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Wrench className="size-3" />
              Under repair
            </span>
          ) : null}
          <span className="text-[11px] leading-none text-muted-foreground">
            Assigned {formatAssetDate(asset.assignedDate)}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-4 py-3.5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="text-sm font-semibold leading-none tracking-tight">{displayName}</p>
            <span
              className="inline-flex h-6 items-center rounded-md border bg-muted/40 px-2 font-mono text-[11px] font-semibold tracking-tight"
              title={asset.assetCode}
            >
              {asset.assetCode}
            </span>
          </div>
          {subtitle ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
          {asset.serialNumber ? (
            <p className="text-xs leading-relaxed">
              <span className="text-muted-foreground">Serial no. </span>
              <span className="font-medium break-all">{asset.serialNumber}</span>
            </p>
          ) : null}
          {asset.officeLocation ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="break-words">{asset.officeLocation}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onViewDetails(asset)}
          >
            <Eye className="size-3.5" />
            View Details
          </Button>
          {isActive && !readOnly ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onSendStatus(asset)}
              >
                <Send className="size-3.5" />
                Send status
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onReturnAsset(asset)}
              >
                <Undo2 className="size-3.5" />
                Return Asset
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onReportIssue(asset)}
              >
                <Wrench className="size-3.5" />
                Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onRequestReplacement(asset)}
              >
                <RefreshCw className="size-3.5" />
                Replace
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
