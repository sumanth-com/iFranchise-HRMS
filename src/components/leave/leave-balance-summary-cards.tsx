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

  const cards = LEAVE_BALANCE_CARD_CODES.filter((code) => byCode.has(code)).map((code) => {
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
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "grid w-full items-stretch gap-4",
          cards.length >= 3
            ? "grid-cols-3"
            : cards.length === 2
              ? "grid-cols-2"
              : "grid-cols-1",
        )}
      >
        {cards.map((card) => {
          const isActive = selectedCode?.toUpperCase() === card.key;
          const cardClassName = cn(
            "relative z-10 flex h-full min-h-[8.25rem] w-full min-w-0 max-w-none flex-col justify-between gap-3 overflow-hidden rounded-2xl border bg-white px-5 py-5 text-left shadow-sm outline-none pointer-events-auto",
            "border-border/70",
            selectable &&
              "cursor-pointer transition-[border-color,box-shadow] duration-200 ease-out hover:border-violet-300/70 hover:shadow-sm focus-visible:border-violet-400/60 focus-visible:ring-2 focus-visible:ring-violet-400/20 focus-visible:ring-offset-0",
            isActive && "border-violet-400/70 shadow-sm",
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
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-xl font-semibold leading-7 tracking-tight tabular-nums",
                    card.tone.accent,
                  )}
                >
                  {card.value}
                </p>
                <p className="mt-1.5 truncate text-[11px] leading-4 text-foreground/80 dark:text-white/90">
                  {card.key === "OH"
                    ? "Available this year"
                    : LEAVE_BALANCE_AVAILABLE_CAPTION}
                  {selectable && card.key !== "OH"
                    ? isActive
                      ? " · showing this month's history"
                      : " · click for this month's history"
                    : selectable && card.key === "OH"
                      ? " · click to view dates"
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
