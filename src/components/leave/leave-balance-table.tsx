"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo } from "react";
import {
  Building2,
  Hash,
  Layers,
  User,
} from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaveBalanceItem } from "@/types/leave";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaveBalanceTableProps = {
  balances: LeaveBalanceItem[];
};

const TABLE_HEAD_CELL_CLASS = "h-11 whitespace-nowrap py-3.5 pl-10 pr-4";
const TABLE_DATA_CELL_CLASS = "whitespace-nowrap py-3.5 pl-10 pr-4";

const TABLE_HEAD_CLASS =
  "sticky top-0 z-20 bg-black text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]";
const TABLE_CELL_CLASS = "relative align-middle";

function HeadLabel({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <>
      <Icon className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-white" />
      <span className="font-medium whitespace-nowrap text-white">{label}</span>
    </>
  );
}

function CenteredHeadLabel({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-white">
      <Icon className="size-3.5 shrink-0 text-white" />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

export function LeaveBalanceTable({ balances }: LeaveBalanceTableProps) {
  const columns = useMemo<ColumnDef<LeaveBalanceItem>[]>(
    () => [
      {
        id: "employeeCode",
        accessorKey: "employeeCode",
        header: "Employee Code",
      },
      {
        id: "employeeName",
        accessorKey: "employeeName",
        header: "Employee Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.employeeName}</span>
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
        id: "balanceYear",
        header: "Year",
        cell: ({ row }) => row.original.balanceYear,
      },
      {
        id: "allocatedDays",
        header: "Allocated",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.allocatedDays.toFixed(1)}</span>
        ),
      },
      {
        id: "usedDays",
        header: "Used",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.usedDays.toFixed(1)}</span>
        ),
      },
      {
        id: "pendingDays",
        header: "Pending",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.pendingDays.toFixed(1)}</span>
        ),
      },
      {
        id: "balanceDays",
        header: "Balance",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {row.original.balanceDays.toFixed(1)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: balances,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-auto rounded-lg border max-h-[min(70vh,calc(100dvh-16rem))] [scrollbar-gutter:stable]">
      <table
        data-slot="table"
        className="w-max min-w-full caption-bottom text-sm"
      >
        <TableHeader className="sticky top-0 z-30 bg-black">
          <TableRow className="border-white/10 bg-black hover:bg-black">
            <TableHead
              className={cn(
                "min-w-[8.5rem]",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
                TABLE_HEAD_CELL_CLASS,
              )}
            >
              <HeadLabel label="Employee Code" icon={Hash} />
            </TableHead>
            <TableHead
              className={cn(
                "min-w-[15rem]",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
                TABLE_HEAD_CELL_CLASS,
              )}
            >
              <HeadLabel label="Employee Name" icon={User} />
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
                "h-11 min-w-[5rem] whitespace-nowrap px-4 py-3.5 text-center",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
              )}
            >
              <CenteredHeadLabel label="Year" icon={Hash} />
            </TableHead>
            <TableHead
              className={cn(
                "h-11 min-w-[6rem] whitespace-nowrap px-4 py-3.5 text-center",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
              )}
            >
              <CenteredHeadLabel label="Allocated" icon={Layers} />
            </TableHead>
            <TableHead
              className={cn(
                "h-11 min-w-[5rem] whitespace-nowrap px-4 py-3.5 text-center",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
              )}
            >
              <CenteredHeadLabel label="Used" icon={Layers} />
            </TableHead>
            <TableHead
              className={cn(
                "h-11 min-w-[6rem] whitespace-nowrap px-4 py-3.5 text-center",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
              )}
            >
              <CenteredHeadLabel label="Pending" icon={Layers} />
            </TableHead>
            <TableHead
              className={cn(
                "h-11 min-w-[6rem] whitespace-nowrap px-4 py-3.5 text-center",
                TABLE_HEAD_CLASS,
                TABLE_CELL_CLASS,
              )}
            >
              <CenteredHeadLabel label="Balance" icon={Layers} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                No leave balances found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      TABLE_CELL_CLASS,
                      ["balanceYear", "allocatedDays", "usedDays", "pendingDays", "balanceDays"].includes(
                        cell.column.id,
                      )
                        ? "whitespace-nowrap px-4 py-3.5 text-center tabular-nums"
                        : TABLE_DATA_CELL_CLASS,
                    )}
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
  );
}
