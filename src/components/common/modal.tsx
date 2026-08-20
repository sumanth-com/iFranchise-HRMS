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
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  cancelLabel?: string;
  showCancel?: boolean;
  /** Extra controls rendered in the header row (e.g. mode toggles). */
  headerAddon?: ReactNode;
  /** Extra classes for DialogContent (e.g. wider layouts). */
  contentClassName?: string;
  /** Extra classes for the scrollable body wrapper. */
  bodyClassName?: string;
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
  headerAddon,
  contentClassName,
  bodyClassName,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(94vh,880px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </div>
            {headerAddon ? <div className="shrink-0">{headerAddon}</div> : null}
          </div>
        </DialogHeader>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>

        {(footer || showCancel) && (
          <DialogFooter className="m-0 shrink-0 rounded-none border-t px-5 py-3 sm:justify-end">
            {showCancel ? (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
            ) : null}
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
