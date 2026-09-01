"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { MandatoryAnnouncementDialog } from "@/components/employee/announcements/mandatory-announcement-dialog";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

type Props = {
  pending: CompanyAnnouncementEmployeeView[];
};

export function EmployeeAnnouncementGate({ pending }: Props) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(pending);
  const current = useMemo(() => remaining[0] ?? null, [remaining]);

  useEffect(() => {
    setRemaining(pending);
  }, [pending]);

  if (!current) return null;

  return (
    <MandatoryAnnouncementDialog
      announcement={current}
      onAcknowledged={(announcementId) => {
        setRemaining((items) => items.filter((item) => item.id !== announcementId));
      }}
      onAcknowledgeFailed={(announcement, message) => {
        toast.error(message);
        setRemaining((items) =>
          items.some((item) => item.id === announcement.id)
            ? items
            : [announcement, ...items],
        );
      }}
      onAcknowledgeSucceeded={() => {
        router.refresh();
      }}
    />
  );
}
