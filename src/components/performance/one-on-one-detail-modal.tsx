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
import { MeetingStatusBadge } from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
} from "@/components/performance/performance-ui-primitives";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  fetchOneOnOneDetailAction,
  updateOneOnOneAction,
} from "@/lib/performance/actions";
import { MEETING_STATUS_LABELS } from "@/lib/performance/constants";
import type { OneOnOneDetail } from "@/types/performance";

const statusItems = toSelectItems(MEETING_STATUS_LABELS);

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
  const [notes, setNotes] = useState("");
  const [agenda, setAgenda] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<string>("scheduled");
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
        setNotes(data.notes ?? "");
        setAgenda(data.agenda ?? "");
        setFollowUpDate(data.followUpDate ?? "");
        setMeetingStatus(data.meetingStatus);
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
        notes,
        agenda,
        followUpDate: followUpDate || null,
        meetingStatus: meetingStatus as OneOnOneDetail["meetingStatus"],
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
          <MeetingStatusBadge status={detail.meetingStatus} />

          <DetailGrid>
            <DetailField
              label="Scheduled"
              value={format(new Date(detail.scheduledAt), "MMM d, yyyy h:mm a")}
            />
            <DetailField
              label="Follow-up"
              value={
                detail.followUpDate
                  ? format(new Date(detail.followUpDate), "MMM d, yyyy")
                  : "—"
              }
            />
          </DetailGrid>

          {canEdit ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Agenda</Label>
                <Input value={agenda} disabled={isPending} onChange={(e) => setAgenda(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discussion notes</Label>
                <Input value={notes} disabled={isPending} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Follow-up date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    disabled={isPending}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <LabeledSelect
                    items={statusItems}
                    value={meetingStatus}
                    onValueChange={setMeetingStatus}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          ) : (
            <DetailGrid columns={1}>
              <DetailField label="Agenda" value={detail.agenda ?? "—"} />
              <DetailField label="Notes" value={detail.notes ?? "—"} />
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
