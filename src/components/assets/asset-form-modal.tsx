"use client";

import { Loader2, PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { AssetDeviceSpecFormFields } from "@/components/assets/asset-device-spec-form-fields";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import {
  createAndAssignAssetAction,
  saveAssetAction,
} from "@/lib/assets/actions";
import {
  ASSET_STATUS_LABELS,
  CONDITION_LABELS,
  HR_ASSIGN_ASSET_TYPES,
  type HrAssignAssetTypeKey,
} from "@/lib/assets/constants";
import {
  buildAssetNotes,
  parseAssetRemarks,
  parseAssetSpecs,
} from "@/lib/assets/asset-spec-utils";
import {
  categoryNameToDeviceType,
  CONNECTION_TYPE_OPTIONS,
  deviceShowsWarrantyField,
  getDeviceSpecFields,
  type AssetDeviceSpecField,
} from "@/lib/assets/asset-device-spec-fields";
import type {
  AssetCondition,
  AssetItem,
  AssetsLookups,
  AssetStatus,
} from "@/types/assets";
import { cn } from "@/lib/utils";

type PanelMode = "edit" | "assignAnother" | "create";

type FormState = {
  name: string;
  categoryId: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  warrantyExpiry: string | null;
  assetStatus: AssetStatus;
  specChip: string;
  specMemory: string;
  specStorage: string;
  specOperatingSystem: string;
  specAccessories: string;
  specConnectionType: string;
  remarks: string;
};

const emptyForm = (): FormState => ({
  name: "",
  categoryId: null,
  brand: null,
  model: null,
  serialNumber: null,
  warrantyExpiry: null,
  assetStatus: "available",
  specChip: "",
  specMemory: "",
  specStorage: "",
  specOperatingSystem: "",
  specAccessories: "",
  specConnectionType: "",
  remarks: "",
});

function toForm(asset: AssetItem): FormState {
  const specs = parseAssetSpecs(asset.notes);
  return {
    name: asset.name,
    categoryId: asset.categoryId,
    brand: asset.brand,
    model: asset.model,
    serialNumber: asset.serialNumber,
    warrantyExpiry: asset.warrantyExpiry,
    assetStatus: asset.assetStatus,
    specChip: specs.chip ?? "",
    specMemory: specs.memory ?? "",
    specStorage: specs.storage ?? "",
    specOperatingSystem: specs.operatingSystem ?? "",
    specAccessories: specs.accessories ?? "",
    specConnectionType: specs.connectionType ?? "",
    remarks: parseAssetRemarks(asset.notes) ?? "",
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const FIELD_CLASS = "h-9";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: AssetsLookups;
  editing?: AssetItem | null;
  assignToEmployeeId?: string | null;
  initialMode?: PanelMode;
  canAssign?: boolean;
};

export function AssetFormModal({
  open,
  onOpenChange,
  lookups,
  editing = null,
  assignToEmployeeId = null,
  initialMode,
  canAssign = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [panelMode, setPanelMode] = useState<PanelMode>("create");
  const [form, setForm] = useState<FormState>(emptyForm());
  const fileRef = useRef<HTMLInputElement>(null);

  const [assignAssetType, setAssignAssetType] = useState<HrAssignAssetTypeKey | "">("");
  const [assignBrand, setAssignBrand] = useState("");
  const [assignModel, setAssignModel] = useState("");
  const [assignSerial, setAssignSerial] = useState("");
  const [assignSpecChip, setAssignSpecChip] = useState("");
  const [assignSpecMemory, setAssignSpecMemory] = useState("");
  const [assignSpecStorage, setAssignSpecStorage] = useState("");
  const [assignSpecOs, setAssignSpecOs] = useState("");
  const [assignSpecAccessories, setAssignSpecAccessories] = useState("");
  const [assignSpecConnectionType, setAssignSpecConnectionType] = useState("");
  const [assignWarranty, setAssignWarranty] = useState("");
  const [assignCondition, setAssignCondition] = useState<AssetCondition>("good");
  const [assignRemarks, setAssignRemarks] = useState("");

  const targetEmployeeId =
    panelMode === "assignAnother"
      ? (assignToEmployeeId ?? editing?.assignedEmployeeId ?? "")
      : "";

  const targetEmployee = lookups.employees.find((e) => e.id === targetEmployeeId);

  const canToggleAssign =
    canAssign &&
    Boolean(editing?.assignedEmployeeId || assignToEmployeeId) &&
    Boolean(targetEmployeeId || editing?.assignedEmployeeId);

  const categoryItems = lookups.categories.map((c) => ({ value: c.id, label: c.name }));
  const statusItems = Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  const deviceTypeItems = HR_ASSIGN_ASSET_TYPES.map((t) => ({
    value: t.key,
    label: t.label,
  }));
  const conditionItems = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  useEffect(() => {
    if (!open) return;

    const resolvedMode: PanelMode =
      initialMode ??
      (assignToEmployeeId ? "assignAnother" : editing ? "edit" : "create");

    setPanelMode(resolvedMode);
    setForm(editing ? toForm(editing) : emptyForm());
    if (fileRef.current) fileRef.current.value = "";

    setAssignAssetType("");
    setAssignBrand("");
    setAssignModel("");
    setAssignSerial("");
    setAssignSpecChip("");
    setAssignSpecMemory("");
    setAssignSpecStorage("");
    setAssignSpecOs("");
    setAssignSpecAccessories("");
    setAssignSpecConnectionType("");
    setAssignWarranty("");
    setAssignCondition("good");
    setAssignRemarks("");
  }, [open, editing, assignToEmployeeId, initialMode]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function selectAssignType(key: HrAssignAssetTypeKey) {
    setAssignAssetType(key);
    const def = HR_ASSIGN_ASSET_TYPES.find((t) => t.key === key);
    if (def?.defaultBrand) setAssignBrand(def.defaultBrand);
    setAssignModel("");
    setAssignSerial("");
    setAssignSpecChip("");
    setAssignSpecMemory("");
    setAssignSpecStorage("");
    setAssignSpecOs("");
    setAssignSpecAccessories("");
    setAssignSpecConnectionType("");
    setAssignWarranty("");
  }

  function handleEditSpecChange(field: AssetDeviceSpecField, value: string) {
    if (field === "chip") setForm((f) => ({ ...f, specChip: value }));
    if (field === "memory") setForm((f) => ({ ...f, specMemory: value }));
    if (field === "storage") setForm((f) => ({ ...f, specStorage: value }));
    if (field === "operatingSystem") setForm((f) => ({ ...f, specOperatingSystem: value }));
    if (field === "accessories") setForm((f) => ({ ...f, specAccessories: value }));
    if (field === "connectionType") setForm((f) => ({ ...f, specConnectionType: value }));
  }

  function handleCategoryChange(categoryId: string) {
    const category = lookups.categories.find((c) => c.id === categoryId);
    const deviceType = categoryNameToDeviceType(category?.name);
    const allowed = new Set(getDeviceSpecFields(deviceType));

    setForm((f) => ({
      ...f,
      categoryId: categoryId || null,
      specChip: allowed.has("chip") ? f.specChip : "",
      specMemory: allowed.has("memory") ? f.specMemory : "",
      specStorage: allowed.has("storage") ? f.specStorage : "",
      specOperatingSystem: allowed.has("operatingSystem") ? f.specOperatingSystem : "",
      specAccessories: allowed.has("accessories") ? f.specAccessories : "",
      specConnectionType: allowed.has("connectionType") ? f.specConnectionType : "",
    }));
  }

  const selectedCategory = lookups.categories.find((c) => c.id === form.categoryId);
  const editDeviceType = categoryNameToDeviceType(selectedCategory?.name);
  const assignDeviceType = assignAssetType || null;
  const editShowWarranty = deviceShowsWarrantyField(editDeviceType);
  const showAssignWarranty = deviceShowsWarrantyField(assignDeviceType);
  const assignSpecFields = getDeviceSpecFields(assignDeviceType);
  const showAssignConnectionType = assignSpecFields.includes("connectionType");
  const assignAssignmentCols =
    showAssignConnectionType && showAssignWarranty
      ? 3
      : showAssignConnectionType || showAssignWarranty
        ? 2
        : 1;

  function submitEdit() {
    if (!form.name.trim()) {
      toast.error("Asset name is required");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      if (form.categoryId) fd.set("categoryId", form.categoryId);
      if (form.brand) fd.set("brand", form.brand);
      if (form.model) fd.set("model", form.model);
      if (form.serialNumber) fd.set("serialNumber", form.serialNumber);
      if (form.warrantyExpiry) fd.set("warrantyExpiry", form.warrantyExpiry);
      fd.set("assetStatus", form.assetStatus);
      const notes = buildAssetNotes(
        {
          chip: form.specChip,
          memory: form.specMemory,
          storage: form.specStorage,
          operatingSystem: form.specOperatingSystem,
          accessories: form.specAccessories,
          connectionType: form.specConnectionType,
        },
        form.remarks,
      );
      if (notes) fd.set("notes", notes);

      const image = fileRef.current?.files?.[0];
      if (image) fd.set("image", image);

      const result = await saveAssetAction(fd, editing?.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(editing ? "Asset updated" : "Asset created");
      onOpenChange(false);
      router.refresh();
    });
  }

  function submitAssignAnother() {
    if (!targetEmployeeId) {
      toast.error("No employee selected for assignment");
      return;
    }
    if (!assignAssetType) {
      toast.error("Select a device type");
      return;
    }

    startTransition(async () => {
      const result = await createAndAssignAssetAction({
        employeeId: targetEmployeeId,
        assetType: assignAssetType,
        brand: assignBrand.trim() || null,
        model: assignModel.trim() || null,
        serialNumber: assignSerial.trim() || null,
        specChip: assignSpecChip.trim() || null,
        specMemory: assignSpecMemory.trim() || null,
        specStorage: assignSpecStorage.trim() || null,
        specOperatingSystem: assignSpecOs.trim() || null,
        specAccessories: assignSpecAccessories.trim() || null,
        specConnectionType: assignSpecConnectionType.trim() || null,
        warrantyExpiry: assignWarranty || null,
        purchaseDate: todayIso(),
        conditionBefore: assignCondition,
        remarks: assignRemarks.trim() || null,
        assignedDate: todayIso(),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`Asset assigned to ${targetEmployee?.label ?? "employee"}`);
      onOpenChange(false);
      router.refresh();
    });
  }

  const modalTitle =
    panelMode === "assignAnother"
      ? "Add asset"
      : editing
        ? "Edit asset"
        : "Add asset";

  const modalDescription =
    panelMode === "assignAnother"
      ? `Assign another device to ${targetEmployee?.label ?? "employee"}.`
      : "Register hardware with structured specifications.";

  const headerAddon =
    editing && canToggleAssign
      ? (
          <div className="flex shrink-0 rounded-lg border bg-muted/30 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={panelMode === "edit" ? "default" : "ghost"}
              className="h-8 px-3"
              onClick={() => setPanelMode("edit")}
            >
              Edit asset
            </Button>
            <Button
              type="button"
              size="sm"
              variant={panelMode === "assignAnother" ? "default" : "ghost"}
              className="h-8 px-3"
              onClick={() => setPanelMode("assignAnother")}
            >
              Add asset
            </Button>
          </div>
        )
      : undefined;

  const footer =
    panelMode === "assignAnother"
      ? (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              disabled={isPending}
              onClick={submitAssignAnother}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
              Assign asset
            </Button>
          </>
        )
      : (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={submitEdit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create asset"}
            </Button>
          </>
        );

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={modalTitle}
      description={modalDescription}
      contentClassName="w-[min(96vw,48rem)] !max-w-[min(96vw,48rem)]"
      showCancel={false}
      headerAddon={headerAddon}
      footer={footer}
    >
      {panelMode === "assignAnother" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <EmployeeSelect
              employees={lookups.employees}
              value={targetEmployeeId}
              onValueChange={() => {}}
              disabled
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Device type</Label>
              <LabeledSelect
                items={deviceTypeItems}
                value={assignAssetType}
                onValueChange={(v) => selectAssignType(v as HrAssignAssetTypeKey)}
                placeholder="Select device type…"
              />
            </div>
            <div className="space-y-2">
              <Label>Serial number</Label>
              <Input
                className={FIELD_CLASS}
                value={assignSerial}
                onChange={(e) => setAssignSerial(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                className={FIELD_CLASS}
                value={assignBrand}
                onChange={(e) => setAssignBrand(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                className={FIELD_CLASS}
                value={assignModel}
                onChange={(e) => setAssignModel(e.target.value)}
              />
            </div>
          </div>

          <AssetDeviceSpecFormFields
            deviceType={assignDeviceType}
            excludeFields={showAssignConnectionType ? ["connectionType"] : []}
            values={{
              chip: assignSpecChip,
              memory: assignSpecMemory,
              storage: assignSpecStorage,
              operatingSystem: assignSpecOs,
              accessories: assignSpecAccessories,
              connectionType: assignSpecConnectionType,
            }}
            onChange={(field, value) => {
              if (field === "chip") setAssignSpecChip(value);
              if (field === "memory") setAssignSpecMemory(value);
              if (field === "storage") setAssignSpecStorage(value);
              if (field === "operatingSystem") setAssignSpecOs(value);
              if (field === "accessories") setAssignSpecAccessories(value);
              if (field === "connectionType") setAssignSpecConnectionType(value);
            }}
            fieldClass={FIELD_CLASS}
          />

          <div
            className={cn(
              "grid gap-3",
              assignAssignmentCols === 3 && "sm:grid-cols-3",
              assignAssignmentCols === 2 && "sm:grid-cols-2",
            )}
          >
            {showAssignConnectionType ? (
              <div className="space-y-2">
                <Label>Connection type</Label>
                <LabeledSelect
                  items={CONNECTION_TYPE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  value={assignSpecConnectionType}
                  onValueChange={setAssignSpecConnectionType}
                  placeholder="Select connection…"
                  triggerClassName={FIELD_CLASS}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Condition</Label>
              <LabeledSelect
                items={conditionItems}
                value={assignCondition}
                onValueChange={(v) => setAssignCondition(v as AssetCondition)}
                triggerClassName={FIELD_CLASS}
              />
            </div>
            {showAssignWarranty ? (
              <div className="space-y-2">
                <Label>Warranty expiry</Label>
                <Input
                  type="date"
                  className={FIELD_CLASS}
                  value={assignWarranty}
                  onChange={(e) => setAssignWarranty(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Handover notes</Label>
            <Input
              className={FIELD_CLASS}
              placeholder="Optional notes for this assignment"
              value={assignRemarks}
              onChange={(e) => setAssignRemarks(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Asset name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <LabeledSelect
                items={categoryItems}
                value={form.categoryId ?? ""}
                onValueChange={handleCategoryChange}
                placeholder="Category"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <LabeledSelect
                items={statusItems}
                value={form.assetStatus}
                onValueChange={(v) => setForm({ ...form, assetStatus: v as AssetStatus })}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={form.brand ?? ""}
                onChange={(e) => setForm({ ...form, brand: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={form.model ?? ""}
                onChange={(e) => setForm({ ...form, model: e.target.value || null })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Serial number</Label>
              <Input
                value={form.serialNumber ?? ""}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value || null })}
              />
            </div>
          </div>

          <AssetDeviceSpecFormFields
            deviceType={editDeviceType}
            values={{
              chip: form.specChip,
              memory: form.specMemory,
              storage: form.specStorage,
              operatingSystem: form.specOperatingSystem,
              accessories: form.specAccessories,
              connectionType: form.specConnectionType,
            }}
            onChange={handleEditSpecChange}
            fieldClass={FIELD_CLASS}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {editShowWarranty ? (
              <div className="space-y-2">
                <Label>Warranty expiry</Label>
                <Input
                  type="date"
                  value={form.warrantyExpiry ?? ""}
                  onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value || null })}
                />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Image (optional)</Label>
              <input ref={fileRef} type="file" accept="image/*" className="text-sm" />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
