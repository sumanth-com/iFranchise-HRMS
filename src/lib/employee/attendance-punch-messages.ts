import {
  OFFICE_CHECK_OUT_TIME,
  OFFICE_TIMEZONE,
} from "@/lib/attendance/services/attendance-utils";

function officeTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );
  return { hour, minute, totalMinutes: hour * 60 + minute };
}

export function getOfficeHourGreeting(now = new Date()): string {
  const { hour } = officeTimeParts(now);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function isBeforeOfficeEnd(now = new Date()): boolean {
  const { totalMinutes } = officeTimeParts(now);
  const [endHour, endMinute] = OFFICE_CHECK_OUT_TIME.split(":").map((part) =>
    Number.parseInt(part, 10),
  );
  return totalMinutes < endHour * 60 + endMinute;
}

export function formatOfficeEndLabel() {
  const [hour24, minute] = OFFICE_CHECK_OUT_TIME.split(":").map((part) =>
    Number.parseInt(part, 10),
  );
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function buildCheckInMessage(firstName: string, now = new Date()) {
  const name = firstName.trim() || "there";
  const greeting = getOfficeHourGreeting(now);
  return {
    title: `${greeting}, ${name}!`,
    body: "You're checked in for today. Wishing you a focused and productive day ahead.",
  };
}

export function buildEarlyCheckOutConfirm(firstName: string) {
  const name = firstName.trim() || "there";
  return {
    title: `Leaving early, ${name}?`,
    body: `Our official end of day is ${formatOfficeEndLabel()}. If you check out now, today's session will be marked as incomplete. Are you sure you want to continue?`,
    confirmLabel: "Yes, check out now",
    cancelLabel: "Stay checked in",
  };
}

export function buildCheckOutFarewell(firstName: string, now = new Date()) {
  const name = firstName.trim() || "there";
  const afterHours = !isBeforeOfficeEnd(now);
  if (afterHours) {
    return {
      title: `Thank you, ${name}!`,
      body: "Thanks for your dedication today. Good night — rest well and see you tomorrow.",
    };
  }
  return {
    title: `Take care, ${name}`,
    body: "Your check-out is recorded. We hope the rest of your day goes well. See you tomorrow.",
  };
}
