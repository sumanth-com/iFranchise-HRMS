import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { LEAVE_BALANCE_CARD_TONES } from "@/lib/leave/constants";
import { formatLeaveBalanceUsedTotal } from "@/lib/leave/leave-balance-display";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";
import type { LeavePolicyContact, LeavePolicySection } from "@/types/leave-policy";

export function LeavePolicyYearUsage({
  year,
  balances,
}: {
  year: number;
  balances: LeaveEmployeeBalanceSnapshot[];
}) {
  if (balances.length === 0) return null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-medium text-foreground/90">{year} leave year</h2>
        <p className="text-xs text-foreground/55">Used this year / annual entitlement, with days still available.</p>
      </div>
      <div
        className={
          balances.length >= 4
            ? "grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            : "grid grid-cols-1 gap-3 sm:grid-cols-3"
        }
      >
        {balances.map((row) => {
          const tone = LEAVE_BALANCE_CARD_TONES[
            row.leaveTypeCode as keyof typeof LEAVE_BALANCE_CARD_TONES
          ] ?? LEAVE_BALANCE_CARD_TONES.CL;
          return (
            <EmployeeStatCard
              key={row.leaveTypeCode}
              label={row.leaveTypeName}
              value={formatLeaveBalanceUsedTotal(row)}
              hint={`${formatLeaveDayCount(row.balanceDays)} available`}
              accent={tone.accent}
              iconBg={tone.iconBg}
            />
          );
        })}
      </div>
    </section>
  );
}

const policyBodyClass = "text-sm font-normal leading-relaxed text-foreground/75";
const policyHeadingClass = "text-sm font-bold text-foreground";

export function LeavePolicyPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground/95">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground/60">
        {description}
      </p>
    </header>
  );
}

function PolicySectionContent({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={`space-y-3 ${policyBodyClass}`}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        if (lines.length === 0) return null;

        const isList = lines.every((line) => line.startsWith("- "));
        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1.5 pl-5 marker:text-foreground/40">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }

        if (lines.length === 1) {
          return <p key={blockIndex}>{lines[0]}</p>;
        }

        return (
          <div key={blockIndex} className="space-y-2">
            {lines.map((line, lineIndex) => {
              if (line.startsWith("- ")) {
                return (
                  <ul key={lineIndex} className="list-disc space-y-1.5 pl-5 marker:text-foreground/40">
                    <li>{line.slice(2)}</li>
                  </ul>
                );
              }

              return <p key={lineIndex}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function LeavePolicyContactBar({ contact }: { contact: LeavePolicyContact }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-3.5 text-center text-sm text-foreground/70">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <a
          href={`tel:${contact.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center transition-colors hover:text-foreground/90"
        >
          {contact.phone}
        </a>
        <span className="hidden text-foreground/30 sm:inline" aria-hidden>
          |
        </span>
        <a
          href={`mailto:${contact.email}`}
          className="inline-flex items-center transition-colors hover:text-foreground/90"
        >
          {contact.email}
        </a>
        <span className="hidden text-foreground/30 sm:inline" aria-hidden>
          |
        </span>
        <span>{contact.address}</span>
      </div>
    </div>
  );
}

/** Scroll area sized to show exactly 6 data rows; left table scrolls when longer. */
const HOLIDAY_TABLE_SCROLL_CLASS = "max-h-[18.25rem] overflow-y-auto";

export function LeavePolicyHolidayTable({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{ id: string; name: string; date: string; day: string }>;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <h2 className={`shrink-0 border-b px-4 py-3 ${policyHeadingClass}`}>{title}</h2>
      <div className={HOLIDAY_TABLE_SCROLL_CLASS}>
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
            <tr className="text-left text-xs">
              <th className="h-11 w-14 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Sl. No.</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Occasion / Festival</th>
              <th className="h-11 w-24 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Date</th>
              <th className="h-11 w-24 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Day</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-border/50 last:border-b-0">
                <td className="px-3 py-2 tabular-nums text-foreground/55">{index + 1}</td>
                <td className="px-3 py-2 text-foreground/80">{row.name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-foreground/70">{row.date}</td>
                <td className="px-3 py-2 whitespace-nowrap text-foreground/70">{row.day}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function LeavePolicyHolidayTables({
  mandatoryHolidays,
  optionalHolidays,
  holidayYear,
  showOptionalHolidays = true,
}: {
  mandatoryHolidays: ReadonlyArray<{ id: string; name: string; date: string; day: string }>;
  optionalHolidays: ReadonlyArray<{ id: string; name: string; date: string; day: string }>;
  holidayYear: number;
  showOptionalHolidays?: boolean;
}) {
  return (
    <div
      className={
        showOptionalHolidays
          ? "grid w-full grid-cols-1 gap-5 lg:grid-cols-2"
          : "grid w-full grid-cols-1 gap-5"
      }
    >
      <LeavePolicyHolidayTable title={`Holiday List ${holidayYear}`} rows={mandatoryHolidays} />
      {showOptionalHolidays ? (
        <LeavePolicyHolidayTable
          title={`Optional Holidays List ${holidayYear}`}
          rows={optionalHolidays}
        />
      ) : null}
    </div>
  );
}

export function LeavePolicySections({
  sections,
  intro,
  employeeName,
}: {
  sections: LeavePolicySection[];
  intro: string;
  employeeName: string;
}) {
  return (
    <article className="space-y-6 rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <header className="space-y-2 border-b border-border/60 pb-5">
        <p className={policyBodyClass}>
          Dear <span className="font-medium text-foreground/85">{employeeName}</span>,
        </p>
        <p className={policyBodyClass}>{intro}</p>
      </header>

      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h3 className={policyHeadingClass}>{section.title}</h3>
          <PolicySectionContent content={section.content} />
        </section>
      ))}
    </article>
  );
}
