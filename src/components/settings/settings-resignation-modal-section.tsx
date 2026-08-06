"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SettingsResignationModalContent } from "@/components/settings/settings-resignation-modal-content";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  title: string;
  description: string;
  canApply: boolean;
  employeeId: string;
  defaultNoticePeriodDays: number;
  activeResignation: ExitResignationItem | null;
};

export function SettingsResignationModalSection({
  title,
  description,
  canApply,
  employeeId,
  defaultNoticePeriodDays,
  activeResignation,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
              <LogOut className="size-4 text-muted-foreground" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
            Open {title}
            <ChevronRight className="size-4" />
          </Button>
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
