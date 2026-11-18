"use client";

import { CalendarDays } from "lucide-react";

import {
  LEAVE_BALANCE_CARD_CODES,
  LEAVE_BALANCE_CARD_TONES,
  LEAVE_BALANCE_DISPLAY_LABELS,
} from "@/lib/leave/constants";
import {
  formatLeaveBalanceAvailable,
  formatLeaveBalanceCardCaption,
  getLeaveBalanceAvailableDays,
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
  nonInteractiveCodes?: string[];
  compact?: boolean;
  layout?: "grid" | "sidebar";
};

/** Casual + Earned leave balance cards showing currently available days (monthly accrual). */
export function LeaveBalanceSummaryCards({
  balances: balancesProp,
  month: _month,
  year: _year,
  className,
  selectedCode = null,
  onSelectCode,
  nonInteractiveCodes = ["CL", "EL"],
  compact = false,
  layout = "grid",
}: Props) {
  const isSidebar = layout === "sidebar";
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
      caption: row ? formatLeaveBalanceCardCaption(row) : "Available balance",
      tone: LEAVE_BALANCE_CARD_TONES[code as keyof typeof LEAVE_BALANCE_CARD_TONES],
    };
  });

  return (
    <div className={cn(isSidebar ? "contents" : "w-full", className)}>
      <div
        className={cn(
          "grid w-full items-stretch gap-4",
          cards.length >= 3
            ? "grid-cols-1 sm:grid-cols-3"
            : cards.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1",
          isSidebar && "contents",
        )}
      >
        {cards.map((card) => {
          const cardSelectable = selectable && !nonInteractiveCodes.includes(card.key);
          const isActive = cardSelectable && selectedCode?.toUpperCase() === card.key;
          const cardClassName = cn(
            "relative z-10 flex h-full min-h-[8.25rem] w-full min-w-0 max-w-none flex-col justify-between gap-3 overflow-hidden rounded-2xl border bg-card px-5 py-5 text-left shadow-sm outline-none pointer-events-auto",
            "border-border/70",
            compact && "min-h-[6.5rem] gap-2 px-4 py-4",
            isSidebar && "min-h-0 items-center justify-center gap-1 rounded-xl px-4 py-3 text-center",
            cardSelectable &&
              "cursor-pointer transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-violet-300/70 hover:bg-muted/40 hover:shadow-sm focus-visible:border-violet-400/60 focus-visible:ring-2 focus-visible:ring-violet-400/20 focus-visible:ring-offset-0 dark:hover:border-violet-400/40 dark:hover:bg-muted/30",
            isActive &&
              "border-violet-400/70 bg-violet-500/[0.06] shadow-sm dark:border-violet-400/50 dark:bg-violet-500/10",
          );

          const content = (
            <>
              {isSidebar ? <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <p className={cn("text-2xl font-semibold leading-tight tracking-tight tabular-nums", card.tone.accent)}>{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.caption}</p>
              </> : <>
              <div className="flex items-start justify-between gap-2">
                <p className="truncate whitespace-nowrap text-[11px] font-medium leading-none text-muted-foreground">
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
                <p className="mt-1.5 truncate text-[11px] leading-4 text-muted-foreground">
                  {card.caption}
                  {cardSelectable && card.key !== "OH"
                    ? isActive
                      ? " · showing this month's history"
                      : " · click for this month's history"
                    : cardSelectable && card.key === "OH"
                      ? " · click to view dates"
                      : null}
                </p>
              </div>
              </>}
            </>
          );

          if (!cardSelectable) {
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
