"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";

type NoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
};

/** Centered, readable notice — used instead of corner toasts for form guidance. */
export function NoticeDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Got it",
}: NoticeDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      showCancel={false}
      contentClassName="sm:max-w-md"
      footer={
        <Button type="button" onClick={() => onOpenChange(false)}>
          {confirmLabel}
        </Button>
      }
    >
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Info className="size-4" aria-hidden="true" />
        </div>
        <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </Modal>
  );
}
