"use client";

import { type ReactNode } from "react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  cancelLabel?: string;
  showCancel?: boolean;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  cancelLabel = "Cancel",
  showCancel = true,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {footer ?? (
          <DialogFooter>
            {showCancel ? (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
