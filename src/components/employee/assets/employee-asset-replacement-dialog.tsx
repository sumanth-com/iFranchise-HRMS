"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { employeeRequestAssetReplacementAction } from "@/lib/employee/actions/employee-asset-actions";
import type { EmployeeAsset } from "@/types/employee-assets";

const REQUEST_TYPES = [
  { value: "Replacement", label: "Replacement" },
  { value: "Upgrade", label: "Upgrade" },
  { value: "Repair", label: "Repair" },
  { value: "Temporary Device", label: "Temporary device" },
];

type Props = {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeAssetReplacementDialog({ asset, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestType, setRequestType] = useState("Replacement");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setRequestType("Replacement");
    setReason("");
  }, [open]);

  function onSubmit() {
    if (!asset) return;
    if (reason.trim().length < 5) {
      toast.error("Please add a reason (at least 5 characters)");
      return;
    }
    startTransition(async () => {
      const result = await employeeRequestAssetReplacementAction({
        assignmentId: asset.assignmentId,
        requestType,
        reason: reason.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Request submitted for approval");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Request Replacement"
      description={asset ? `${asset.name} · ${asset.assetCode}` : undefined}
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Submit Request
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Request Type</Label>
          <LabeledSelect items={REQUEST_TYPES} value={requestType} onValueChange={setRequestType} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="replacement-reason">Reason</Label>
          <textarea
            id="replacement-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="Tell us why you need this — e.g. device is slow, screen cracked, spec upgrade for new project…"
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            Requests are reviewed by your Manager, HR and IT before approval.
          </p>
        </div>
      </div>
    </Modal>
  );
}
