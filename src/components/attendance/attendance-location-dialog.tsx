"use client";

import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { buttonVariants } from "@/components/common/button";
import { DialogBodySkeleton } from "@/components/common/dialog-body-skeleton";
import { Modal } from "@/components/common/modal";
import { getAttendanceLocationAction } from "@/lib/attendance/actions/attendance-location-actions";
import { formatGpsCoordinate } from "@/lib/attendance/gps-format";
import type {
  AttendanceLocationDetails,
  AttendanceLocationPointKind,
} from "@/lib/attendance/services/attendance-location";
import { cn } from "@/lib/utils";

const AttendanceLocationMap = dynamic(
  () =>
    import("@/components/attendance/attendance-location-map").then(
      (mod) => mod.AttendanceLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex w-full items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground"
        style={{ height: 360, minHeight: 360, width: "100%" }}
      >
        Loading map…
      </div>
    ),
  },
);

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

type AttendanceLocationDialogProps = {
  attendanceId: string | null;
  preferredPoint?: AttendanceLocationPointKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AttendanceLocationDialog({
  attendanceId,
  preferredPoint = null,
  open,
  onOpenChange,
}: AttendanceLocationDialogProps) {
  const [data, setData] = useState<AttendanceLocationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState<AttendanceLocationPointKind | null>(
    preferredPoint,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !attendanceId) {
      setData(null);
      setError(null);
      setPoint(preferredPoint);
      return;
    }

    setPoint(preferredPoint);
    startTransition(async () => {
      const result = await getAttendanceLocationAction(
        attendanceId,
        preferredPoint,
      );
      if (!result.success) {
        setData(null);
        setError(result.message);
        return;
      }
      setError(null);
      setData(result.data);
    });
  }, [open, attendanceId, preferredPoint]);

  const activePoint = useMemo(() => {
    if (!data) return null;
    if (point === "check_out") return data.checkOut ?? null;
    if (point === "check_in") return data.checkIn ?? null;
    return data.checkIn ?? data.checkOut ?? null;
  }, [data, point]);

  const hasBoth = Boolean(data?.checkIn && data?.checkOut);
  const punchLabel =
    activePoint?.kind === "check_out" ? "Check Out" : "Check In";

  const recordedSourceAt =
    activePoint?.kind === "check_out"
      ? data?.checkOutAt ?? activePoint.recordedAt
      : data?.checkInAt ?? activePoint?.recordedAt ?? null;

  const recordedAtLabel = recordedSourceAt
    ? format(parseISO(recordedSourceAt), "dd MMM yyyy, hh:mm a")
        .replace(/\bam\b/i, "AM")
        .replace(/\bpm\b/i, "PM")
    : null;

  const loading =
    isPending || (open && Boolean(attendanceId) && !data && !error);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Attendance location"
      description="GPS captured from the employee’s device for this punch."
      contentClassName="sm:max-w-4xl"
      bodyClassName="space-y-3"
      showCancel={false}
    >
      {loading ? (
        <DialogBodySkeleton rows={5} />
      ) : error ? (
        <p className="py-6 text-sm text-muted-foreground">{error}</p>
      ) : data ? (
        <>
          <section className="rounded-xl border bg-muted/10 px-4 py-3.5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
              <InfoCell label="Employee" value={data.employeeName} />
              <InfoCell label="Employee ID" value={data.employeeCode || "—"} />
              <InfoCell
                label="Status"
                value={<AttendanceStatusBadge status={data.attendanceStatus} />}
              />
              <InfoCell label="Punch type" value={punchLabel} />
            </div>

            {hasBoth ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setPoint("check_in")}
                  className={cn(
                    buttonVariants({
                      variant:
                        activePoint?.kind === "check_in" ? "default" : "outline",
                      size: "sm",
                    }),
                  )}
                >
                  Check-in location
                </button>
                <button
                  type="button"
                  onClick={() => setPoint("check_out")}
                  className={cn(
                    buttonVariants({
                      variant:
                        activePoint?.kind === "check_out"
                          ? "default"
                          : "outline",
                      size: "sm",
                    }),
                  )}
                >
                  Check-out location
                </button>
              </div>
            ) : null}
          </section>

          {!activePoint ? (
            <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
              <MapPin className="size-9 text-muted-foreground/60" />
              <div>
                <p className="text-base font-semibold text-foreground">
                  {point === "check_out"
                    ? "Check-out location not recorded"
                    : point === "check_in"
                      ? "Check-in location not recorded"
                      : "Location not recorded"}
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  No GPS coordinates are available for this punch.
                </p>
              </div>
              {hasBoth ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {data.checkIn ? (
                    <button
                      type="button"
                      onClick={() => setPoint("check_in")}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      View check-in location
                    </button>
                  ) : null}
                  {data.checkOut ? (
                    <button
                      type="button"
                      onClick={() => setPoint("check_out")}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      View check-out location
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : (
            <AttendanceLocationMap
              latitude={activePoint.latitude}
              longitude={activePoint.longitude}
              overlay={{
                address: activePoint.address,
                latitude: activePoint.latitude,
                longitude: activePoint.longitude,
                latitudeLabel: formatGpsCoordinate(Number(activePoint.latitude)),
                longitudeLabel: formatGpsCoordinate(
                  Number(activePoint.longitude),
                ),
                accuracyMeters: activePoint.accuracyMeters,
                recordedAtLabel,
                employeeName: data.employeeName,
                punchLabel,
              }}
            />
          )}
        </>
      ) : null}
    </Modal>
  );
}
