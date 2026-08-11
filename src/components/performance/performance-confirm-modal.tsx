"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
};

export function PerformanceConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  isPending = false,
  onConfirm,
  children,
}: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      contentClassName="sm:max-w-md"
      footer={
        <Button disabled={isPending} onClick={onConfirm}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      }
    >
      {children ? <div className="space-y-3 text-sm text-muted-foreground">{children}</div> : null}
    </Modal>
  );
}
