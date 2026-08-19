"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
} from "@/components/performance/performance-ui-primitives";
import {
  fetchOneOnOneDetailAction,
  updateOneOnOneAction,
} from "@/lib/performance/actions";
import type { OneOnOneDetail } from "@/types/performance";

type Props = {
  meetingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
};

export function OneOnOneDetailModal({
  meetingId,
  open,
  onOpenChange,
  canEdit = false,
}: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<OneOnOneDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [agenda, setAgenda] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !meetingId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchOneOnOneDetailAction(meetingId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      if (data) {
        setAgenda(data.agenda ?? "");
        setMeetingLink(data.meetingLink ?? "");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, meetingId]);

  function save() {
    if (!detail) return;
    startTransition(async () => {
      const result = await updateOneOnOneAction({
        meetingId: detail.id,
        agenda,
        meetingLink: meetingLink || null,
        meetingStatus: detail.meetingStatus,
        scheduledAt: detail.scheduledAt,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success("Meeting updated");
        router.refresh();
        fetchOneOnOneDetailAction(detail.id).then(setDetail);
      }
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="1:1 Meeting"
      description={detail ? `${detail.employeeName} with ${detail.managerName}` : undefined}
      contentClassName="sm:max-w-lg"
      showCancel={false}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {canEdit && detail ? (
            <Button disabled={isPending} onClick={save}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save changes
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading meeting…
        </div>
      ) : !detail ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Meeting not found.</p>
      ) : (
        <div className="space-y-4">
          <DetailGrid>
            <DetailField label="Employee" value={detail.employeeName} />
            <DetailField label="Meeting with" value={detail.managerName} />
            <DetailField
              label="Scheduled"
              value={format(new Date(detail.scheduledAt), "MMM d, yyyy h:mm a")}
            />
          </DetailGrid>

          {canEdit ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Agenda</Label>
                <Input value={agenda} disabled={isPending} onChange={(e) => setAgenda(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meeting link</Label>
                <Input
                  value={meetingLink}
                  disabled={isPending}
                  placeholder="https://..."
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <DetailGrid columns={1}>
              <DetailField label="Agenda" value={detail.agenda ?? "—"} />
              <DetailField
                label="Meeting link"
                value={
                  detail.meetingLink ? (
                    <a
                      href={detail.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {detail.meetingLink}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </DetailGrid>
          )}

          <PerformanceSection title="Action items">
            {detail.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No action items for this meeting.</p>
            ) : (
              <ul className="space-y-2">
                {detail.actions.map((action) => (
                  <li
                    key={action.id}
                    className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{action.title}</p>
                      {action.assignedToName ? (
                        <p className="text-xs text-muted-foreground">{action.assignedToName}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {action.isCompleted ? "Done" : "Open"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PerformanceSection>
        </div>
      )}
    </Modal>
  );
}
