"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SettingsResignationModalContent } from "@/components/settings/settings-resignation-modal-content";
import { cn } from "@/lib/utils";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  title: string;
  description: string;
  canApply: boolean;
  employeeId: string;
  defaultNoticePeriodDays: number;
  activeResignation: ExitResignationItem | null;
  className?: string;
};

export function SettingsResignationModalSection({
  title,
  description,
  canApply,
  employeeId,
  defaultNoticePeriodDays,
  activeResignation,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        className={cn(
          "flex h-full flex-col justify-center rounded-xl border bg-card p-4 shadow-sm md:p-5",
          className,
        )}
      >
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5">
          <span className="col-start-1 row-span-2 flex size-9 items-center justify-center self-center rounded-md border bg-muted/40">
            <LogOut className="size-4 text-muted-foreground" />
          </span>
          <h2 className="col-start-2 self-center text-sm font-semibold tracking-tight">
            {title}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="col-start-3 row-start-1 shrink-0 self-center"
            onClick={() => setOpen(true)}
          >
            Open {title}
            <ChevronRight className="size-4" />
          </Button>
          <p className="col-span-2 col-start-2 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </section>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description="Submit or track your resignation request."
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <SettingsResignationModalContent
          canApply={canApply}
          employeeId={employeeId}
          defaultNoticePeriodDays={defaultNoticePeriodDays}
          activeResignation={activeResignation}
          onSubmitted={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
