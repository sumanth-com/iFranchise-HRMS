"use client";

import { Download, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { exportRolesDataAction } from "@/lib/roles/actions";
import type { RoleExportFormat } from "@/types/roles";

type Props = {
  entity: "roles" | "assignments";
};

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RolesExportButtons({ entity }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleExport(format: RoleExportFormat) {
    startTransition(async () => {
      const res = await exportRolesDataAction(entity, format);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      downloadFile(res.data.content, res.data.filename, res.data.mimeType);
      toast.success(`Exported as ${format.toUpperCase()}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => handleExport("csv")}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => handleExport("excel")}
      >
        Excel
      </Button>
    </div>
  );
}
