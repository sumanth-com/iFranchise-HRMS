"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { exportTeamMonthlyAttendance } from "@/lib/manager/attendance-export";
import type { ReportExportFormat } from "@/types/reports";
import type { TeamMonthlyAttendanceRow } from "@/types/manager-attendance";

type ManagerAttendanceMonthlyExportProps = {
  rows: TeamMonthlyAttendanceRow[];
  monthLabel: string;
  disabled?: boolean;
};

const EXPORT_OPTIONS: { format: ReportExportFormat; label: string; icon: typeof Download }[] = [
  { format: "excel", label: "Excel", icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", icon: FileText },
  { format: "csv", label: "CSV", icon: Download },
];

export function ManagerAttendanceMonthlyExport({
  rows,
  monthLabel,
  disabled,
}: ManagerAttendanceMonthlyExportProps) {
  const [isPending, startTransition] = useTransition();

  function handleExport(format: ReportExportFormat) {
    if (!rows.length) {
      toast.error("No data to export for this month.");
      return;
    }

    startTransition(async () => {
      try {
        await exportTeamMonthlyAttendance(rows, monthLabel, format);
        toast.success(`Exported ${rows.length} row(s) as ${format.toUpperCase()}`);
      } catch {
        toast.error("Export failed. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {EXPORT_OPTIONS.map(({ format, label, icon: Icon }) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          disabled={disabled || isPending || !rows.length}
          onClick={() => handleExport(format)}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Icon className="mr-1.5 size-4" />
          )}
          {label}
        </Button>
      ))}
    </div>
  );
}
