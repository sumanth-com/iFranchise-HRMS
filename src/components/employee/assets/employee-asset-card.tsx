"use client";

import { format, parseISO } from "date-fns";
import { Eye, RefreshCw, Wrench } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/common/button";
import {
  AssignmentStatusBadge,
  ConditionBadge,
  WarrantyBadge,
} from "@/components/employee/assets/employee-asset-badges";
import { assetCategoryIcon } from "@/components/employee/assets/employee-asset-icons";
import type { EmployeeAsset } from "@/types/employee-assets";

type Props = {
  asset: EmployeeAsset;
  onViewDetails: (asset: EmployeeAsset) => void;
  onReportIssue: (asset: EmployeeAsset) => void;
  onRequestReplacement: (asset: EmployeeAsset) => void;
};

export function EmployeeAssetCard({
  asset,
  onViewDetails,
  onReportIssue,
  onRequestReplacement,
}: Props) {
  const Icon = assetCategoryIcon(asset.categoryName);
  const isActive = asset.assignmentStatus === "active";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Image / icon banner */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
        {asset.imageUrl ? (
          <Image
            src={asset.imageUrl}
            alt={asset.name}
            width={280}
            height={144}
            className="h-full w-auto object-contain p-3"
            unoptimized
          />
        ) : (
          <Icon className="size-14 text-muted-foreground/70" />
        )}
        <span className="absolute right-2.5 top-2.5">
          <AssignmentStatusBadge status={asset.assignmentStatus} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight" title={asset.name}>
            {asset.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {asset.categoryName ?? "Asset"}
            {asset.model ? ` · ${asset.model}` : ""}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Asset Tag</dt>
            <dd className="truncate font-medium tabular-nums">{asset.assetCode}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Assigned</dt>
            <dd className="truncate font-medium">
              {format(parseISO(asset.assignedDate), "dd MMM yyyy")}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Serial</dt>
            <dd className="truncate font-medium">{asset.serialNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Condition</dt>
            <dd>
              <ConditionBadge condition={asset.conditionAfter ?? asset.conditionBefore} />
            </dd>
          </div>
        </dl>

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
          {isActive ? (
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
