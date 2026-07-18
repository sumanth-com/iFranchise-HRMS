"use client";

import { Loader2, Wrench } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { employeeReportAssetIssueAction } from "@/lib/employee/actions/employee-asset-actions";
import type { EmployeeAsset } from "@/types/employee-assets";

const ISSUE_TYPES = [
  { value: "Hardware", label: "Hardware fault" },
  { value: "Software", label: "Software issue" },
  { value: "Physical Damage", label: "Physical damage" },
  { value: "Performance", label: "Performance / slowness" },
  { value: "Lost", label: "Lost / stolen" },
  { value: "Other", label: "Other" },
];

const SEVERITIES = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
];

type Props = {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeAssetIssueDialog({ asset, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [issueType, setIssueType] = useState("Hardware");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setIssueType("Hardware");
    setSeverity("Medium");
    setDescription("");
  }, [open]);

  function onSubmit() {
    if (!asset) return;
    if (description.trim().length < 5) {
      toast.error("Please describe the issue (at least 5 characters)");
      return;
    }
    startTransition(async () => {
      const result = await employeeReportAssetIssueAction({
        assignmentId: asset.assignmentId,
        issueType,
        severity,
        description: description.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Issue reported — HR/IT has been notified");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Report an Issue"
      description={asset ? `${asset.name} · ${asset.assetCode}` : undefined}
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 size-4" />
          )}
          Submit Report
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Issue Type</Label>
            <LabeledSelect items={ISSUE_TYPES} value={issueType} onValueChange={setIssueType} />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <LabeledSelect items={SEVERITIES} value={severity} onValueChange={setSeverity} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issue-description">Description</Label>
          <textarea
            id="issue-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="Describe what's wrong, when it started, and any error messages…"
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            This creates a tracked service request that HR/IT can action from the maintenance
            queue.
          </p>
        </div>
      </div>
    </Modal>
  );
}
