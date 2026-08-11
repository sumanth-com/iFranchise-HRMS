import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { AssetSpecFields } from "@/lib/assets/asset-spec-utils";
import {
  getDeviceSpecFields,
  getSpecFieldLabel,
  type AssetDeviceSpecField,
} from "@/lib/assets/asset-device-spec-fields";
import type { AssetDeviceCatalogKey } from "@/lib/assets/asset-device-images";

export function AssetSpecSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="divide-y rounded-lg border bg-muted/10">{children}</div>
    </section>
  );
}

export function AssetSpecRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,38%)_1fr] gap-3 px-3 py-2.5 text-sm first:rounded-t-lg last:rounded-b-lg",
        className,
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

const SPEC_FIELD_TO_KEY: Record<AssetDeviceSpecField, keyof AssetSpecFields> = {
  chip: "chip",
  memory: "memory",
  storage: "storage",
  operatingSystem: "operatingSystem",
  accessories: "accessories",
  connectionType: "connectionType",
};

export function AssetSpecGrid({
  specs,
  className,
  title = "Configuration",
  deviceType,
}: {
  specs: AssetSpecFields;
  className?: string;
  title?: string;
  deviceType?: AssetDeviceCatalogKey | null;
}) {
  const allowedFields = deviceType ? getDeviceSpecFields(deviceType) : null;

  const rows = (allowedFields
    ? allowedFields.map((field) => ({
        label: getSpecFieldLabel(field),
        value: specs[SPEC_FIELD_TO_KEY[field]],
      }))
    : [
        { label: "Chip", value: specs.chip },
        { label: "Memory", value: specs.memory },
        { label: "Storage", value: specs.storage },
        { label: "Operating System", value: specs.operatingSystem },
        { label: "Connection type", value: specs.connectionType },
        { label: "Additional details", value: specs.accessories },
      ]).filter((row) => row.value?.trim());

  if (rows.length === 0) return null;

  return (
    <AssetSpecSection title={title} className={className}>
      {rows.map((row) => (
        <AssetSpecRow key={row.label} label={row.label} value={row.value} />
      ))}
    </AssetSpecSection>
  );
}
