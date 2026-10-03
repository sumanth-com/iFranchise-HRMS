"use client";

import { useEffect, useMemo, useState } from "react";

import { MandatoryAnnouncementDialog } from "@/components/employee/announcements/mandatory-announcement-dialog";
import {
  rememberLocalAnnouncementAck,
  wasAnnouncementAckedLocally,
} from "@/lib/organization/mandatory-announcement-ack-storage";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

export function EmployeeAnnouncementGate({
  initialAnnouncements,
}: {
  initialAnnouncements: CompanyAnnouncementEmployeeView[];
}) {
  const [remaining, setRemaining] = useState<CompanyAnnouncementEmployeeView[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRemaining(
      initialAnnouncements.filter(
        (item) => !wasAnnouncementAckedLocally(item.id, item.versionId),
      ),
    );
    setReady(true);
  }, [initialAnnouncements]);

  const current = useMemo(() => remaining[0] ?? null, [remaining]);

  if (!ready || !current) return null;

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
