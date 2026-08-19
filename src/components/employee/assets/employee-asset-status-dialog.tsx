"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import {
  CONDITION_LABELS,
  EMPLOYEE_ASSET_STATUS_OPTIONS,
} from "@/lib/assets/constants";
import { employeeUpdateAssetStatusAction } from "@/lib/employee/actions/employee-asset-actions";
import type { AssetCondition } from "@/types/assets";
import type { EmployeeAsset } from "@/types/employee-assets";

const CONDITION_ITEMS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function defaultStatus(asset: EmployeeAsset | null): "assigned" | "maintenance" | "lost" {
  if (asset?.assetStatus === "maintenance" || asset?.assetStatus === "lost") {
    return asset.assetStatus;
  }
  return "assigned";
}

function defaultCondition(asset: EmployeeAsset | null): AssetCondition {
  return asset?.conditionAfter ?? asset?.conditionBefore ?? "good";
}

type Props = {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeAssetStatusDialog({ asset, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assetStatus, setAssetStatus] = useState<"assigned" | "maintenance" | "lost">("assigned");
  const [condition, setCondition] = useState<AssetCondition>("good");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAssetStatus(defaultStatus(asset));
    setCondition(defaultCondition(asset));
    setNotes("");
  }, [open, asset]);

  function onSubmit() {
    if (!asset) return;
    startTransition(async () => {
      const result = await employeeUpdateAssetStatusAction({
        assignmentId: asset.assignmentId,
        assetStatus,
        condition,
        notes: notes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Status sent — HR can see the update");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Send status"
      description={asset ? `${asset.name} · ${asset.assetCode}` : undefined}
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          Send status
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <LabeledSelect
              items={[...EMPLOYEE_ASSET_STATUS_OPTIONS]}
              value={assetStatus}
              onValueChange={(value) =>
                setAssetStatus(value as "assigned" | "maintenance" | "lost")
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <LabeledSelect
              items={CONDITION_ITEMS}
              value={condition}
              onValueChange={(value) => setCondition(value as AssetCondition)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset-status-notes">Notes (optional)</Label>
          <textarea
            id="asset-status-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
            rows={3}
            placeholder="Add anything HR should know — damage, location, or why the status changed…"
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            You can send an update whenever you want. HR sees the new status on Company Assets.
          </p>
        </div>
      </div>
    </Modal>
  );
}
