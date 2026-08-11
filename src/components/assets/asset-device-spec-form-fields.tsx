"use client";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  CONNECTION_TYPE_OPTIONS,
  getDeviceSpecFields,
  getSpecFieldLabel,
  isConnectionTypeField,
  type AssetDeviceSpecField,
  type AssetDeviceSpecValues,
} from "@/lib/assets/asset-device-spec-fields";
import type { AssetDeviceCatalogKey } from "@/lib/assets/asset-device-images";
import { cn } from "@/lib/utils";

type Props = {
  deviceType: AssetDeviceCatalogKey | null | undefined;
  values: AssetDeviceSpecValues;
  onChange: (field: AssetDeviceSpecField, value: string) => void;
  disabled?: boolean;
  fieldClass?: string;
  className?: string;
  excludeFields?: AssetDeviceSpecField[];
};

export function AssetDeviceSpecFormFields({
  deviceType,
  values,
  onChange,
  disabled = false,
  fieldClass = "h-9",
  className,
  excludeFields = [],
}: Props) {
  const fields = getDeviceSpecFields(deviceType).filter((f) => !excludeFields.includes(f));

  if (!deviceType || fields.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Select a device type or category to see configuration fields.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {fields.map((field) => {
        const wide = field === "accessories";
        return (
          <div key={field} className={cn("space-y-1.5", wide && "sm:col-span-2")}>
            <Label className="text-xs text-muted-foreground">{getSpecFieldLabel(field)}</Label>
            {isConnectionTypeField(field) ? (
              <LabeledSelect
                items={CONNECTION_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                value={values.connectionType}
                onValueChange={(v) => onChange(field, v)}
                placeholder="Select connection…"
                disabled={disabled}
                triggerClassName={fieldClass}
              />
            ) : (
              <Input
                className={fieldClass}
                value={values[field]}
                onChange={(e) => onChange(field, e.target.value)}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
