"use client";

import {
  Loader2,
  PackagePlus,
  ClipboardCheck,
  Layers,
  Plus,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { AssetDeviceSpecFormFields } from "@/components/assets/asset-device-spec-form-fields";
import { AssetDeviceVisual } from "@/components/assets/asset-device-visual";
import { AssetDeviceEmptyPreview } from "@/components/assets/asset-device-empty-preview";
import {
  AssetSpecGrid,
  AssetSpecRow,
  AssetSpecSection,
} from "@/components/assets/asset-spec-display";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { assignAssetAction, createAndAssignAssetAction } from "@/lib/assets/actions";
import {
  CONDITION_LABELS,
  HR_ASSIGN_ASSET_TYPES,
  type HrAssignAssetTypeKey,
} from "@/lib/assets/constants";
import { parseAssetRemarks, parseAssetSpecs } from "@/lib/assets/asset-spec-utils";
import { categoryNameToDeviceType, deviceShowsWarrantyField } from "@/lib/assets/asset-device-spec-fields";
import { resolveAssetDeviceType } from "@/lib/assets/asset-device-images";
import type { AssetItem, AssetsLookups, AssetCondition } from "@/types/assets";
import { cn } from "@/lib/utils";

function PanelHeading({
  icon: Icon,
  title,
  description,
  iconWrapClassName,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  iconWrapClassName: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
          iconWrapClassName,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

type Props = {
  lookups: AssetsLookups;
  inventory?: AssetItem[];
  onAssigned?: () => void;
  canCreate?: boolean;
};

type AssignMode = "existing" | "register";

const INVENTORY_PREFIX = "inv:";
const NEW_PREFIX = "new:";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const FIELD_CLASS = "h-9";

export function HrAssignAssetWizard({
  lookups,
  inventory = [],
  onAssigned,
  canCreate = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [assetSelection, setAssetSelection] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [specChip, setSpecChip] = useState("");
  const [specMemory, setSpecMemory] = useState("");
  const [specStorage, setSpecStorage] = useState("");
  const [specOs, setSpecOs] = useState("");
  const [specAccessories, setSpecAccessories] = useState("");
  const [specConnectionType, setSpecConnectionType] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [conditionBefore, setConditionBefore] = useState<AssetCondition>("good");

  const mode: AssignMode | null = assetSelection.startsWith(INVENTORY_PREFIX)
    ? "existing"
    : assetSelection.startsWith(NEW_PREFIX)
      ? "register"
      : null;

  const existingAssetId =
    mode === "existing" ? assetSelection.slice(INVENTORY_PREFIX.length) : "";
  const assetType =
    mode === "register"
      ? (assetSelection.slice(NEW_PREFIX.length) as HrAssignAssetTypeKey)
      : null;

  const selectedEmployee = lookups.employees.find((e) => e.id === employeeId);
  const selectedTypeDef = HR_ASSIGN_ASSET_TYPES.find((t) => t.key === assetType);
  const selectedExisting = inventory.find((a) => a.id === existingAssetId);
  const existingSpecs = parseAssetSpecs(selectedExisting?.notes);
  const existingRemarks = parseAssetRemarks(selectedExisting?.notes);

  const availableInventory = useMemo(
    () => inventory.filter((a) => a.assetStatus === "available"),
    [inventory],
  );

  const assetItems = useMemo(
    () => [
      ...availableInventory.map((a) => ({
        value: `${INVENTORY_PREFIX}${a.id}`,
        label: a.name,
      })),
      ...HR_ASSIGN_ASSET_TYPES.map((t) => ({
        value: `${NEW_PREFIX}${t.key}`,
        label: t.label,
      })),
    ],
    [availableInventory],
  );

  const hasAssetSelection = Boolean(assetSelection);

  const configDeviceType =
    mode === "register" && assetType
      ? assetType
      : mode === "existing" && selectedExisting
        ? (categoryNameToDeviceType(selectedExisting.categoryName) ??
          resolveAssetDeviceType({
            categoryName: selectedExisting.categoryName,
            brand: selectedExisting.brand,
            model: selectedExisting.model,
            name: selectedExisting.name,
          }))
        : null;

  const showWarrantyField = deviceShowsWarrantyField(configDeviceType);

  function handleAssetChange(value: string) {
    setAssetSelection(value);

    if (value.startsWith(NEW_PREFIX)) {
      const key = value.slice(NEW_PREFIX.length) as HrAssignAssetTypeKey;
      const def = HR_ASSIGN_ASSET_TYPES.find((t) => t.key === key);
      setBrand(def?.defaultBrand ?? "");
      setModel("");
      setSerialNumber("");
      setSpecChip("");
      setSpecMemory("");
      setSpecStorage("");
      setSpecOs("");
      setSpecAccessories("");
      setSpecConnectionType("");
      setWarrantyExpiry("");
      return;
    }

    if (value.startsWith(INVENTORY_PREFIX)) {
      const asset = inventory.find((a) => a.id === value.slice(INVENTORY_PREFIX.length));
      const specs = parseAssetSpecs(asset?.notes);
      setBrand(asset?.brand ?? "");
      setModel(asset?.model ?? "");
      setSerialNumber(asset?.serialNumber ?? "");
      setSpecChip(specs.chip ?? "");
      setSpecMemory(specs.memory ?? "");
      setSpecStorage(specs.storage ?? "");
      setSpecOs(specs.operatingSystem ?? "");
      setSpecAccessories(specs.accessories ?? "");
      setSpecConnectionType(specs.connectionType ?? "");
      setWarrantyExpiry(asset?.warrantyExpiry ?? "");
    }
  }

  function resetForm() {
    setEmployeeId("");
    setAssetSelection("");
    setBrand("");
    setModel("");
    setSerialNumber("");
    setSpecChip("");
    setSpecMemory("");
    setSpecStorage("");
    setSpecOs("");
    setSpecAccessories("");
    setSpecConnectionType("");
    setWarrantyExpiry("");
    setConditionBefore("good");
  }

  function handleAssign() {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }

    if (mode === "existing") {
      if (!existingAssetId) {
        toast.error("Select an asset");
        return;
      }
      if (!selectedExisting || selectedExisting.assetStatus !== "available") {
        toast.error("This asset is not available for assignment");
        return;
      }

      startTransition(async () => {
        const result = await assignAssetAction({
          assetId: existingAssetId,
          employeeId,
          assignedDate: todayIso(),
          conditionBefore,
          remarks: null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          serialNumber: serialNumber.trim() || null,
          specChip: specChip.trim() || null,
          specMemory: specMemory.trim() || null,
          specStorage: specStorage.trim() || null,
          specOperatingSystem: specOs.trim() || null,
          specAccessories: specAccessories.trim() || null,
          specConnectionType: specConnectionType.trim() || null,
          warrantyExpiry: warrantyExpiry || null,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(`Asset assigned to ${selectedEmployee?.label ?? "employee"}`);
        resetForm();
        router.refresh();
        onAssigned?.();
      });
      return;
    }

    if (!assetType) {
      toast.error("Select an asset");
      return;
    }

    startTransition(async () => {
      const result = await createAndAssignAssetAction({
        employeeId,
        assetType,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serialNumber: serialNumber.trim() || null,
        specChip: specChip.trim() || null,
        specMemory: specMemory.trim() || null,
        specStorage: specStorage.trim() || null,
        specOperatingSystem: specOs.trim() || null,
        specAccessories: specAccessories.trim() || null,
        specConnectionType: specConnectionType.trim() || null,
        warrantyExpiry: warrantyExpiry || null,
        purchaseDate: todayIso(),
        conditionBefore,
        remarks: null,
        assignedDate: todayIso(),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`Asset assigned to ${selectedEmployee?.label ?? "employee"}`);
      resetForm();
      router.refresh();
      onAssigned?.();
    });
  }

  const conditionItems = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const canSubmit = employeeId && hasAssetSelection;

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Assign asset</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select employee and asset, then complete configuration and assign.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <EmployeeSelect
              employees={lookups.employees}
              value={employeeId}
              onValueChange={setEmployeeId}
              placeholder="Select employee…"
            />
            <LabeledSelect
              items={assetItems}
              value={assetSelection}
              onValueChange={handleAssetChange}
              placeholder="Select asset…"
            />
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              className="h-9 w-full gap-2 sm:w-auto"
              disabled={isPending || !canSubmit}
              onClick={handleAssign}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PackagePlus className="size-4" />
              )}
              Assign asset
            </Button>
            {canCreate ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full gap-1.5 sm:w-auto"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Add asset
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Pick who receives the device, choose the asset type, then fill in the details below.
        </p>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="flex min-h-[12rem] flex-1 flex-col rounded-xl border bg-gradient-to-br from-violet-500/5 via-muted/10 to-muted/5 p-4">
              <PanelHeading
                icon={Layers}
                title="Selected asset"
                description="Preview the device before you assign it to the employee."
                iconWrapClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
              />
              {hasAssetSelection ? (
                <div className="flex flex-1 flex-col space-y-4">
                  {mode === "register" && assetType ? (
                    <div className="flex flex-1 flex-col gap-3">
                      <AssetDeviceVisual type={assetType} size="xl" />
                      <p className="text-center text-sm font-semibold">{selectedTypeDef?.label}</p>
                    </div>
                  ) : null}

                  {mode === "existing" && selectedExisting ? (
                    <div className="flex-1 space-y-4">
                      <AssetSpecSection title="Asset">
                        <AssetSpecRow label="Asset name" value={selectedExisting.name} />
                        <AssetSpecRow label="Asset ID" value={selectedExisting.assetCode} />
                        <AssetSpecRow label="Category" value={selectedExisting.categoryName} />
                        <AssetSpecRow label="Brand" value={selectedExisting.brand} />
                        <AssetSpecRow label="Model" value={selectedExisting.model} />
                        <AssetSpecRow label="Serial number" value={selectedExisting.serialNumber} />
                      </AssetSpecSection>
                      <AssetSpecGrid specs={existingSpecs} />
                      {existingRemarks ? (
                        <AssetSpecSection title="Notes">
                          <div className="px-3 py-2.5 text-sm">{existingRemarks}</div>
                        </AssetSpecSection>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <AssetDeviceEmptyPreview />
                </div>
              )}
            </div>

            <div className="shrink-0 rounded-xl border bg-gradient-to-br from-emerald-500/5 to-card p-4">
              <PanelHeading
                icon={ClipboardCheck}
                title="Assignment"
                description="Record warranty and condition at handover."
                iconWrapClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {showWarrantyField ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Warranty expiry</Label>
                    <Input
                      type="date"
                      className={FIELD_CLASS}
                      value={warrantyExpiry}
                      onChange={(e) => setWarrantyExpiry(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Condition</Label>
                  <LabeledSelect
                    items={conditionItems}
                    value={conditionBefore}
                    onValueChange={(v) => setConditionBefore(v as AssetCondition)}
                    triggerClassName={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border bg-gradient-to-br from-sky-500/5 via-card to-muted/10 p-4">
            <PanelHeading
              icon={SlidersHorizontal}
              title="Configuration"
              description="Add brand, model, serial number, and device-specific specs."
              iconWrapClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
            />
            <div className="flex flex-1 flex-col">
              <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Brand</Label>
                <Input
                  className={FIELD_CLASS}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Input
                  className={FIELD_CLASS}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Serial number</Label>
                <Input
                  className={FIELD_CLASS}
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
            </div>
            {hasAssetSelection ? (
              <div className="mt-3 border-t pt-3">
                <AssetDeviceSpecFormFields
                  deviceType={configDeviceType}
                  values={{
                    chip: specChip,
                    memory: specMemory,
                    storage: specStorage,
                    operatingSystem: specOs,
                    accessories: specAccessories,
                    connectionType: specConnectionType,
                  }}
                  onChange={(field, value) => {
                    if (field === "chip") setSpecChip(value);
                    if (field === "memory") setSpecMemory(value);
                    if (field === "storage") setSpecStorage(value);
                    if (field === "operatingSystem") setSpecOs(value);
                    if (field === "accessories") setSpecAccessories(value);
                    if (field === "connectionType") setSpecConnectionType(value);
                  }}
                  fieldClass={FIELD_CLASS}
                />
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      {canCreate ? (
        <AssetFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          lookups={lookups}
          initialMode="create"
        />
      ) : null}
    </section>
  );
}
