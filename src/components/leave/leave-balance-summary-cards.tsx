"use client";

import { CalendarDays } from "lucide-react";

import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import {
  LEAVE_BALANCE_CARD_TONES,
  LEAVE_BALANCE_DISPLAY_CODES,
  LEAVE_BALANCE_DISPLAY_LABELS,
} from "@/lib/leave/constants";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";

type Props = {
  balances: LeaveEmployeeBalanceSnapshot[];
  caption?: string;
  className?: string;
};

/** Shared CL / SL / EL / Menstruation leave balance cards (used / annual entitlement). */
export function LeaveBalanceSummaryCards({
  balances,
  caption = "Used this month / annual entitlement",
  className,
}: Props) {
  const byCode = new Map(balances.map((row) => [row.leaveTypeCode, row] as const));

  const cards = LEAVE_BALANCE_DISPLAY_CODES.map((code) => {
    const row = byCode.get(code);
    const used = row?.monthUsedDays ?? 0;
    const total = row?.monthTotalDays ?? row?.allocatedDays ?? 0;
    return {
      key: code,
      label: row?.leaveTypeName || LEAVE_BALANCE_DISPLAY_LABELS[code],
      value: `${formatLeaveDayCount(used)} / ${formatLeaveDayCount(total)}`,
      tone: LEAVE_BALANCE_CARD_TONES[code],
    };
  });

  return (
    <div className={className}>
      {caption ? (
        <p className="mb-2 text-xs text-muted-foreground">{caption}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <EmployeeStatCard
            key={card.key}
            label={card.label}
            value={card.value}
            icon={CalendarDays}
            accent={card.tone.accent}
            iconBg={card.tone.iconBg}
          />
        ))}
      </div>
    </div>
  );
}
