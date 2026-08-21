"use client";

import { Loader2, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { parseEmployeeRequestDetails } from "@/lib/assets/activity-utils";
import { CONDITION_LABELS, EMPLOYEE_ASSET_STATUS_OPTIONS } from "@/lib/assets/constants";
import { employeeUpdateAssetRequestAction } from "@/lib/employee/actions/employee-asset-actions";
import type { AssetCondition } from "@/types/assets";
import type { EmployeeAssetRequest } from "@/types/employee-assets";

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

const REQUEST_TYPES = [
  { value: "Replacement", label: "Replacement" },
  { value: "Upgrade", label: "Upgrade" },
  { value: "Repair", label: "Repair" },
  { value: "Temporary Device", label: "Temporary device" },
];

const CONDITION_ITEMS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

type Props = {
  request: EmployeeAssetRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeAssetRequestEditDialog({ request, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [issueType, setIssueType] = useState("Hardware");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("Replacement");
  const [reason, setReason] = useState("");
  const [assetStatus, setAssetStatus] = useState<"assigned" | "maintenance" | "lost">("assigned");
  const [condition, setCondition] = useState<AssetCondition>("good");
  const [notes, setNotes] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!open || !request) return;
    const parsed = parseEmployeeRequestDetails(request.issue, request.notes);
    if (request.requestKind === "report") {
      setIssueType(ISSUE_TYPES.some((item) => item.value === parsed.typeLabel) ? parsed.typeLabel! : "Other");
      setSeverity(SEVERITIES.some((item) => item.value === parsed.severity) ? parsed.severity! : "Medium");
      setDescription(parsed.message);
    } else if (request.requestKind === "replace") {
      setRequestType(
        REQUEST_TYPES.some((item) => item.value === parsed.typeLabel) ? parsed.typeLabel! : "Replacement",
      );
      setReason(parsed.message);
    } else if (request.requestKind === "return") {
      setReturnDate(
        parsed.returnDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.returnDate)
          ? parsed.returnDate
          : new Date().toISOString().slice(0, 10),
      );
      setNotes(parsed.message);
    } else {
      const statusMatch = request.issue.match(/Status reported: (Assigned|Maintenance|Lost)/i);
      const conditionMatch = request.issue.match(/\((Excellent|Good|Fair|Poor|Damaged)\)/i);
      const statusValue = statusMatch?.[1]?.toLowerCase();
      const conditionValue = conditionMatch?.[1]?.toLowerCase();
      setAssetStatus(
        statusValue === "maintenance" || statusValue === "lost" ? statusValue : "assigned",
      );
      setCondition(
        conditionValue && conditionValue in CONDITION_LABELS
          ? (conditionValue as AssetCondition)
          : "good",
      );
      setNotes(parsed.message.includes(" — ") ? parsed.message.split(" — ").slice(1).join(" — ") : "");
    }
  }, [open, request]);

  function onSubmit() {
    if (!request) return;
    startTransition(async () => {
      let payload: unknown;
      if (request.requestKind === "report") {
        if (description.trim().length < 5) {
          toast.error("Please describe the issue (at least 5 characters)");
          return;
        }
        payload = {
          kind: "report",
          maintenanceId: request.id,
          issueType,
          severity,
          description: description.trim(),
        };
      } else if (request.requestKind === "replace") {
        if (reason.trim().length < 5) {
          toast.error("Please add a reason (at least 5 characters)");
          return;
        }
        payload = {
          kind: "replace",
          maintenanceId: request.id,
          requestType,
          reason: reason.trim(),
        };
      } else if (request.requestKind === "return") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
          toast.error("Please select a return date");
          return;
        }
        payload = {
          kind: "return",
          maintenanceId: request.id,
          returnDate,
          notes: notes.trim() || undefined,
        };
      } else {
        payload = {
          kind: "status",
          maintenanceId: request.id,
          assetStatus,
          condition,
          notes: notes.trim() || undefined,
        };
      }

      const result = await employeeUpdateAssetRequestAction(payload);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Request updated");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit request"
      description={request ? `${request.assetName} · ${request.assetCode}` : undefined}
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save changes
        </Button>
      }
    >
      {request?.requestKind === "report" ? (
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
            <Label htmlFor="edit-issue-description">What you wrote</Label>
            <textarea
              id="edit-issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>
        </div>
      ) : null}

      {request?.requestKind === "replace" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Request Type</Label>
            <LabeledSelect items={REQUEST_TYPES} value={requestType} onValueChange={setRequestType} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-replace-reason">What you wrote</Label>
            <textarea
              id="edit-replace-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isPending}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>
        </div>
      ) : null}

      {request?.requestKind === "status" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <LabeledSelect
                items={[...EMPLOYEE_ASSET_STATUS_OPTIONS]}
                value={assetStatus}
                onValueChange={(value) => setAssetStatus(value as "assigned" | "maintenance" | "lost")}
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
            <Label htmlFor="edit-status-notes">Notes</Label>
            <textarea
              id="edit-status-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>
        </div>
      ) : null}

      {request?.requestKind === "return" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-return-date">Return date</Label>
            <Input
              id="edit-return-date"
              type="date"
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-return-notes">Notes</Label>
            <textarea
              id="edit-return-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
