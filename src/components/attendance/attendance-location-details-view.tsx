"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, MapPin } from "lucide-react";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { buttonVariants, POLICY_HEADER_BUTTON_CLASS } from "@/components/common/button";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { formatGpsCoordinate } from "@/lib/attendance/gps-format";
import {
  attendanceLocationHref,
  type AttendanceLocationDetails,
  type AttendanceLocationPointKind,
} from "@/lib/attendance/services/attendance-location";
import { cn } from "@/lib/utils";

const LOCATION_PAGE_HELP = {
  title: "About Attendance Location",
  description:
    "This page shows the GPS location captured from the employee’s device when they checked in or checked out.",
  points: [
    {
      label: "Recorded Location",
      detail:
        "The map pin and address show where the employee’s device reported being at the time of that punch.",
    },
    {
      label: "Latitude",
      detail:
        "North–south GPS coordinate of the punch. Higher values are farther north.",
    },
    {
      label: "Longitude",
      detail:
        "East–west GPS coordinate of the punch. Higher values are farther east.",
    },
    {
      label: "Accuracy",
      detail:
        "How precise the device GPS estimate was, in meters. A smaller number means a tighter location fix.",
    },
    {
      label: "Recorded",
      detail:
        "Date and time of that check-in or check-out punch. It updates to match the punch shown in Attendance History.",
    },
    {
      label: "Punch type",
      detail:
        "Whether you are viewing the Check In or Check Out location for this attendance record.",
    },
  ],
} as const;

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
        style={{ height: 500, minHeight: 500, width: "100%" }}
      >
        Loading map…
      </div>
    ),
  },
);

type Props = {
  data: AttendanceLocationDetails;
  attendanceBasePath: string;
  portalLabel?: string;
};

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

function parsePointParam(
  value: string | null,
): AttendanceLocationPointKind | null {
  if (value === "check_in" || value === "in") return "check_in";
  if (value === "check_out" || value === "out") return "check_out";
  return null;
}

export function AttendanceLocationDetailsView({
  data,
  attendanceBasePath,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferred = parsePointParam(searchParams.get("point"));

  const activePoint = useMemo(() => {
    // Honor the selected punch explicitly — do not silently show the other punch.
    if (preferred === "check_out") return data.checkOut ?? null;
    if (preferred === "check_in") return data.checkIn ?? null;
    return data.checkIn ?? data.checkOut ?? null;
  }, [data.checkIn, data.checkOut, preferred]);

  const hasBoth = Boolean(data.checkIn && data.checkOut);

  function selectPoint(point: AttendanceLocationPointKind) {
    router.replace(
      attendanceLocationHref(attendanceBasePath, data.attendanceId, point),
      { scroll: false },
    );
  }

  const punchLabel =
    activePoint?.kind === "check_out" ? "Check Out" : "Check In";

  // Prefer the punch timestamp so Recorded always matches Check In / Check Out
  // on Attendance History (location_at can lag or stay from an earlier capture).
  const recordedSourceAt =
    activePoint?.kind === "check_out"
      ? data.checkOutAt ?? activePoint.recordedAt
      : data.checkInAt ?? activePoint?.recordedAt ?? null;

  const recordedAtLabel = recordedSourceAt
    ? format(parseISO(recordedSourceAt), "dd MMM yyyy, hh:mm a")
        .replace(/\bam\b/i, "AM")
        .replace(/\bpm\b/i, "PM")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={attendanceBasePath}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
            POLICY_HEADER_BUTTON_CLASS,
            "text-black hover:text-black",
          )}
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <SectionHelpButton
          title={LOCATION_PAGE_HELP.title}
          description={LOCATION_PAGE_HELP.description}
          points={[...LOCATION_PAGE_HELP.points]}
          ariaLabel="About this Location page"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Location
          </h1>
        </SectionHelpButton>
      </div>

      <section className="rounded-xl border bg-card px-4 py-3.5 shadow-sm sm:px-5">
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
              onClick={() => selectPoint("check_in")}
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
              onClick={() => selectPoint("check_out")}
              className={cn(
                buttonVariants({
                  variant:
                    activePoint?.kind === "check_out" ? "default" : "outline",
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
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center shadow-sm">
          <MapPin className="size-9 text-muted-foreground/60" />
          <div>
            <p className="text-base font-semibold text-foreground">
              {preferred === "check_out"
                ? "Check-out location not recorded"
                : preferred === "check_in"
                  ? "Check-in location not recorded"
                  : "Location not recorded"}
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {preferred === "check_out" && data.checkIn
                ? "GPS was not captured for check-out on this record. Check-in location may still be available."
                : preferred === "check_in" && data.checkOut
                  ? "GPS was not captured for check-in on this record. Check-out location may still be available."
                  : "No GPS coordinates are available for this attendance record."}
            </p>
          </div>
          {hasBoth || (preferred === "check_out" && data.checkIn) || (preferred === "check_in" && data.checkOut) ? (
            <div className="flex flex-wrap justify-center gap-2">
              {data.checkIn ? (
                <button
                  type="button"
                  onClick={() => selectPoint("check_in")}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View check-in location
                </button>
              ) : null}
              {data.checkOut ? (
                <button
                  type="button"
                  onClick={() => selectPoint("check_out")}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View check-out location
                </button>
              ) : null}
            </div>
          ) : (
            <Link
              href={attendanceBasePath}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to attendance
            </Link>
          )}
        </section>
      ) : (
        <AttendanceLocationMap
          // Exact stored coords for this attendanceId + punch — same values drive
          // both the marker center and the floating card (no defaults / fallbacks).
          latitude={activePoint.latitude}
          longitude={activePoint.longitude}
          overlay={{
            address: activePoint.address,
            latitude: activePoint.latitude,
            longitude: activePoint.longitude,
            latitudeLabel: formatGpsCoordinate(Number(activePoint.latitude)),
            longitudeLabel: formatGpsCoordinate(Number(activePoint.longitude)),
            accuracyMeters: activePoint.accuracyMeters,
            recordedAtLabel,
            employeeName: data.employeeName,
            punchLabel,
          }}
        />
      )}
    </div>
  );
}
