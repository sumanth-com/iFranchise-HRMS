"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { cn } from "@/lib/utils";

export type SectionHelpPoint = {
  label: string;
  detail: string;
};

type SectionHelpButtonProps = {
  title: string;
  points: SectionHelpPoint[];
  description?: string;
  ariaLabel?: string;
  className?: string;
  headingClassName?: string;
  children: ReactNode;
};

export function SectionHelpButton({
  title,
  points,
  description = "Quick reference for HR using this section.",
  ariaLabel,
  className,
  headingClassName,
  children,
}: SectionHelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <div className={cn("min-w-0", headingClassName)}>{children}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel ?? `About ${title}`}
          onClick={() => setOpen(true)}
        >
          <CircleHelp className="size-4" />
        </Button>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        contentClassName="sm:max-w-lg"
        showCancel={false}
        footer={
          <Button type="button" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-4">
          {points.map((point) => (
            <div key={point.label} className="space-y-1">
              <p className="text-sm font-medium">{point.label}</p>
              <p className="text-sm text-muted-foreground">{point.detail}</p>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
