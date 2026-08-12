import { type ReactNode } from "react";

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
  columns: DataTableColumn<T>[];
  data: T[];
  className?: string;
  emptyMessage?: string;
  align?: "left" | "center";
  /** Enables a max-height scroll region with a sticky header (attendance-style tables). */
  scrollable?: boolean;
  maxHeightClass?: string;
};

export const DATA_TABLE_SCROLL_MAX_HEIGHT =
  "max-h-[min(70vh,calc(100dvh-16rem))]";

export const DATA_TABLE_SPLIT_SCROLL_MAX_HEIGHT =
  "max-h-[min(32vh,calc(50dvh-14rem))]";

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  className,
  emptyMessage = "No records to display.",
  align = "left",
  scrollable = false,
  maxHeightClass = DATA_TABLE_SCROLL_MAX_HEIGHT,
}: DataTableProps<T>) {
  const headAlign = align === "center" ? "text-center" : "text-left";
  const cellAlign = align === "center" ? "text-center" : "text-left";

  return (
    <div
      className={cn(
        "rounded-lg border",
        scrollable
          ? cn("overflow-auto [scrollbar-gutter:stable]", maxHeightClass)
          : "overflow-x-auto",
        className,
      )}
    >
      <Table>
        <TableHeader className={scrollable ? "sticky top-0 z-10 bg-background shadow-sm" : undefined}>
          <TableRow>
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
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className={cn("h-24 text-muted-foreground", cellAlign)}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
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
