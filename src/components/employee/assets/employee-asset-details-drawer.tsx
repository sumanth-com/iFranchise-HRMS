"use client";

import { format, parseISO } from "date-fns";
import { RefreshCw, Wrench } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/common/button";
import {
  AssignmentStatusBadge,
  ConditionBadge,
  WarrantyBadge,
} from "@/components/employee/assets/employee-asset-badges";
import { assetCategoryIcon } from "@/components/employee/assets/employee-asset-icons";
import { MAINTENANCE_STATUS_LABELS } from "@/lib/assets/constants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EmployeeAsset } from "@/types/employee-assets";

function fmt(date: string | null) {
  return date ? format(parseISO(date), "dd MMM yyyy") : "—";
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

type Props = {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportIssue: (asset: EmployeeAsset) => void;
  onRequestReplacement: (asset: EmployeeAsset) => void;
};

export function EmployeeAssetDetailsDrawer({
  asset,
  open,
  onOpenChange,
  onReportIssue,
  onRequestReplacement,
}: Props) {
  const Icon = assetCategoryIcon(asset?.categoryName ?? null);
  const isActive = asset?.assignmentStatus === "active";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {asset ? (
          <>
            <SheetHeader className="border-b p-4 pr-12">
              <SheetTitle className="text-base">{asset.name}</SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{asset.assetCode}</span>
                <span>·</span>
                <span>{asset.categoryName ?? "Asset"}</span>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-center rounded-xl border bg-muted/30 p-4">
                {asset.imageUrl ? (
                  <Image
                    src={asset.imageUrl}
                    alt={asset.name}
                    width={320}
                    height={200}
                    className="max-h-40 w-auto rounded-lg object-contain"
                    unoptimized
                  />
                ) : (
                  <Icon className="size-16 text-muted-foreground" />
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AssignmentStatusBadge status={asset.assignmentStatus} />
                <ConditionBadge condition={asset.conditionAfter ?? asset.conditionBefore} />
                <WarrantyBadge warranty={asset.warranty} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label="Manufacturer" value={asset.brand} />
                <Detail label="Model" value={asset.model} />
                <Detail label="Serial Number" value={asset.serialNumber} />
                <Detail label="Office Location" value={asset.officeLocation} />
                <Detail label="Purchase Date" value={fmt(asset.purchaseDate)} />
                <Detail label="Assigned Date" value={fmt(asset.assignedDate)} />
                <Detail
                  label="Warranty Expiry"
                  value={asset.warranty.expiry ? fmt(asset.warranty.expiry) : "—"}
                />
                <Detail
                  label="Expected Return"
                  value={fmt(asset.expectedReturnDate)}
                />
              </div>

              {asset.notes?.trim() ? (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Configuration
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{asset.notes}</p>
                </div>
              ) : null}

              {/* Return status */}
              {!isActive ? (
                <div className="mt-4 rounded-xl border bg-muted/20 p-3">
                  <p className="text-sm font-semibold">Return details</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <Detail label="Returned On" value={fmt(asset.returnedDate)} />
                    <Detail
                      label="Condition After"
                      value={asset.conditionAfter ?? "—"}
                    />
                  </div>
                  {asset.returnRemarks?.trim() ? (
                    <p className="mt-2 text-xs text-muted-foreground">{asset.returnRemarks}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Maintenance history */}
              <div className="mt-5">
                <p className="text-sm font-semibold">Maintenance & Service History</p>
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
                  <p className="mt-2 rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                    No maintenance or service records yet.
                  </p>
                )}
              </div>
            </div>

            {isActive ? (
              <div className="flex items-center gap-2 border-t p-4">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => onReportIssue(asset)}
                >
                  <Wrench className="size-4" />
                  Report Issue
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => onRequestReplacement(asset)}
                >
                  <RefreshCw className="size-4" />
                  Request Replacement
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
