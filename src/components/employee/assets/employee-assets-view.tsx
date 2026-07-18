"use client";

import { Boxes, PackageCheck, RotateCcw, Search, ShieldAlert, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/common/input";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeeAssetCard } from "@/components/employee/assets/employee-asset-card";
import { EmployeeAssetDetailsDrawer } from "@/components/employee/assets/employee-asset-details-drawer";
import { EmployeeAssetIssueDialog } from "@/components/employee/assets/employee-asset-issue-dialog";
import { EmployeeAssetReplacementDialog } from "@/components/employee/assets/employee-asset-replacement-dialog";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { EmployeeAsset, EmployeeAssetsData } from "@/types/employee-assets";

export function EmployeeAssetsView({ data }: { data: EmployeeAssetsData }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [detailsAsset, setDetailsAsset] = useState<EmployeeAsset | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [issueAsset, setIssueAsset] = useState<EmployeeAsset | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const [replaceAsset, setReplaceAsset] = useState<EmployeeAsset | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const query = search.trim().toLowerCase();

  const categoryItems = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...data.categories.map((name) => ({ value: name, label: name })),
    ],
    [data.categories],
  );

  function applyFilters(list: EmployeeAsset[]) {
    return list.filter((asset) => {
      if (category !== "all" && asset.categoryName !== category) return false;
      if (query) {
        const haystack = `${asset.name} ${asset.assetCode} ${asset.serialNumber ?? ""} ${
          asset.model ?? ""
        }`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  const assigned = applyFilters(data.assigned);
  const history = applyFilters(data.history);

  const openDetails = (asset: EmployeeAsset) => {
    setDetailsAsset(asset);
    setDetailsOpen(true);
  };
  const openIssue = (asset: EmployeeAsset) => {
    setIssueAsset(asset);
    setIssueOpen(true);
  };
  const openReplace = (asset: EmployeeAsset) => {
    setReplaceAsset(asset);
    setReplaceOpen(true);
  };

  const hasAnyAssets = data.assigned.length > 0 || data.history.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <EmployeeStatCard
          label="Currently Assigned"
          value={String(data.summary.currentlyAssigned)}
          icon={Boxes}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <EmployeeStatCard
          label="Previously Returned"
          value={String(data.summary.previouslyReturned)}
          icon={PackageCheck}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <EmployeeStatCard
          label="Under Repair"
          value={String(data.summary.underRepair)}
          icon={Wrench}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <EmployeeStatCard
          label="Warranty Expiring"
          value={String(data.summary.warrantyExpiringSoon)}
          icon={ShieldAlert}
          accent="text-orange-600 dark:text-orange-400"
          iconBg="bg-orange-500/10"
        />
        <EmployeeStatCard
          label="Lost / Damaged"
          value={String(data.summary.lostOrDamaged)}
          icon={RotateCcw}
          accent="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-500/10"
        />
      </div>

      {!hasAnyAssets ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Boxes className="size-8" />
          </span>
          <div>
            <p className="text-sm font-medium">No assets assigned yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When HR assigns you a company asset, it will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, tag or serial number…"
                className="h-9 pl-8"
              />
            </div>
            <div className="w-full sm:w-48">
              <LabeledSelect items={categoryItems} value={category} onValueChange={setCategory} />
            </div>
          </div>

          {/* Currently assigned */}
          <section>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Currently Assigned Assets</h2>
              <span className="text-xs text-muted-foreground">({assigned.length})</span>
            </div>
            {assigned.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {assigned.map((asset) => (
                  <EmployeeAssetCard
                    key={asset.assignmentId}
                    asset={asset}
                    onViewDetails={openDetails}
                    onReportIssue={openIssue}
                    onRequestReplacement={openReplace}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No assets match your filters.
              </p>
            )}
          </section>

          {/* Return history */}
          {history.length > 0 ? (
            <section>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-sm font-semibold tracking-tight">Return History</h2>
                <span className="text-xs text-muted-foreground">({history.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {history.map((asset) => (
                  <EmployeeAssetCard
                    key={asset.assignmentId}
                    asset={asset}
                    onViewDetails={openDetails}
                    onReportIssue={openIssue}
                    onRequestReplacement={openReplace}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <EmployeeAssetDetailsDrawer
        asset={detailsAsset}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onReportIssue={(asset) => {
          setDetailsOpen(false);
          openIssue(asset);
        }}
        onRequestReplacement={(asset) => {
          setDetailsOpen(false);
          openReplace(asset);
        }}
      />
      <EmployeeAssetIssueDialog asset={issueAsset} open={issueOpen} onOpenChange={setIssueOpen} />
      <EmployeeAssetReplacementDialog
        asset={replaceAsset}
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
      />
    </div>
  );
}
