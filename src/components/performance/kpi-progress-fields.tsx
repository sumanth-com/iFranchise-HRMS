"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { Label } from "@/components/ui/label";
import { KPI_MEASUREMENT_LABELS } from "@/lib/performance/constants";
import {
  KPI_EVIDENCE_NOTE_OPTIONS,
  KPI_SELECT_NONE,
  KPI_STATUS_UPDATE_OPTIONS,
  kpiSelectToField,
  kpiSelectValue,
} from "@/lib/performance/kpi-update-options";
import type { kpiProgressSchema } from "@/lib/validations/performance";
import type { KpiMeasurementType } from "@/types/performance";

type KpiProgressFieldsProps = {
  form: UseFormReturn<z.input<typeof kpiProgressSchema>>;
  measurementType: KpiMeasurementType;
  disabled?: boolean;
  mode: "employee" | "hr";
};

export function KpiProgressFields({
  form,
  measurementType,
  disabled,
  mode,
}: KpiProgressFieldsProps) {
  const progressComments = form.watch("progressComments") ?? "";
  const evidenceNotes = form.watch("evidenceNotes") ?? "";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="currentValue">
          Current position ({KPI_MEASUREMENT_LABELS[measurementType]})
        </Label>
        <Input
          id="currentValue"
          type="number"
          min={0}
          step="0.01"
          disabled={disabled}
          {...form.register("currentValue")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="progressComments">Status update</Label>
        <Select
          value={kpiSelectValue(progressComments)}
          onValueChange={(value) =>
            form.setValue("progressComments", kpiSelectToField(value), {
              shouldDirty: true,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KPI_SELECT_NONE}>None</SelectItem>
            {KPI_STATUS_UPDATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidenceNotes">Additional notes (optional)</Label>
        <Select
          value={kpiSelectValue(evidenceNotes)}
          onValueChange={(value) =>
            form.setValue("evidenceNotes", kpiSelectToField(value), {
              shouldDirty: true,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KPI_SELECT_NONE}>None</SelectItem>
            {KPI_EVIDENCE_NOTE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
