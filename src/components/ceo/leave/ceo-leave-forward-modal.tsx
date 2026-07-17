"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { Label } from "@/components/ui/label";
import { forwardCeoLeaveAction } from "@/lib/ceo/actions/ceo-leave-actions";
import type { CeoForwardTarget } from "@/types/ceo-leave";

type CeoLeaveForwardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveRequestId: string | null;
  employeeName?: string;
  targets: CeoForwardTarget[];
  onForwarded: () => void;
};

export function CeoLeaveForwardModal({
  open,
  onOpenChange,
  leaveRequestId,
  employeeName,
  targets,
  onForwarded,
}: CeoLeaveForwardModalProps) {
  const [targetId, setTargetId] = useState<string>("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setTargetId("");
      setNote("");
    }
  }, [open]);

  const handleForward = () => {
    if (!leaveRequestId) return;
    if (!targetId) {
      toast.error("Select an approver to forward to");
      return;
    }
    startTransition(async () => {
      const result = await forwardCeoLeaveAction({
        leaveRequestId,
        targetEmployeeId: targetId,
        note: note.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Leave request forwarded");
      onOpenChange(false);
      onForwarded();
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Forward for approval"
      description={
        employeeName
          ? `Forward ${employeeName}'s leave request to a manager or HR.`
          : "Forward this leave request to a manager or HR."
      }
      footer={
        <Button disabled={isPending || !targetId} onClick={handleForward}>
          Forward
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forwardTarget">Forward to</Label>
          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No managers or HR approvers are available to forward to.
            </p>
          ) : (
            <Select value={targetId || null} onValueChange={(value) => setTargetId(value ?? "")}>
              <SelectTrigger id="forwardTarget" className="w-full">
                <SelectValue placeholder="Select an approver" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.label} · {target.roleLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="forwardNote">Note (optional)</Label>
          <textarea
            id="forwardNote"
            rows={3}
            value={note}
            disabled={isPending}
            placeholder="Add context for the approver…"
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setNote(event.currentTarget.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          The selected approver will receive a secure email and will see the request in
          their portal approval queue.
        </p>
      </div>
    </Modal>
  );
}
