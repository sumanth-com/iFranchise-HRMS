"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { getSignedUrlAction } from "@/lib/employees/actions";

export function DocumentDownloadButton({ storagePath }: { storagePath: string }) {
  const [isPending, startTransition] = useTransition();

  const download = () => {
    startTransition(async () => {
      const result = await getSignedUrlAction("documents", storagePath);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      window.open(result.data, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1.5"
      disabled={isPending}
      onClick={download}
    >
      <Download className="size-3.5" />
      Download
    </Button>
  );
}
