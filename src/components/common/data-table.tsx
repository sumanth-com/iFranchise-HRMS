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
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  className,
  emptyMessage = "No records to display.",
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.key)} className={column.className}>
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
                className="h-24 text-center text-muted-foreground"
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
                    className={column.className}
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
