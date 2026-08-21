"use client";

import { Loader2, Undo2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { employeeRequestAssetReturnAction } from "@/lib/employee/actions/employee-asset-actions";
import type { EmployeeAsset } from "@/types/employee-assets";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  asset: EmployeeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeAssetReturnDialog({ asset, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [returnDate, setReturnDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setReturnDate(todayIso());
    setNotes("");
  }, [open]);

  function onSubmit() {
    if (!asset) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      toast.error("Please select a return date");
      return;
    }
    startTransition(async () => {
      const result = await employeeRequestAssetReturnAction({
        assignmentId: asset.assignmentId,
        returnDate,
        notes: notes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Return request sent — HR can review it under Return filter");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Return asset"
      description={asset ? `${asset.name} · ${asset.assetCode}` : undefined}
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Undo2 className="mr-2 size-4" />
          )}
          Send return request
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="asset-return-date">Return date</Label>
          <Input
            id="asset-return-date"
            type="date"
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Choose the date you plan to hand the asset back. HR will confirm and complete the return.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset-return-notes">Notes (optional)</Label>
          <textarea
            id="asset-return-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
            rows={3}
            placeholder="Pickup location, condition notes, or anything HR should know…"
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
          />
        </div>
      </div>
    </Modal>
  );
}
