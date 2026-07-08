"use client";

import {
  Loader2,
  Pencil,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
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
  deleteAssetAction,
  getAssetQrAction,
  saveAssetAction,
} from "@/lib/assets/actions";
import {
  ASSET_STATUS_LABELS,
  ASSETS_ROUTES,
  canCreateAssets,
  canDeleteAssets,
  canEditAssets,
} from "@/lib/assets/constants";
import {
  assetFormSchema,
  type AssetFormValues,
} from "@/lib/validations/assets";
import type {
  AssetItem,
  AssetListResult,
  AssetsLookups,
  AssetStatus,
} from "@/types/assets";

type AssetFormInput = {
  name: string;
  categoryId: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCost: string | number | null;
  warrantyExpiry: string | null;
  vendorId: string | null;
  assetStatus: AssetStatus;
  officeLocation: string | null;
  departmentId: string | null;
  notes: string | null;
};

type Props = {
  result: AssetListResult;
  lookups: AssetsLookups;
  permissionCodes: string[];
};

const emptyForm: AssetFormInput = {
  name: "",
  categoryId: null,
  brand: null,
  model: null,
  serialNumber: null,
  purchaseDate: null,
  purchaseCost: null,
  warrantyExpiry: null,
  vendorId: null,
  assetStatus: "available",
  officeLocation: null,
  departmentId: null,
  notes: null,
};

export function AssetsInventoryManagement({
  result,
  lookups,
  permissionCodes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetItem | null>(null);
  const [qrPreview, setQrPreview] = useState<{ code: string; dataUrl: string } | null>(
    null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canCreate = canCreateAssets(permissionCodes);
  const canEdit = canEditAssets(permissionCodes);
  const canDelete = canDeleteAssets(permissionCodes);

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(assetFormSchema) as never,
    defaultValues: emptyForm,
  });

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`${ASSETS_ROUTES.inventory}?${params.toString()}`);
    });
  }

  const openCreate = useCallback(() => {
    setEditing(null);
    setImageFile(null);
    form.reset(emptyForm);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: AssetItem) => {
      setEditing(item);
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
      form.reset({
        name: item.name,
        categoryId: item.categoryId,
        brand: item.brand,
        model: item.model,
        serialNumber: item.serialNumber,
        purchaseDate: item.purchaseDate,
        purchaseCost: item.purchaseCost,
        warrantyExpiry: item.warrantyExpiry,
        vendorId: item.vendorId,
        assetStatus: item.assetStatus,
        officeLocation: item.officeLocation,
        departmentId: item.departmentId,
        notes: item.notes,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: AssetFormInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", values.name);
      if (values.categoryId) formData.set("categoryId", values.categoryId);
      if (values.brand) formData.set("brand", values.brand);
      if (values.model) formData.set("model", values.model);
      if (values.serialNumber) formData.set("serialNumber", values.serialNumber);
      if (values.purchaseDate) formData.set("purchaseDate", values.purchaseDate);
      if (values.purchaseCost != null && values.purchaseCost !== "") {
        formData.set("purchaseCost", String(values.purchaseCost));
      }
      if (values.warrantyExpiry) formData.set("warrantyExpiry", values.warrantyExpiry);
      if (values.vendorId) formData.set("vendorId", values.vendorId);
      formData.set("assetStatus", values.assetStatus);
      if (values.officeLocation) formData.set("officeLocation", values.officeLocation);
      if (values.departmentId) formData.set("departmentId", values.departmentId);
      if (values.notes) formData.set("notes", values.notes);
      if (imageFile) formData.set("image", imageFile);

      const resultAction = await saveAssetAction(formData, editing?.id);
      if (!resultAction.success) {
        toast.error(resultAction.message);
        return;
      }
      toast.success(editing ? "Asset updated" : "Asset created");
      setOpen(false);
      setEditing(null);
      setImageFile(null);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this asset? This cannot be undone.")) return;
      startTransition(async () => {
        const res = await deleteAssetAction(id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Asset deleted");
        router.refresh();
      });
    },
    [router],
  );

  const onShowQr = useCallback((row: AssetItem) => {
    if (!row.qrPayload) {
      toast.error("QR code is not available for this asset");
      return;
    }
    startTransition(async () => {
      const res = await getAssetQrAction(row.qrPayload!);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Failed to generate QR");
        return;
      }
      setQrPreview({ code: row.assetCode, dataUrl: res.data });
    });
  }, []);

  const columns = useMemo<DataTableColumn<AssetItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "assetCode",
        header: "Asset",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.assetCode}</p>
          </div>
        ),
      },
      {
        key: "categoryName",
        header: "Category",
        render: (row) => row.categoryName ?? "—",
      },
      {
        key: "serialNumber",
        header: "Serial / Brand",
        render: (row) => (
          <div>
            <p className="text-sm">{row.serialNumber ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {[row.brand, row.model].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        key: "assetStatus",
        header: "Status",
        render: (row) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {ASSET_STATUS_LABELS[row.assetStatus]}
          </span>
        ),
      },
      {
        key: "assignedEmployeeName",
        header: "Assigned To",
        render: (row) => row.assignedEmployeeName ?? "—",
      },
      {
        key: "departmentName",
        header: "Department",
        render: (row) => row.departmentName ?? "—",
      },
      {
        key: "purchaseCost",
        header: "Cost",
        render: (row) =>
          row.purchaseCost != null
            ? `₹${row.purchaseCost.toLocaleString("en-IN")}`
            : "—",
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.qrPayload ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onShowQr(row)}
                aria-label="Show QR"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openEdit(row)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onDelete(row.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, onDelete, onShowQr, openEdit],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track company assets, warranties, locations, and assignment status.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <Input
          placeholder="Search name, code, serial…"
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
            { value: "__all__", label: "All categories" },
            ...lookups.categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={searchParams.get("categoryId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ categoryId: value === "__all__" ? undefined : value })
          }
          placeholder="Category"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All statuses" },
            ...Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={searchParams.get("assetStatus") || "__all__"}
          onValueChange={(value) =>
            updateParams({ assetStatus: value === "__all__" ? undefined : value })
          }
          placeholder="Status"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All departments" },
            ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
          ]}
          value={searchParams.get("departmentId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ departmentId: value === "__all__" ? undefined : value })
          }
          placeholder="Department"
        />
        <Input
          placeholder="Location…"
          defaultValue={searchParams.get("location") ?? ""}
          onBlur={(e) => updateParams({ location: e.target.value || undefined })}
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
          title="No assets found"
          description="Add an asset or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} · {result.total} assets
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
        title={editing ? "Edit Asset" : "Add Asset"}
        description={
          editing
            ? "Update asset details and optionally replace the image."
            : "Register a new company asset in the inventory."
        }
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Save Changes" : "Create Asset"}
          </Button>
        }
      >
        <div className="space-y-4">
          {editing ? (
            <div className="space-y-2">
              <Label>Asset Code</Label>
              <Input value={editing.assetCode} readOnly disabled />
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="e.g. Dell Latitude 5440" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <LabeledSelect
                items={[
                  { value: "__none__", label: "No category" },
                  ...lookups.categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={form.watch("categoryId") || "__none__"}
                onValueChange={(value) =>
                  form.setValue("categoryId", value === "__none__" ? null : value, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <LabeledSelect
                items={Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={form.watch("assetStatus")}
                onValueChange={(value) =>
                  form.setValue("assetStatus", value as AssetFormValues["assetStatus"], {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input {...form.register("brand")} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input {...form.register("model")} />
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input {...form.register("serialNumber")} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" {...form.register("purchaseDate")} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Cost</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...form.register("purchaseCost")}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Input type="date" {...form.register("warrantyExpiry")} />
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
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...form.register("officeLocation")} placeholder="Office / floor" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <LabeledSelect
                items={[
                  { value: "__none__", label: "No department" },
                  ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
                ]}
                value={form.watch("departmentId") || "__none__"}
                onValueChange={(value) =>
                  form.setValue("departmentId", value === "__none__" ? null : value, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                {...form.register("notes")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Image</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {editing?.imagePath && !imageFile ? (
                <p className="text-xs text-muted-foreground">
                  Current image on file — upload a new file to replace it.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(qrPreview)}
        onOpenChange={(next) => !next && setQrPreview(null)}
        title={`QR · ${qrPreview?.code ?? ""}`}
        description="Scan to identify this asset."
        contentClassName="sm:max-w-sm"
        showCancel
      >
        {qrPreview ? (
          <div className="flex flex-col items-center gap-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrPreview.dataUrl}
              alt={`QR for ${qrPreview.code}`}
              className="h-56 w-56 rounded-lg border bg-white p-2"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(qrPreview.dataUrl, "_blank")}
            >
              Open in new window
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
