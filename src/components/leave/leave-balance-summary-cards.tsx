"use client";

import { CalendarDays } from "lucide-react";

import {
  LEAVE_BALANCE_CARD_CODES,
  LEAVE_BALANCE_CARD_TONES,
  LEAVE_BALANCE_DISPLAY_LABELS,
} from "@/lib/leave/constants";
import {
  formatLeaveBalanceAvailable,
  getLeaveBalanceAvailableDays,
  LEAVE_BALANCE_AVAILABLE_CAPTION,
} from "@/lib/leave/leave-balance-display";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
import { cn } from "@/lib/utils";
import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";

type Props = {
  balances: LeaveEmployeeBalanceSnapshot[];
  month: number;
  year: number;
  className?: string;
  selectedCode?: string | null;
  onSelectCode?: (code: string) => void;
};

/** Casual + Earned leave balance cards showing currently available days (monthly accrual). */
export function LeaveBalanceSummaryCards({
  balances: balancesProp,
  month: _month,
  year: _year,
  className,
  selectedCode = null,
  onSelectCode,
}: Props) {
  const balances = balancesProp ?? [];
  const byCode = new Map(
    balances.map((row) => [row.leaveTypeCode.toUpperCase(), row] as const),
  );
  const selectable = typeof onSelectCode === "function";

  const cards = LEAVE_BALANCE_CARD_CODES.map((code) => {
    const row = byCode.get(code);
    const available = row ? Math.max(0, getLeaveBalanceAvailableDays(row)) : 0;
    return {
      key: code,
      label:
        row?.leaveTypeName ||
        LEAVE_BALANCE_DISPLAY_LABELS[code as keyof typeof LEAVE_BALANCE_DISPLAY_LABELS] ||
        code,
      value: row ? formatLeaveBalanceAvailable(row) : formatLeaveDayCount(available),
      tone: LEAVE_BALANCE_CARD_TONES[code as keyof typeof LEAVE_BALANCE_CARD_TONES],
    };
  });

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const isActive = selectedCode?.toUpperCase() === card.key;
          const cardClassName = cn(
            "relative z-10 flex h-full min-h-[6.75rem] w-full min-w-0 flex-col rounded-xl border bg-card p-3.5 text-left shadow-sm pointer-events-auto",
            selectable &&
              "cursor-pointer transition-[border-color,box-shadow,background-color] duration-150 hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:border-indigo-300/50 dark:hover:bg-white/5",
            isActive &&
              "border-primary/60 bg-accent/30 ring-2 ring-primary/35 dark:border-indigo-300/55 dark:bg-indigo-500/10",
          );

          const content = (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="truncate whitespace-nowrap text-[11px] font-medium leading-none text-foreground/90 dark:text-white">
                  {card.label}
                </p>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    card.tone.iconBg,
                  )}
                >
                  <CalendarDays className={cn("size-4", card.tone.accent)} />
                </span>
              </div>
              <div className="mt-3 min-h-0">
                <p
                  className={cn(
                    "truncate text-xl font-semibold leading-7 tracking-tight tabular-nums",
                    card.tone.accent,
                  )}
                >
                  {card.value}
                </p>
                <p className="mt-1 truncate text-[11px] leading-4 text-foreground/80 dark:text-white/90">
                  {LEAVE_BALANCE_AVAILABLE_CAPTION}
                  {selectable
                    ? isActive
                      ? " · showing this month's history"
                      : " · click for this month's history"
                    : null}
                </p>
              </div>
            </>
          );

          if (!selectable) {
            return (
              <div key={card.key} className={cardClassName}>
                {content}
              </div>
            );
          }

          return (
            <button
              key={card.key}
              type="button"
              className={cardClassName}
              aria-pressed={isActive}
              onClick={() => onSelectCode(card.key)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
