"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MandatoryAnnouncementDialog } from "@/components/employee/announcements/mandatory-announcement-dialog";
import { listPendingMandatoryAnnouncementsAction } from "@/lib/organization/actions/company-announcement-actions";
import {
  rememberLocalAnnouncementAck,
  wasAnnouncementAckedLocally,
} from "@/lib/organization/mandatory-announcement-ack-storage";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

export function EmployeeAnnouncementGate() {
  const [remaining, setRemaining] = useState<CompanyAnnouncementEmployeeView[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    void listPendingMandatoryAnnouncementsAction().then((result) => {
      if (!result.success) return;
      setRemaining(
        result.data.filter(
          (item) => !wasAnnouncementAckedLocally(item.id, item.versionId),
        ),
      );
    });
  }, []);

  const current = useMemo(() => remaining[0] ?? null, [remaining]);

  if (!current) return null;

  return (
    <MandatoryAnnouncementDialog
      announcement={current}
      onAccepted={(announcement) => {
        rememberLocalAnnouncementAck(announcement.id, announcement.versionId);
        setRemaining((items) =>
          items.filter(
            (item) =>
              !(item.id === announcement.id && item.versionId === announcement.versionId),
          ),
        );
      }}
    />
  );
}
