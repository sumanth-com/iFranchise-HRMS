import { parseISO } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { createNotification } from "@/lib/notifications/services/notification-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";

type BirthdayToday = {
  employeeId: string;
  name: string;
  isSelf: boolean;
};

function firstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

function isBirthdayOnDate(dateOfBirth: string, referenceDate: string) {
  try {
    const birth = parseISO(dateOfBirth);
    const today = parseISO(referenceDate);
    return (
      birth.getMonth() === today.getMonth() &&
      birth.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

async function loadTodaysBirthdays(
  organizationId: string,
  referenceDate: string,
  selfEmployeeId: string,
): Promise<BirthdayToday[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employee_profiles")
    .select(
      "date_of_birth, employees:employee_id!inner(id, first_name, last_name, organization_id, employment_status, deleted_at, status)",
    )
    .eq("employees.organization_id", organizationId)
    .not("date_of_birth", "is", null)
    .limit(3000);

  if (error) throw new Error(error.message);

  const birthdays: BirthdayToday[] = [];

  for (const row of data ?? []) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    if (!employee || employee.deleted_at) continue;
    if (employee.status && employee.status !== "active") continue;
    if (employee.employment_status === "terminated") continue;

    const dateOfBirth = row.date_of_birth as string | null;
    if (!dateOfBirth || !isBirthdayOnDate(dateOfBirth, referenceDate)) continue;

    const name =
      `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || "Team member";

    birthdays.push({
      employeeId: employee.id as string,
      name,
      isSelf: employee.id === selfEmployeeId,
    });
  }

  birthdays.sort((a, b) => a.name.localeCompare(b.name));
  return birthdays;
}

function buildBirthdayReminderCopy(
  birthdays: BirthdayToday[],
  viewerFirstName: string,
) {
  const self = birthdays.find((item) => item.isSelf);
  const colleagues = birthdays.filter((item) => !item.isSelf);

  if (self && colleagues.length === 0) {
    return {
      title: "Happy Birthday! 🎉",
      message: `Wishing you a wonderful day, ${firstName(self.name)}. Enjoy your special day!`,
    };
  }

  if (self && colleagues.length > 0) {
    const names = colleagues.map((item) => firstName(item.name)).join(", ");
    return {
      title: "Birthdays today 🎂",
      message: `Happy birthday, ${firstName(self.name)}! It's also ${names}'s birthday today — spread the cheer.`,
    };
  }

  if (colleagues.length === 1) {
    const person = colleagues[0];
    return {
      title: "Birthday reminder 🎂",
      message: `Hi ${viewerFirstName}, it's ${firstName(person.name)}'s birthday today. Take a moment to wish them well.`,
    };
  }

  const names = colleagues.map((item) => firstName(item.name));
  const joined =
    names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;

  return {
    title: "Birthdays today 🎂",
    message: `Hi ${viewerFirstName}, ${joined} are celebrating their birthday today.`,
  };
}

/**
 * Sends a once-per-day birthday reminder notification when the user logs in.
 */
export async function sendBirthdayRemindersOnLogin(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const today = getTodayDateString();

  try {
    const birthdays = await loadTodaysBirthdays(
      profile.employee.organizationId,
      today,
      profile.employee.id,
    );

    if (birthdays.length === 0) return;

    const copy = buildBirthdayReminderCopy(birthdays, profile.employee.firstName);
    const sourceEventKey = `birthday_reminder:${profile.userId}:${today}`;

    await createNotification(supabase, {
      organizationId: profile.employee.organizationId,
      userId: profile.userId,
      employeeId: profile.employee.id,
      title: copy.title,
      message: copy.message,
      notificationType: "birthday_reminder",
      module: "system",
      priority: "medium",
      actionUrl: "/employee",
      sourceEventKey,
      createdBy: profile.userId,
      metadata: {
        referenceDate: today,
        birthdayCount: birthdays.length,
        birthdays: birthdays.map((item) => ({
          employeeId: item.employeeId,
          name: item.name,
          isSelf: item.isSelf,
        })),
      },
    });
  } catch (error) {
    console.error("[sendBirthdayRemindersOnLogin] Failed:", error);
  }
}
