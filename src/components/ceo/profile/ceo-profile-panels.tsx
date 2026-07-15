"use client";

import { format } from "date-fns";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { revokeCeoSessionAction } from "@/lib/ceo/actions/ceo-profile-actions";
import type {
  CeoActivityItem,
  CeoCalendarEvent,
  CeoLoginSession,
} from "@/types/ceo-profile";

const EVENT_LABELS: Record<CeoCalendarEvent["eventType"], string> = {
  meeting: "Upcoming Meeting",
  board_meeting: "Board Meeting",
  executive_review: "Executive Review",
  scheduled_report: "Scheduled Report",
  company_event: "Company Event",
};

export function CeoProfileSecuritySection({
  sessions,
  onUpdated,
}: {
  sessions: CeoLoginSession[];
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function revoke(sessionId: string) {
    startTransition(async () => {
      const result = await revokeCeoSessionAction({ sessionId });
      if (result.success) {
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section id="security" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground">
          Recent login history, devices, browsers, and session controls.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No login sessions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-2 py-2 font-medium">Device</th>
                <th className="px-2 py-2 font-medium">Browser</th>
                <th className="px-2 py-2 font-medium">OS</th>
                <th className="px-2 py-2 font-medium">IP Address</th>
                <th className="px-2 py-2 font-medium">Location</th>
                <th className="px-2 py-2 font-medium">Login Time</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b last:border-0">
                  <td className="px-2 py-2.5">
                    {session.deviceType ?? "—"}
                    {session.isCurrent ? (
                      <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase">
                        Current
                      </span>
                    ) : null}
                    {!session.isActive ? (
                      <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                        Revoked
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5">{session.browser ?? "—"}</td>
                  <td className="px-2 py-2.5">{session.operatingSystem ?? "—"}</td>
                  <td className="px-2 py-2.5">{session.ipAddress ?? "—"}</td>
                  <td className="px-2 py-2.5">{session.location ?? "—"}</td>
                  <td className="px-2 py-2.5">
                    {format(new Date(session.loggedInAt), "dd MMM yyyy HH:mm")}
                  </td>
                  <td className="px-2 py-2.5">
                    {session.isActive && !session.isCurrent ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => revoke(session.id)}
                      >
                        Revoke Session
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function CeoProfileCalendarSection({
  calendar,
}: {
  calendar: CeoCalendarEvent[];
}) {
  return (
    <section id="calendar" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Executive Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Upcoming meetings, board items, reviews, scheduled reports, and company events.
        </p>
      </div>

      {calendar.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming executive calendar items.</p>
      ) : (
        <ul className="space-y-2">
          {calendar.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-1 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {EVENT_LABELS[event.eventType]} ·{" "}
                  {format(new Date(event.startsAt), "dd MMM yyyy HH:mm")}
                </p>
              </div>
              {event.href ? (
                <a href={event.href} className="text-xs font-medium text-primary hover:underline">
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CeoProfileActivitySection({
  activity,
}: {
  activity: CeoActivityItem[];
}) {
  return (
    <section id="activity" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Activity Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Profile updates, password changes, logins, approvals, reports, and analytics activity.
        </p>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
      ) : (
        <ul className="space-y-2">
          {activity.map((item) => (
            <li key={item.id} className="rounded-lg border px-3 py-2.5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description ? (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
                <p className="text-[11px] whitespace-nowrap text-muted-foreground">
                  {format(new Date(item.occurredAt), "dd MMM yyyy HH:mm")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
