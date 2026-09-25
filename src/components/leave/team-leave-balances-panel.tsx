"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Building2,
  Hash,
  Layers,
  Search,
  User,
} from "lucide-react";

import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { ErrorState } from "@/components/common/error-state";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_ROW_CLASS,
  TABLE_HEADER_STICKY_CLASS,
  payrollStickyEmployeeBodyClass,
  payrollStickyEmployeeHeaderClass,
} from "@/components/common/table-header-classes";
import { listTeamLeaveBalancesAction } from "@/lib/leave/actions";
import {
  LEAVE_BALANCES_CHANGED_EVENT,
  type LeaveBalancesChangedDetail,
} from "@/lib/leave/leave-balance-client-events";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  formatLeaveDate,
  formatLeaveMonthYear,
  getCurrentBalanceYear,
  LEAVE_MONTH_OPTIONS,
} from "@/lib/leave/services/leave-utils";
import {
  formatLeaveDayCount,
  formatLeaveDayUnit,
} from "@/lib/leave/services/leave-usage";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import {
  SECTION_LOAD_RETRY_LABEL,
} from "@/lib/errors/employee-facing";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";
import type {
  TeamLeaveBalanceResult,
  TeamLeaveBalanceRow,
  TeamLeaveUsageEntry,
} from "@/types/leave";

const STICKY_EMPLOYEE_WIDTH = "min-w-[12rem] w-[12rem]";

const FILTER_CONTROL_CLASS =
  "h-9 rounded-md border border-input bg-white text-sm shadow-xs dark:bg-input";

const DEPARTMENT_LABEL = "All Departments";
const EMPLOYMENT_TYPE_LABEL = "All Employment Types";

const USAGE_TOOLTIP_CLASS =
  "max-h-[min(20rem,55vh)] max-w-[18rem] flex-col items-stretch gap-0 overflow-y-auto whitespace-normal border border-border bg-white px-3 py-2.5 text-left text-xs text-foreground shadow-md";

const LEAVE_BALANCE_LOAD_TITLE = "We couldn't load leave balance data.";
const LEAVE_BALANCE_LOAD_DESCRIPTION = "Please try again.";

type Props = {
  className?: string;
  /** Server-prefetched grid — paints immediately without a client loading flash. */
  initialData?: TeamLeaveBalanceResult | null;
  initialDepartments?: LookupOption[];
  initialEmploymentTypes?: LookupOption[];
  initialYear?: number;
  initialMonth?: number;
};

function currentIstMonthYear(fallbackYear?: number) {
  const today = getTodayDateString();
  return {
    year: fallbackYear ?? Number.parseInt(today.slice(0, 4), 10) ?? getCurrentBalanceYear(),
    month: Number.parseInt(today.slice(5, 7), 10) || 1,
  };
}

function safeUsageList(value: TeamLeaveUsageEntry[] | null | undefined): TeamLeaveUsageEntry[] {
  return Array.isArray(value) ? value : [];
}

function normalizeTeamLeaveBalanceRow(row: TeamLeaveBalanceRow): TeamLeaveBalanceRow {
  return {
    ...row,
    employeeName: row.employeeName || "—",
    employeeCode: row.employeeCode ?? "",
    clAvailable: Number(row.clAvailable) || 0,
    clUsed: Number(row.clUsed) || 0,
    clYearUsed: Number(row.clYearUsed) || 0,
    elAvailable: Number(row.elAvailable) || 0,
    elUsed: Number(row.elUsed) || 0,
    elYearUsed: Number(row.elYearUsed) || 0,
    ohAvailable: Number(row.ohAvailable) || 0,
    ohUsed: Number(row.ohUsed) || 0,
    ohAllowed: Number(row.ohAllowed) || 0,
    lopDays: Number(row.lopDays) || 0,
    pendingDays: Number(row.pendingDays) || 0,
    clUsage: safeUsageList(row.clUsage),
    elUsage: safeUsageList(row.elUsage),
    ohUsage: safeUsageList(row.ohUsage),
    lopUsage: safeUsageList(row.lopUsage),
  };
}

function formatUsageDateRange(entry: TeamLeaveUsageEntry): string {
  const start = String(entry?.startDate ?? "").slice(0, 10);
  const end = String(entry?.endDate ?? "").slice(0, 10);
  if (!start) return "—";
  if (!end || start === end) return formatLeaveDate(start);
  return `${formatLeaveDate(start)} – ${formatLeaveDate(end)}`;
}

function UsageHoverCard({
  title,
  monthLabel,
  employeeName,
  used,
  remaining,
  usage,
  emptyLabel,
  children,
  ohSummary,
}: {
  title: string;
  monthLabel: string;
  employeeName: string;
  used: number;
  remaining?: number;
  usage: TeamLeaveUsageEntry[] | null | undefined;
  emptyLabel: string;
  children: ReactNode;
  ohSummary?: {
    allowed: number;
    used: number;
    remaining: number;
  };
}) {
  const safeUsage = safeUsageList(usage);
  const safeUsed = Number(used) || 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex min-w-[1.5rem] cursor-default items-center justify-center rounded px-1 tabular-nums text-muted-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-2 hover:text-foreground"
          >
            {children}
          </button>
        }
      />
      <TooltipContent side="top" align="center" className={USAGE_TOOLTIP_CLASS} hideArrow>
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-foreground">{employeeName || "—"}</p>
            <p className="text-muted-foreground">{monthLabel}</p>
          </div>

          <div>
            <p className="font-medium text-foreground">{title}</p>
            {safeUsage.length === 0 ? (
              <p className="mt-1 text-muted-foreground">{emptyLabel}</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {safeUsage.map((entry, index) => (
                  <li
                    key={`${entry.startDate}-${entry.endDate}-${entry.leaveTypeCode}-${entry.days}-${index}`}
                    className="text-muted-foreground"
                  >
                    <span className="text-foreground">
                      {formatUsageDateRange(entry)}
                    </span>
                    {" — "}
                    {formatLeaveDayCount(Number(entry.days) || 0)}{" "}
                    {formatLeaveDayUnit(Number(entry.days) || 0)}
                    {entry.holidayName ? (
                      <span className="block text-muted-foreground">
                        {entry.holidayName}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ohSummary ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-border pt-2 text-muted-foreground">
              <dt>Allowed</dt>
              <dd className="tabular-nums text-foreground">
                {formatLeaveDayCount(Number(ohSummary.allowed) || 0)}
              </dd>
              <dt>Used ({monthLabel})</dt>
              <dd className="tabular-nums text-foreground">
                {formatLeaveDayCount(safeUsed)}
              </dd>
              <dt>Remaining Balance</dt>
              <dd className="tabular-nums text-foreground">
                {formatLeaveDayCount(Number(ohSummary.remaining) || 0)}
              </dd>
            </dl>
          ) : (
            <div className="space-y-0.5 border-t border-border pt-2 text-muted-foreground">
              <p>
                Total Used:{" "}
                <span className="tabular-nums font-medium text-foreground">
                  {formatLeaveDayCount(safeUsed)} {formatLeaveDayUnit(safeUsed)}
                </span>
              </p>
              {remaining != null ? (
                <p>
                  Remaining Balance:{" "}
                  <span className="tabular-nums font-medium text-foreground">
                    {formatLeaveDayCount(Number(remaining) || 0)}{" "}
                    {formatLeaveDayUnit(Number(remaining) || 0)}
                  </span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TeamLeaveBalancesPanel({
  className,
  initialData = null,
  initialDepartments = [],
  initialEmploymentTypes = [],
  initialYear,
  initialMonth,
}: Props) {
  const defaults = currentIstMonthYear(initialYear ?? initialData?.year);
  const seededMonth = initialData?.month ?? initialMonth ?? defaults.month;
  const seededYear = initialData?.year ?? defaults.year;
  const hasSeed = Boolean(initialData?.rows);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [employmentTypeId, setEmploymentTypeId] = useState<string | undefined>();
  const [month, setMonth] = useState(seededMonth);
  const [year, setYear] = useState(seededYear);
  const [monthLabel, setMonthLabel] = useState(() =>
    initialData?.monthLabel ||
    formatLeaveMonthYear(seededMonth, seededYear),
  );
  const [rows, setRows] = useState<TeamLeaveBalanceRow[]>(() =>
    (initialData?.rows ?? []).map(normalizeTeamLeaveBalanceRow),
  );
  const [departments, setDepartments] = useState(
    () => initialData?.departments ?? initialDepartments,
  );
  const [employmentTypes, setEmploymentTypes] = useState(
    () => initialData?.employmentTypes ?? initialEmploymentTypes,
  );
  const [loaded, setLoaded] = useState(hasSeed);
  const [loadFailed, setLoadFailed] = useState(false);
  const [, startTransition] = useTransition();
  const requestSeq = useRef(0);
  const skipNextFilterLoad = useRef(hasSeed);
  const yearItems = useMemo(() => getHrmsYearSelectItems(), []);

  const departmentOptions = useMemo(
    () => departments.map((item) => ({ value: item.id, label: item.label })),
    [departments],
  );
  const employmentTypeOptions = useMemo(
    () => employmentTypes.map((item) => ({ value: item.id, label: item.label })),
    [employmentTypes],
  );
  const monthOptions = useMemo(
    () => LEAVE_MONTH_OPTIONS.map((item) => ({ value: String(item.value), label: item.label })),
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    (next?: {
      search?: string;
      departmentId?: string;
      employmentTypeId?: string;
      balanceYear?: number;
      balanceMonth?: number;
    }) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        try {
          const result = await listTeamLeaveBalancesAction({
            search: next?.search ?? debouncedSearch,
            departmentId: next?.departmentId ?? departmentId,
            employmentTypeId: next?.employmentTypeId ?? employmentTypeId,
            balanceYear: next?.balanceYear ?? year,
            balanceMonth: next?.balanceMonth ?? month,
          });
          if (seq !== requestSeq.current) return;

          if (!result.success) {
            console.error("[leave-balance] load failed:", result.message);
            setLoadFailed(true);
            setLoaded(true);
            return;
          }

          const data = result.data;
          setRows((data.rows ?? []).map(normalizeTeamLeaveBalanceRow));
          setDepartments(data.departments ?? []);
          setEmploymentTypes(data.employmentTypes ?? []);
          setYear(data.year ?? year);
          setMonth(data.month ?? month);
          setMonthLabel(
            data.monthLabel ||
              formatLeaveMonthYear(data.month ?? month, data.year ?? year),
          );
          setLoadFailed(false);
          setLoaded(true);
        } catch (error) {
          if (seq !== requestSeq.current) return;
          console.error("[leave-balance] unexpected load error:", error);
          setLoadFailed(true);
          setLoaded(true);
        }
      });
    },
    [debouncedSearch, departmentId, employmentTypeId, year, month],
  );

  useEffect(() => {
    if (skipNextFilterLoad.current) {
      skipNextFilterLoad.current = false;
      return;
    }
    load({
      search: debouncedSearch,
      departmentId,
      employmentTypeId,
      balanceYear: year,
      balanceMonth: month,
    });
    // Load once on mount (unless server-seeded) and whenever filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional filter-driven reload
  }, [debouncedSearch, departmentId, employmentTypeId, year, month]);

  // Targeted refresh after leave mutations (same tab) — keep current rows visible.
  useEffect(() => {
    const onLeaveBalancesChanged = (_event: Event) => {
      void (_event as CustomEvent<LeaveBalancesChangedDetail>).detail;
      load({
        search: debouncedSearch,
        departmentId,
        employmentTypeId,
        balanceYear: year,
        balanceMonth: month,
      });
    };

    window.addEventListener(LEAVE_BALANCES_CHANGED_EVENT, onLeaveBalancesChanged);
    return () => {
      window.removeEventListener(
        LEAVE_BALANCES_CHANGED_EVENT,
        onLeaveBalancesChanged,
      );
    };
  }, [load, debouncedSearch, departmentId, employmentTypeId, year, month]);

  // Only blank the table on the very first paint with no seed — never flash loading over data.
  const showInitialLoading = !loaded && rows.length === 0;
  const showLoadError = loaded && loadFailed && rows.length === 0;

  return (
    <ClientSectionBoundary
      title={LEAVE_BALANCE_LOAD_TITLE}
      description={LEAVE_BALANCE_LOAD_DESCRIPTION}
      contentClassName={cn("space-y-4", className)}
    >
      <TooltipProvider delay={200}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 basis-[12rem]">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee"
                className={cn(FILTER_CONTROL_CLASS, "pl-8")}
                aria-label="Search employee"
              />
            </div>

            <Select
              value={departmentId ?? FILTER_ANY_VALUE}
              onValueChange={(value) =>
                setDepartmentId(
                  !value || value === FILTER_ANY_VALUE ? undefined : value,
                )
              }
            >
              <SelectTrigger
                className={cn(FILTER_CONTROL_CLASS, "w-auto min-w-[10rem]")}
                aria-label="Department"
              >
                <SelectValue placeholder={DEPARTMENT_LABEL}>
                  {filterSelectLabel(departmentId, DEPARTMENT_LABEL, departmentOptions)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={MANAGER_FILTER_SELECT_CONTENT_CLASS}>
                <SelectItem value={FILTER_ANY_VALUE}>{DEPARTMENT_LABEL}</SelectItem>
                {departments.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={employmentTypeId ?? FILTER_ANY_VALUE}
              onValueChange={(value) =>
                setEmploymentTypeId(
                  !value || value === FILTER_ANY_VALUE ? undefined : value,
                )
              }
            >
              <SelectTrigger
                className={cn(FILTER_CONTROL_CLASS, "w-auto min-w-[11rem]")}
                aria-label="Employment type"
              >
                <SelectValue placeholder={EMPLOYMENT_TYPE_LABEL}>
                  {filterSelectLabel(
                    employmentTypeId,
                    EMPLOYMENT_TYPE_LABEL,
                    employmentTypeOptions,
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={MANAGER_FILTER_SELECT_CONTENT_CLASS}>
                <SelectItem value={FILTER_ANY_VALUE}>{EMPLOYMENT_TYPE_LABEL}</SelectItem>
                {employmentTypes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(month)}
              onValueChange={(value) => {
                if (!value) return;
                setMonth(Number(value));
              }}
            >
              <SelectTrigger
                className={cn(FILTER_CONTROL_CLASS, "w-auto min-w-[8.5rem]")}
                aria-label="Month"
              >
                <SelectValue placeholder="Month">
                  {filterSelectLabel(String(month), "Month", monthOptions)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={MANAGER_FILTER_SELECT_CONTENT_CLASS}>
                {LEAVE_MONTH_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(year)}
              onValueChange={(value) => {
                if (!value) return;
                setYear(Number(value));
              }}
            >
              <SelectTrigger
                className={cn(FILTER_CONTROL_CLASS, "w-auto min-w-[5.5rem]")}
                aria-label="Year"
              >
                <SelectValue placeholder="Year">{String(year)}</SelectValue>
              </SelectTrigger>
              <SelectContent className={MANAGER_FILTER_SELECT_CONTENT_CLASS}>
                {yearItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showLoadError ? (
            <ErrorState
              variant="muted"
              title={LEAVE_BALANCE_LOAD_TITLE}
              description={LEAVE_BALANCE_LOAD_DESCRIPTION}
              retryLabel={SECTION_LOAD_RETRY_LABEL}
              onRetry={() =>
                load({
                  search: debouncedSearch,
                  departmentId,
                  employmentTypeId,
                  balanceYear: year,
                  balanceMonth: month,
                })
              }
            />
          ) : (
            <div className="max-h-[min(70vh,calc(100dvh-16rem))] overflow-auto rounded-lg border border-input bg-white [scrollbar-gutter:stable] dark:bg-input">
              <table data-slot="table" className="w-max min-w-full caption-bottom text-sm">
                <TableHeader className={TABLE_HEADER_STICKY_CLASS}>
                  <TableRow className={TABLE_HEADER_ROW_CLASS}>
                    <TableHead
                      className={payrollStickyEmployeeHeaderClass(STICKY_EMPLOYEE_WIDTH)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-3.5" /> Employee
                      </span>
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[7rem]")}>
                      <span className="inline-flex items-center gap-1.5">
                        <Hash className="size-3.5" /> Employee ID
                      </span>
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[9rem]")}>
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5" /> Department
                      </span>
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[7rem] text-center")}>
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="size-3.5" /> CL Available
                      </span>
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[6rem] text-center")}>
                      CL Used
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[7rem] text-center")}>
                      EL Available
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[6rem] text-center")}>
                      EL Used
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[8rem] text-center")}>
                      Optional Holiday
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[5rem] text-center")}>
                      LOP
                    </TableHead>
                    <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[5.5rem] text-center")}>
                      Pending
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showInitialLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        Loading leave balances…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        No active employees match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={row.employeeId}
                        className="group hover:bg-zinc-50 dark:hover:bg-white/5"
                      >
                        <TableCell
                          className={cn(
                            payrollStickyEmployeeBodyClass(STICKY_EMPLOYEE_WIDTH),
                            "whitespace-nowrap font-medium",
                          )}
                        >
                          {row.employeeName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 pl-4 pr-3 tabular-nums">
                          {row.employeeCode || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 pl-4 pr-3">
                          {row.departmentName ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center tabular-nums">
                          {formatLeaveDayCount(row.clAvailable)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center">
                          <UsageHoverCard
                            title="Casual Leave Used"
                            monthLabel={monthLabel}
                            employeeName={row.employeeName}
                            used={row.clUsed}
                            remaining={row.clAvailable}
                            usage={row.clUsage}
                            emptyLabel={`No Casual Leave used in ${monthLabel}.`}
                          >
                            {formatLeaveDayCount(row.clUsed)}
                          </UsageHoverCard>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center tabular-nums">
                          {formatLeaveDayCount(row.elAvailable)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center">
                          <UsageHoverCard
                            title="Earned Leave Used"
                            monthLabel={monthLabel}
                            employeeName={row.employeeName}
                            used={row.elUsed}
                            remaining={row.elAvailable}
                            usage={row.elUsage}
                            emptyLabel={`No Earned Leave used in ${monthLabel}.`}
                          >
                            {formatLeaveDayCount(row.elUsed)}
                          </UsageHoverCard>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center">
                          <UsageHoverCard
                            title="Optional Holiday Used"
                            monthLabel={monthLabel}
                            employeeName={row.employeeName}
                            used={row.ohUsed}
                            usage={row.ohUsage}
                            emptyLabel={`No Optional Holidays used in ${monthLabel}.`}
                            ohSummary={{
                              allowed: row.ohAllowed,
                              used: row.ohUsed,
                              remaining: row.ohAvailable,
                            }}
                          >
                            {`${formatLeaveDayCount(row.ohUsed)} / ${formatLeaveDayCount(row.ohAllowed)}`}
                          </UsageHoverCard>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center">
                          <UsageHoverCard
                            title="LOP"
                            monthLabel={monthLabel}
                            employeeName={row.employeeName}
                            used={row.lopDays}
                            usage={row.lopUsage}
                            emptyLabel={`No LOP in ${monthLabel}.`}
                          >
                            {formatLeaveDayCount(row.lopDays)}
                          </UsageHoverCard>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-center tabular-nums">
                          {formatLeaveDayCount(row.pendingDays)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>
            </div>
          )}
        </div>
      </TooltipProvider>
    </ClientSectionBoundary>
  );
}
