"use client";

import { format } from "date-fns";
import { CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  completeMaintenanceAction,
  saveMaintenanceAction,
} from "@/lib/assets/actions";
import {
  ASSETS_ROUTES,
  MAINTENANCE_STATUS_LABELS,
  canEditAssets,
} from "@/lib/assets/constants";
import {
  maintenanceFormSchema,
  type MaintenanceFormValues,
} from "@/lib/validations/assets";
import type {
  AssetMaintenanceItem,
  AssetMaintenanceListResult,
  AssetMaintenanceStatus,
  AssetsLookups,
} from "@/types/assets";

type MaintenanceFormInput = {
  assetId: string;
  vendorId: string | null;
  maintenanceDate: string;
  issue: string;
  cost: string | number | null;
  nextServiceDate: string | null;
  maintenanceStatus: AssetMaintenanceStatus;
  notes: string | null;
};

type Props = {
  result: AssetMaintenanceListResult;
  lookups: AssetsLookups;
  permissionCodes: string[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MaintenanceManagement({ result, lookups, permissionCodes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const canEdit = canEditAssets(permissionCodes);

  const form = useForm<MaintenanceFormInput>({
    resolver: zodResolver(maintenanceFormSchema) as never,
    defaultValues: {
      assetId: "",
      vendorId: null,
      maintenanceDate: todayIso(),
      issue: "",
      cost: null,
      nextServiceDate: null,
      maintenanceStatus: "pending",
      notes: null,
    },
  });

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`${ASSETS_ROUTES.maintenance}?${params.toString()}`);
    });
  }

  function openCreate() {
    form.reset({
      assetId: "",
      vendorId: null,
      maintenanceDate: todayIso(),
      issue: "",
      cost: null,
      nextServiceDate: null,
      maintenanceStatus: "pending",
      notes: null,
    });
    setOpen(true);
  }

  function onSave(values: MaintenanceFormInput) {
    startTransition(async () => {
      const res = await saveMaintenanceAction(values as MaintenanceFormValues);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Maintenance record created");
      setOpen(false);
      router.refresh();
    });
  }

  const onUpdateStatus = useCallback(
    (id: string, status: "completed" | "cancelled") => {
      startTransition(async () => {
        const res = await completeMaintenanceAction(id, status);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(status === "completed" ? "Marked completed" : "Cancelled");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<
    DataTableColumn<AssetMaintenanceItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "assetCode",
        header: "Asset",
        render: (row) => (
          <div>
            <p className="font-medium">{row.assetName}</p>
            <p className="text-xs text-muted-foreground">{row.assetCode}</p>
          </div>
        ),
      },
      {
        key: "issue",
        header: "Issue",
        render: (row) => (
          <p className="max-w-xs truncate text-sm" title={row.issue}>
            {row.issue}
          </p>
        ),
      },
      {
        key: "vendorName",
        header: "Vendor",
        render: (row) => row.vendorName ?? "—",
      },
      {
        key: "maintenanceDate",
        header: "Date",
        render: (row) => format(new Date(row.maintenanceDate), "dd MMM yyyy"),
      },
      {
        key: "cost",
        header: "Cost",
        render: (row) =>
          row.cost != null ? `₹${row.cost.toLocaleString("en-IN")}` : "—",
      },
      {
        key: "maintenanceStatus",
        header: "Status",
        render: (row) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {MAINTENANCE_STATUS_LABELS[row.maintenanceStatus]}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          if (
            !canEdit ||
            row.maintenanceStatus === "completed" ||
            row.maintenanceStatus === "cancelled"
          ) {
            return null;
          }
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onUpdateStatus(row.id, "completed")}
                aria-label="Complete"
                title="Complete"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onUpdateStatus(row.id, "cancelled")}
                aria-label="Cancel"
                title="Cancel"
              >
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canEdit, onUpdateStatus],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule repairs, track costs, and close maintenance tickets.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Log Maintenance
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-3">
        <Input
          placeholder="Search asset or issue…"
          defaultValue={searchParams.get("search") ?? ""}
          onBlur={(e) => updateParams({ search: e.target.value || undefined })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value || undefined });
            }
          }}
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All assets" },
            ...lookups.allAssets.map((a) => ({ value: a.id, label: a.label })),
          ]}
          value={searchParams.get("assetId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ assetId: value === "__all__" ? undefined : value })
          }
          placeholder="Asset"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All statuses" },
            ...Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={searchParams.get("maintenanceStatus") || "__all__"}
          onValueChange={(value) =>
            updateParams({
              maintenanceStatus: value === "__all__" ? undefined : value,
            })
          }
          placeholder="Status"
        />
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No maintenance records"
          description="Log a repair or service ticket for an asset."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} · {result.total} records
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1 || isPending}
            onClick={() => updateParams({ page: String(result.page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page * result.pageSize >= result.total || isPending}
            onClick={() => updateParams({ page: String(result.page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Log Maintenance"
        description="Create a maintenance or repair record for an asset."
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <LabeledSelect
              items={lookups.allAssets.map((a) => ({ value: a.id, label: a.label }))}
              value={form.watch("assetId")}
              onValueChange={(value) =>
                form.setValue("assetId", value, { shouldValidate: true })
              }
              placeholder="Select asset"
            />
          </div>
          <div className="space-y-2">
            <Label>Vendor</Label>
            <LabeledSelect
              items={[
                { value: "__none__", label: "No vendor" },
                ...lookups.vendors.map((v) => ({ value: v.id, label: v.label })),
              ]}
              value={form.watch("vendorId") || "__none__"}
              onValueChange={(value) =>
                form.setValue("vendorId", value === "__none__" ? null : value, {
                  shouldDirty: true,
                })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Maintenance Date</Label>
              <Input type="date" {...form.register("maintenanceDate")} />
            </div>
            <div className="space-y-2">
              <Label>Next Service Date</Label>
              <Input type="date" {...form.register("nextServiceDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Issue</Label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("issue")}
              placeholder="Describe the issue…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cost</Label>
              <Input type="number" min={0} step="0.01" {...form.register("cost")} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <LabeledSelect
                items={Object.entries(MAINTENANCE_STATUS_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
                value={form.watch("maintenanceStatus")}
                onValueChange={(value) =>
                  form.setValue(
                    "maintenanceStatus",
                    value as MaintenanceFormValues["maintenanceStatus"],
                    { shouldDirty: true },
                  )
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("notes")}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
