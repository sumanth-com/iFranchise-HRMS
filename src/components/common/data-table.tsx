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

/** Taller scroll area for self-service leave request lists. */
export const DATA_TABLE_LEAVE_REQUESTS_MAX_HEIGHT =
  "max-h-[min(52vh,calc(100dvh-22rem))]";

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

  // Scrollable mode renders a plain table so sticky headers aren't blocked by the
  // nested overflow wrapper inside the shared Table component.
  if (scrollable) {
    return (
      <div
        className={cn(
          "rounded-lg border overflow-auto [scrollbar-gutter:stable]",
          maxHeightClass,
          className,
        )}
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-20 border-b bg-card shadow-sm">
            <tr className="border-b">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "h-10 bg-card px-2 text-left align-middle text-sm font-medium whitespace-nowrap text-foreground",
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
            {data.length === 0 ? (
              <tr className="border-b">
                <td
                  colSpan={columns.length}
                  className={cn(
                    "h-24 p-2 align-middle text-sm text-muted-foreground",
                    cellAlign,
                  )}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b transition-colors hover:bg-muted/50"
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
    <div className={cn("rounded-lg border overflow-x-auto", className)}>
      <Table>
        <TableHeader>
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
