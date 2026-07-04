"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import {
  LeaveAdvancedFiltersSheet,
  type LeaveAdvancedFilterValues,
} from "@/components/leave/leave-advanced-filters-sheet";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  rejectLeaveRequestAction,
} from "@/lib/leave/actions";
import {
  LEAVE_ROUTES,
  LEAVE_STATUS_LABELS,
} from "@/lib/leave/constants";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import type { LeaveListItem } from "@/types/leave";
import type { LookupOption } from "@/types/employee";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaveTableProps = {
  records: LeaveListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  month?: number;
  year?: number;
  leaveStatus?: string;
  leaveTypeId?: string;
  departmentId?: string;
  branchId?: string;
  approverId?: string;
  reportingManagerId?: string;
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  approvers: LookupOption[];
  managers: LookupOption[];
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
};

const TABLE_HEAD_CELL_CLASS = "h-11 whitespace-nowrap py-3.5 pl-10 pr-4";
const TABLE_DATA_CELL_CLASS = "whitespace-nowrap py-3.5 pl-10 pr-4";
const TABLE_ACTIONS_CELL_CLASS = "w-12 px-2 py-3.5";

const TABLE_HEAD_CLASS =
  "sticky top-0 z-20 bg-black text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]";
const TABLE_CELL_CLASS = "relative align-middle";

const FILTER_CONTROL_CLASS =
  "h-9 w-full min-w-0 gap-2 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground/70";

const MONTH_ITEMS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function HeadLabel({
  label,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <>
      <Icon
        className={cn(
          "pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-white",
          iconClassName,
        )}
      />
      <span className="font-medium whitespace-nowrap text-white">{label}</span>
    </>
  );
}

function CenteredHeadLabel({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium text-white",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-white" />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

function buildYearItems(currentYear: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const year = currentYear - 2 + index;
    return { value: String(year), label: String(year) };
  });
}

export function LeaveTable({
  records,
  total,
  page,
  pageSize,
  search,
  month,
  year,
  leaveStatus,
  leaveTypeId,
  departmentId,
  branchId,
  approverId,
  reportingManagerId,
  leaveTypes,
  departments,
  branches,
  approvers,
  managers,
  canCreate,
  canApprove,
  canReject,
  canCancel,
}: LeaveTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<LeaveListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveListItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LeaveListItem | null>(null);
  const [approveComments, setApproveComments] = useState("");
  const [rejectComments, setRejectComments] = useState("");

  const now = new Date();
  const currentMonth = month ?? now.getMonth() + 1;
  const currentYear = year ?? now.getFullYear();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        router.push(`${LEAVE_ROUTES.list}?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const yearItems = useMemo(() => buildYearItems(currentYear), [currentYear]);

  const statusItems = useMemo(
    () => [
      { value: "", label: "All statuses" },
      ...Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  const leaveTypeItems = useMemo(
    () => [
      { value: "", label: "All types" },
      ...leaveTypes.map((item) => ({ value: item.id, label: item.label })),
    ],
    [leaveTypes],
  );

  const advancedValues: LeaveAdvancedFilterValues = {
    departmentId,
    branchId,
    reportingManagerId,
    approverId,
  };

  const advancedFilterCount = [
    departmentId,
    branchId,
    reportingManagerId,
    approverId,
  ].filter(Boolean).length;

  const isDefaultView =
    currentMonth === now.getMonth() + 1 &&
    currentYear === now.getFullYear() &&
    !search &&
    !leaveStatus &&
    !leaveTypeId &&
    advancedFilterCount === 0;

  const hasActiveFilters = !isDefaultView;

  const applyAdvancedFilters = (values: LeaveAdvancedFilterValues) => {
    updateParams({
      departmentId: values.departmentId,
      branchId: values.branchId,
      reportingManagerId: values.reportingManagerId,
      approverId: values.approverId,
      page: "1",
    });
  };

  const clearAdvancedFilters = () => {
    updateParams({
      departmentId: undefined,
      branchId: undefined,
      reportingManagerId: undefined,
      approverId: undefined,
      page: "1",
    });
  };

  const columns = useMemo<ColumnDef<LeaveListItem>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <p className="font-medium">{row.original.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.original.employeeCode}</p>
          </div>
        ),
      },
      {
        id: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        id: "leaveTypeName",
        header: "Leave Type",
        cell: ({ row }) => row.original.leaveTypeName,
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.isHalfDay ? "0.5 day" : `${row.original.totalDays} day${row.original.totalDays === 1 ? "" : "s"}`}
          </span>
        ),
      },
      {
        id: "startDate",
        header: "Start Date",
        cell: ({ row }) => formatLeaveDate(row.original.startDate),
      },
      {
        id: "endDate",
        header: "End Date",
        cell: ({ row }) => formatLeaveDate(row.original.endDate),
      },
      {
        id: "appliedAt",
        header: "Applied On",
        cell: ({ row }) =>
          format(parseISO(row.original.appliedAt), "dd MMM yyyy"),
      },
      {
        id: "approverName",
        header: "Approver",
        cell: ({ row }) => row.original.approverName ?? "—",
      },
      {
        id: "leaveStatus",
        header: "Status",
        cell: ({ row }) => <LeaveStatusBadge status={row.original.leaveStatus} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const isPendingStatus = row.original.leaveStatus === "pending";
          const isCancellable = ["pending", "approved"].includes(
            row.original.leaveStatus,
          );

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-[11.5rem]">
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  onClick={() =>
                    router.push(LEAVE_ROUTES.detail(row.original.id))
                  }
                >
                  <Eye className="size-4 shrink-0" />
                  View Leave
                </DropdownMenuItem>
                {canApprove && isPendingStatus ? (
                  <DropdownMenuItem
                    className="whitespace-nowrap"
                    onClick={() => setApproveTarget(row.original)}
                  >
                    <CheckCircle2 className="size-4 shrink-0" />
                    Approve
                  </DropdownMenuItem>
                ) : null}
                {canReject && isPendingStatus ? (
                  <DropdownMenuItem
                    className="whitespace-nowrap"
                    onClick={() => setRejectTarget(row.original)}
                  >
                    <XCircle className="size-4 shrink-0" />
                    Reject
                  </DropdownMenuItem>
                ) : null}
                {canCancel && isCancellable ? (
                  <DropdownMenuItem
                    variant="destructive"
                    className="whitespace-nowrap"
                    onClick={() => setCancelTarget(row.original)}
                  >
                    <Ban className="size-4 shrink-0" />
                    Cancel Leave
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canApprove, canCancel, canReject, router],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  const handleApprove = () => {
    if (!approveTarget) return;

    startTransition(async () => {
      const result = await approveLeaveRequestAction({
        leaveRequestId: approveTarget.id,
        comments: approveComments || "",
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request approved");
      setApproveTarget(null);
      setApproveComments("");
      router.refresh();
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;

    if (rejectComments.trim().length < 3) {
      toast.error("Rejection reason is required");
      return;
    }

    startTransition(async () => {
      const result = await rejectLeaveRequestAction({
        leaveRequestId: rejectTarget.id,
        comments: rejectComments,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request rejected");
      setRejectTarget(null);
      setRejectComments("");
      router.refresh();
    });
  };

  const handleCancel = () => {
    if (!cancelTarget) return;

    startTransition(async () => {
      const result = await cancelLeaveRequestAction(cancelTarget.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request cancelled");
      setCancelTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full shrink-0 sm:w-[20rem]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Name, code, or email..."
              defaultValue={search}
              className="h-9 pl-8"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateParams({
                    search: event.currentTarget.value || undefined,
                    page: "1",
                  });
                }
              }}
            />
          </div>

          <div className="w-full shrink-0 sm:w-[8rem]">
            <Select
              items={MONTH_ITEMS}
              value={String(currentMonth)}
              onValueChange={(value) =>
                updateParams({ month: value ?? undefined, page: "1" })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {MONTH_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full shrink-0 sm:w-[6rem]">
            <Select
              items={yearItems}
              value={String(currentYear)}
              onValueChange={(value) =>
                updateParams({ year: value ?? undefined, page: "1" })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {yearItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full shrink-0 sm:w-[8.25rem]">
            <Select
              items={statusItems}
              value={leaveStatus ?? ""}
              onValueChange={(value) =>
                updateParams({ leaveStatus: value || undefined, page: "1" })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {statusItems.map((item) => (
                  <SelectItem key={item.value || "all-statuses"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full shrink-0 sm:w-[11rem]">
            <Select
              items={leaveTypeItems}
              value={leaveTypeId ?? ""}
              onValueChange={(value) =>
                updateParams({ leaveTypeId: value || undefined, page: "1" })
              }
            >
              <SelectTrigger className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {leaveTypeItems.map((item) => (
                  <SelectItem key={item.value || "all-leave-types"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 whitespace-nowrap"
            onClick={() => setAdvancedOpen(true)}
          >
            <SlidersHorizontal className="size-3.5" />
            Advanced
            {advancedFilterCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {advancedFilterCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 whitespace-nowrap"
              disabled={isPending}
              onClick={() =>
                updateParams({
                  search: undefined,
                  leaveStatus: undefined,
                  leaveTypeId: undefined,
                  departmentId: undefined,
                  branchId: undefined,
                  approverId: undefined,
                  reportingManagerId: undefined,
                  month: String(now.getMonth() + 1),
                  year: String(now.getFullYear()),
                  page: "1",
                })
              }
            >
              Clear filters
            </Button>
          ) : null}

          {canCreate ? (
            <Link
              href={LEAVE_ROUTES.new}
              className={cn(
                buttonVariants(),
                "h-9 whitespace-nowrap px-4",
              )}
            >
              <Plus className="size-4" />
              Apply Leave
            </Link>
          ) : null}
        </div>
      </div>

      <LeaveAdvancedFiltersSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advancedValues}
        departments={departments}
        branches={branches}
        managers={managers}
        approvers={approvers}
        onApply={applyAdvancedFilters}
        onClear={clearAdvancedFilters}
      />

      <div className="overflow-auto rounded-lg border max-h-[min(70vh,calc(100dvh-16rem))] [scrollbar-gutter:stable]">
        <table
          data-slot="table"
          className="w-max min-w-full caption-bottom text-sm"
        >
          <TableHeader className="sticky top-0 z-30 bg-black">
            <TableRow className="border-white/10 bg-black hover:bg-black">
              <TableHead
                className={cn(
                  "min-w-[14rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="Employee" icon={User} />
              </TableHead>
              <TableHead
                className={cn(
                  "min-w-[9.5rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="Department" icon={Building2} />
              </TableHead>
              <TableHead
                className={cn(
                  "min-w-[10rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="Leave Type" icon={Layers} />
              </TableHead>
              <TableHead
                className={cn(
                  "h-11 min-w-[7rem] whitespace-nowrap px-4 py-3.5 text-center",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                )}
              >
                <CenteredHeadLabel label="Duration" icon={CalendarDays} />
              </TableHead>
              <TableHead
                className={cn(
                  "min-w-[10.5rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="Start Date" icon={CalendarDays} />
              </TableHead>
              <TableHead
                className={cn(
                  "min-w-[10.5rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="End Date" icon={CalendarDays} />
              </TableHead>
              <TableHead
                className={cn(
                  "min-w-[10.5rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="Applied On" icon={CalendarDays} />
              </TableHead>
              <TableHead
                className={cn(
                  "min-w-[10rem]",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                  TABLE_HEAD_CELL_CLASS,
                )}
              >
                <HeadLabel label="Approver" icon={UserCheck} />
              </TableHead>
              <TableHead
                className={cn(
                  "h-11 min-w-[8.5rem] whitespace-nowrap px-4 py-3.5 text-center",
                  TABLE_HEAD_CLASS,
                  TABLE_CELL_CLASS,
                )}
              >
                <CenteredHeadLabel
                  label="Status"
                  icon={BadgeCheck}
                  className="-translate-x-2"
                />
              </TableHead>
              <TableHead className={cn(TABLE_HEAD_CLASS, TABLE_ACTIONS_CELL_CLASS)} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leave requests found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(LEAVE_ROUTES.detail(row.original.id))
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        TABLE_CELL_CLASS,
                        cell.column.id === "actions"
                          ? TABLE_ACTIONS_CELL_CLASS
                          : ["leaveStatus", "duration"].includes(cell.column.id)
                            ? "whitespace-nowrap px-4 py-3.5 text-center"
                            : TABLE_DATA_CELL_CLASS,
                      )}
                      onClick={
                        cell.column.id === "actions"
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {records.length === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Showing {total} leave request{total === 1 ? "" : "s"}
        </p>
      )}

      <Modal
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
            setApproveComments("");
          }
        }}
        title="Approve leave request"
        description={
          approveTarget
            ? `Approve leave for ${approveTarget.employeeName}?`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setApproveTarget(null);
                setApproveComments("");
              }}
            >
              Cancel
            </Button>
            <Button disabled={isPending} onClick={handleApprove}>
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="tableApproveComments">Comments (optional)</Label>
          <textarea
            id="tableApproveComments"
            rows={3}
            value={approveComments}
            disabled={isPending}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setApproveComments(event.currentTarget.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectComments("");
          }
        }}
        title="Reject leave request"
        description={
          rejectTarget
            ? `Reject leave for ${rejectTarget.employeeName}?`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectComments("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleReject}>
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="tableRejectComments">Rejection reason</Label>
          <textarea
            id="tableRejectComments"
            rows={3}
            value={rejectComments}
            disabled={isPending}
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setRejectComments(event.currentTarget.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel leave request"
        description={
          cancelTarget
            ? `Cancel leave for ${cancelTarget.employeeName}?`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep request
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleCancel}>
              Cancel leave
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will cancel the leave request and restore the employee&apos;s leave balance
          where applicable.
        </p>
      </Modal>
    </div>
  );
}
