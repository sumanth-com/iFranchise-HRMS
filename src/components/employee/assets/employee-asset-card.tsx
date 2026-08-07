"use client";

import { Eye, MapPin, RefreshCw, Wrench } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/common/button";
import {
  AssignmentStatusBadge,
  ConditionBadge,
  WarrantyBadge,
} from "@/components/employee/assets/employee-asset-badges";
import { assetCategoryIcon } from "@/components/employee/assets/employee-asset-icons";
import {
  formatAssetDate,
  getAssetConfigurationText,
  getAssetDisplayName,
  getAssetDisplaySubtitle,
} from "@/lib/employee/assets/asset-display";
import type { EmployeeAsset } from "@/types/employee-assets";

type Props = {
  asset: EmployeeAsset;
  onViewDetails: (asset: EmployeeAsset) => void;
  onReportIssue: (asset: EmployeeAsset) => void;
  onRequestReplacement: (asset: EmployeeAsset) => void;
  readOnly?: boolean;
};

export function EmployeeAssetCard({
  asset,
  onViewDetails,
  onReportIssue,
  onRequestReplacement,
  readOnly = false,
}: Props) {
  const Icon = assetCategoryIcon(asset.categoryName);
  const isActive = asset.assignmentStatus === "active";
  const displayName = getAssetDisplayName(asset);
  const subtitle = getAssetDisplaySubtitle(asset);
  const configuration = getAssetConfigurationText(asset);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Image / icon banner */}
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
        {asset.imageUrl ? (
          <Image
            src={asset.imageUrl}
            alt={displayName}
            width={280}
            height={112}
            className="h-full w-auto object-contain p-3"
            unoptimized
          />
        ) : (
          <Icon className="size-12 text-muted-foreground/70" />
        )}
        <span className="absolute right-2.5 top-2.5">
          <AssignmentStatusBadge status={asset.assignmentStatus} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight" title={displayName}>
            {displayName}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground" title={subtitle}>
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border bg-muted/15 px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Assigned on</span>
            <span className="font-medium tabular-nums">{formatAssetDate(asset.assignedDate)}</span>
          </div>
          {asset.expectedReturnDate ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Expected return</span>
              <span className="font-medium tabular-nums">
                {formatAssetDate(asset.expectedReturnDate)}
              </span>
            </div>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Asset tag</dt>
            <dd className="truncate font-medium tabular-nums">{asset.assetCode}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Serial no.</dt>
            <dd className="truncate font-medium">{asset.serialNumber ?? "—"}</dd>
          </div>
          {asset.brand ? (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Brand</dt>
              <dd className="truncate font-medium">{asset.brand}</dd>
            </div>
          ) : null}
          {asset.model ? (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Model</dt>
              <dd className="truncate font-medium">{asset.model}</dd>
            </div>
          ) : null}
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Condition</dt>
            <dd className="mt-0.5">
              <ConditionBadge condition={asset.conditionAfter ?? asset.conditionBefore} />
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Configuration & specs
          </p>
          {configuration ? (
            <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-foreground/90">
              {configuration}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              No configuration details recorded for this asset.
            </p>
          )}
        </div>

        {asset.officeLocation ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{asset.officeLocation}</span>
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <WarrantyBadge warranty={asset.warranty} />
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => onViewDetails(asset)}
          >
            <Eye className="size-3.5" />
            View Details
          </Button>
          {isActive && !readOnly ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => onReportIssue(asset)}
              >
                <Wrench className="size-3.5" />
                Report
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => onRequestReplacement(asset)}
              >
                <RefreshCw className="size-3.5" />
                Replace
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
