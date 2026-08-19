"use client";

import { Eye, MapPin, RefreshCw, Send, Wrench } from "lucide-react";

import { AssetDevicePreview } from "@/components/assets/asset-device-preview";
import { Button } from "@/components/common/button";
import {
  AssetStatusBadge,
  AssignmentStatusBadge,
  ConditionBadge,
} from "@/components/employee/assets/employee-asset-badges";
import {
  formatAssetDate,
  getAssetDisplayName,
  getAssetDisplaySubtitle,
} from "@/lib/employee/assets/asset-display";
import type { EmployeeAsset } from "@/types/employee-assets";

type Props = {
  asset: EmployeeAsset;
  onViewDetails: (asset: EmployeeAsset) => void;
  onSendStatus: (asset: EmployeeAsset) => void;
  onReportIssue: (asset: EmployeeAsset) => void;
  onRequestReplacement: (asset: EmployeeAsset) => void;
  readOnly?: boolean;
};

export function EmployeeAssetCard({
  asset,
  onViewDetails,
  onSendStatus,
  onReportIssue,
  onRequestReplacement,
  readOnly = false,
}: Props) {
  const isActive = asset.assignmentStatus === "active";
  const displayName = getAssetDisplayName(asset);
  const subtitle = getAssetDisplaySubtitle(asset);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md sm:flex-row">
      <div className="shrink-0 border-b bg-muted/10 p-3 sm:w-52 sm:border-b-0 sm:border-r">
        <AssetDevicePreview
          categoryName={asset.categoryName}
          brand={asset.brand}
          model={asset.model}
          name={asset.name}
          imageUrl={asset.imageUrl}
          size="md"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug tracking-tight">{displayName}</p>
            {subtitle ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {isActive ? (
            <AssetStatusBadge status={asset.assetStatus} />
          ) : (
            <AssignmentStatusBadge status={asset.assignmentStatus} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-md border bg-muted/40 px-2.5 py-1 font-mono text-xs font-semibold tracking-tight"
            title={asset.assetCode}
          >
            {asset.assetCode}
          </span>
          <ConditionBadge condition={asset.conditionAfter ?? asset.conditionBefore} />
          <span className="text-xs text-muted-foreground">
            Assigned {formatAssetDate(asset.assignedDate)}
          </span>
        </div>

        {asset.serialNumber ? (
          <p className="text-xs leading-relaxed">
            <span className="text-muted-foreground">Serial no. </span>
            <span className="font-medium break-all">{asset.serialNumber}</span>
          </p>
        ) : null}

        {asset.officeLocation ? (
          <p className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0" />
            <span className="break-words">{asset.officeLocation}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
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
                className="gap-1.5"
                onClick={() => onSendStatus(asset)}
              >
                <Send className="size-3.5" />
                Send status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => onReportIssue(asset)}
              >
                <Wrench className="size-3.5" />
                Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
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
