"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function AssetRecordDeleteDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  isPending = false,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      contentClassName="sm:max-w-md"
      showCancel={false}
      footer={
        <>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? "Deleting..." : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-sm text-muted-foreground">
          This removes the record from your view. It will not create duplicate rows if you submit
          again later.
        </p>
      </div>
    </Modal>
  );
}
