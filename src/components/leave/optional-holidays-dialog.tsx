"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { Modal } from "@/components/common/modal";
import { getEmployeeOptionalHolidayChoicesAction } from "@/lib/employee/actions/employee-leave-actions";
import {
  optionalHolidayDisplayDate,
  type OptionalHolidayListItem,
} from "@/lib/leave/optional-holiday";
import { cn } from "@/lib/utils";

export function OptionalHolidaysDialog({
  open,
  onOpenChange,
  year,
  remaining,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  remaining: number;
}) {
  const [items, setItems] = useState<OptionalHolidayListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void getEmployeeOptionalHolidayChoicesAction(year)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, year]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Optional Holidays — ${year}`}
      description={`${remaining} remaining this year from the company list.`}
      contentClassName="sm:max-w-lg"
      showCancel
      cancelLabel="Close"
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          There are no Optional Holidays listed for this year.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border bg-card px-3.5 py-3",
                item.status === "passed" && "opacity-70",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {optionalHolidayDisplayDate(item.date)} · {item.day}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  item.status === "approved"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : item.status === "pending"
                      ? "bg-amber-500/15 text-amber-800"
                      : item.status === "passed"
                        ? "bg-muted text-muted-foreground"
                        : remaining < 1
                          ? "bg-muted text-muted-foreground"
                          : "bg-violet-500/12 text-violet-700",
                )}
              >
                {item.status === "approved"
                  ? "Taken"
                  : item.status === "pending"
                    ? "Pending"
                    : item.status === "passed"
                      ? "Passed"
                      : remaining < 1
                        ? "Quota used"
                        : "Available"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function formatOptionalHolidayYearLabel(year: number) {
  return format(new Date(year, 0, 1), "yyyy");
}
