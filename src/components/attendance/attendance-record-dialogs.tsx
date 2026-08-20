"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { AttendanceDetailView } from "@/components/attendance/attendance-detail-view";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { Modal } from "@/components/common/modal";
import {
  getAttendanceCorrectionDetailAction,
  getAttendanceDetailAction,
} from "@/lib/attendance/actions";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type {
  AttendanceCorrectionDetail,
  AttendanceDetail,
  AttendanceLookups,
} from "@/types/attendance";

type AttendanceViewDialogProps = {
  attendanceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  onEdit?: (attendance: AttendanceDetail) => void;
};

export function AttendanceViewDialog({
  attendanceId,
  open,
  onOpenChange,
  canEdit = false,
  onEdit,
}: AttendanceViewDialogProps) {
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !attendanceId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await getAttendanceDetailAction(attendanceId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, attendanceId]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Attendance record"
      description="Review this attendance entry without leaving the list."
      contentClassName="sm:max-w-3xl"
      showCancel={false}
    >
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-6 text-sm text-muted-foreground">{error}</p>
      ) : detail ? (
        <AttendanceDetailView
          attendance={detail}
          canEdit={canEdit}
          compact
          onEdit={
            onEdit
              ? () => {
                  onEdit(detail);
                  onOpenChange(false);
                }
              : undefined
          }
        />
      ) : null}
    </Modal>
  );
}

type AttendanceRegularizationViewDialogProps = {
  attendanceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AttendanceRegularizationViewDialog({
  attendanceId,
  open,
  onOpenChange,
}: AttendanceRegularizationViewDialogProps) {
  const [detail, setDetail] = useState<AttendanceCorrectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !attendanceId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await getAttendanceCorrectionDetailAction(attendanceId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, attendanceId]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Regularization request"
      description="Review the requested correction details."
      contentClassName="sm:max-w-lg"
      showCancel={false}
    >
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-6 text-sm text-muted-foreground">{error}</p>
      ) : detail ? (
        <dl className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Requested check in</dt>
              <dd className="mt-1 font-medium">
                {formatAttendanceTime(detail.requestedCheckInAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Requested check out</dt>
              <dd className="mt-1 font-medium">
                {formatAttendanceTime(detail.requestedCheckOutAt)}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="mt-1 whitespace-pre-wrap">{detail.reason || "—"}</dd>
          </div>
          {detail.reviewNotes ? (
            <div>
              <dt className="text-muted-foreground">Review comments</dt>
              <dd className="mt-1 whitespace-pre-wrap">{detail.reviewNotes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Modal>
  );
}

type AttendanceEditDialogProps = {
  attendanceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: AttendanceLookups;
};

export function AttendanceEditDialog({
  attendanceId,
  open,
  onOpenChange,
  lookups,
}: AttendanceEditDialogProps) {
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !attendanceId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await getAttendanceDetailAction(attendanceId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, attendanceId]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit attendance"
      description="Update this attendance record and save it here."
      contentClassName="sm:max-w-2xl"
      showCancel={false}
    >
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-6 text-sm text-muted-foreground">{error}</p>
      ) : detail ? (
        <AttendanceForm
          key={detail.id}
          mode="edit"
          attendance={detail}
          lookups={lookups}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}
