"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/common/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { LookupOption } from "@/types/employee";

export type LeaveAdvancedFilterValues = {
  departmentId?: string;
  branchId?: string;
  reportingManagerId?: string;
  approverId?: string;
};

type LeaveAdvancedFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: LeaveAdvancedFilterValues;
  departments: LookupOption[];
  branches: LookupOption[];
  managers: LookupOption[];
  approvers: LookupOption[];
  onApply: (values: LeaveAdvancedFilterValues) => void;
  onClear: () => void;
};

const FILTER_FIELD_CLASS = "space-y-2";
const FILTER_CONTROL_CLASS = "h-9 w-full";

function toSelectItems(items: LookupOption[], allLabel: string) {
  return [
    { value: "", label: allLabel },
    ...items.map((item) => ({ value: item.id, label: item.label })),
  ];
}

export function LeaveAdvancedFiltersSheet({
  open,
  onOpenChange,
  values,
  departments,
  branches,
  managers,
  approvers,
  onApply,
  onClear,
}: LeaveAdvancedFiltersSheetProps) {
  const [draft, setDraft] = React.useState(values);

  React.useEffect(() => {
    if (open) {
      setDraft(values);
    }
  }, [open, values]);

  const updateDraft = (patch: Partial<LeaveAdvancedFilterValues>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Advanced filters
          </SheetTitle>
          <SheetDescription>
            Narrow by department, branch, manager, or approver.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className={FILTER_FIELD_CLASS}>
            <Label>Department</Label>
            <Select
              items={toSelectItems(departments, "All departments")}
              value={draft.departmentId ?? ""}
              onValueChange={(value) =>
                updateDraft({ departmentId: value || undefined })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                {toSelectItems(departments, "All departments").map((item) => (
                  <SelectItem key={item.value || "all-departments"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={FILTER_FIELD_CLASS}>
            <Label>Branch</Label>
            <Select
              items={toSelectItems(branches, "All branches")}
              value={draft.branchId ?? ""}
              onValueChange={(value) =>
                updateDraft({ branchId: value || undefined })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                {toSelectItems(branches, "All branches").map((item) => (
                  <SelectItem key={item.value || "all-branches"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={FILTER_FIELD_CLASS}>
            <Label>Reporting manager</Label>
            <Select
              items={toSelectItems(managers, "All managers")}
              value={draft.reportingManagerId ?? ""}
              onValueChange={(value) =>
                updateDraft({ reportingManagerId: value || undefined })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="All managers" />
              </SelectTrigger>
              <SelectContent>
                {toSelectItems(managers, "All managers").map((item) => (
                  <SelectItem key={item.value || "all-managers"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={FILTER_FIELD_CLASS}>
            <Label>Approved by</Label>
            <Select
              items={toSelectItems(approvers, "All approvers")}
              value={draft.approverId ?? ""}
              onValueChange={(value) =>
                updateDraft({ approverId: value || undefined })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="All approvers" />
              </SelectTrigger>
              <SelectContent>
                {toSelectItems(approvers, "All approvers").map((item) => (
                  <SelectItem key={item.value || "all-approvers"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="border-t p-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={onClear}>
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
