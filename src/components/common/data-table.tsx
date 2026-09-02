import { type ReactNode } from "react";

import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_ROW_CLASS,
  TABLE_HEADER_STICKY_CLASS,
} from "@/components/common/table-header-classes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns?: DataTableColumn<T>[] | null;
  data?: T[] | null;
  className?: string;
  emptyMessage?: string;
  /** Classes for the empty-state cell. Defaults to a taller padded block. */
  emptyClassName?: string;
  align?: "left" | "center";
  /** Enables a max-height scroll region with a sticky header (attendance-style tables). */
  scrollable?: boolean;
  maxHeightClass?: string;
};

export const DATA_TABLE_SCROLL_MAX_HEIGHT =
  "max-h-[min(70vh,calc(100dvh-16rem))]";

export const DATA_TABLE_SPLIT_SCROLL_MAX_HEIGHT =
  "max-h-[min(32vh,calc(50dvh-14rem))]";

/** Taller scroll area for self-service leave request lists. */
export const DATA_TABLE_LEAVE_REQUESTS_MAX_HEIGHT =
  "max-h-[min(52vh,calc(100dvh-22rem))]";

export function DataTable<T extends Record<string, unknown>>({
  columns: columnsProp,
  data: dataProp,
  className,
  emptyMessage = "No records to display.",
  emptyClassName,
  align = "left",
  scrollable = false,
  maxHeightClass = DATA_TABLE_SCROLL_MAX_HEIGHT,
}: DataTableProps<T>) {
  const columns = Array.isArray(columnsProp) ? columnsProp : [];
  const rows = Array.isArray(dataProp) ? dataProp : [];
  const emptyCellClassName = cn(
    "flex min-h-[7rem] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground",
    emptyClassName,
  );
  const headAlign = align === "center" ? "text-center" : "text-left";
  const cellAlign = align === "center" ? "text-center" : "text-left";

  // Scrollable mode renders a plain table so sticky headers aren't blocked by the
  // nested overflow wrapper inside the shared Table component.
  if (scrollable) {
    return (
      <div
        className={cn(
          "h-fit overflow-auto rounded-lg border border-input bg-white [scrollbar-gutter:stable] dark:bg-input",
          rows.length > 0 && maxHeightClass,
          className,
        )}
      >
        <table className="w-full caption-bottom bg-white text-sm dark:bg-input">
          <thead className={TABLE_HEADER_STICKY_CLASS}>
            <tr className={TABLE_HEADER_ROW_CLASS}>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    TABLE_HEADER_CELL_CLASS,
                    headAlign,
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-b">
                <td colSpan={columns.length} className="p-0 align-middle">
                  <div className={emptyCellClassName}>{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-input/70 bg-white transition-colors hover:bg-zinc-50 dark:bg-input dark:hover:bg-white/5"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        "p-2 align-middle text-sm whitespace-nowrap",
                        cellAlign,
                        column.className,
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-input bg-white dark:bg-input", className)}>
      <Table>
        <TableHeader>
          <TableRow className={TABLE_HEADER_ROW_CLASS}>
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={cn(headAlign, column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0 align-middle">
                <div className={emptyCellClassName}>{emptyMessage}</div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    className={cn(cellAlign, column.className)}
                  >
                    {column.render
                      ? column.render(row)
                      : String(row[column.key as keyof T] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
