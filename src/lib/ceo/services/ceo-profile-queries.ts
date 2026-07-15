import { addDays, format, startOfDay } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import {
  createSignedStorageUrl,
  removeProfileImage,
  uploadProfileImage,
} from "@/lib/employees/services/employee-mutations";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { parseNotificationSoundTone } from "@/lib/notifications/constants";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import type { UserProfile } from "@/types/auth";
import type {
  CeoAccountInfo,
  CeoActivityItem,
  CeoAlertPreferences,
  CeoCalendarEvent,
  CeoExecutiveProfile,
  CeoLoginSession,
  CeoProfilePageData,
  CeoUserPreferences,
} from "@/types/ceo-profile";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const DEFAULT_ALERT_PREFERENCES: CeoAlertPreferences = {
  executiveAlerts: true,
  payrollAlerts: true,
  recruitmentAlerts: true,
  attendanceAlerts: true,
  performanceAlerts: true,
  approvals: true,
  companyAnnouncements: true,
  emailNotifications: true,
  pushNotifications: false,
  desktopNotifications: true,
};

const DEFAULT_PREFERENCES: CeoUserPreferences = {
  theme: "system",
  language: "en",
  timezone: "Asia/Kolkata",
  dateFormat: "dd MMM yyyy",
  timeFormat: "24h",
  defaultDashboard: CEO_ROUTES.home,
  defaultLandingPage: CEO_ROUTES.home,
  sidebarState: "expanded",
  notificationSound: "classic",
};

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseAlertPreferences(value: unknown): CeoAlertPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_ALERT_PREFERENCES };
  }
  const row = value as Record<string, unknown>;
  return {
    executiveAlerts: Boolean(row.executiveAlerts ?? true),
    payrollAlerts: Boolean(row.payrollAlerts ?? true),
    recruitmentAlerts: Boolean(row.recruitmentAlerts ?? true),
    attendanceAlerts: Boolean(row.attendanceAlerts ?? true),
    performanceAlerts: Boolean(row.performanceAlerts ?? true),
    approvals: Boolean(row.approvals ?? true),
    companyAnnouncements: Boolean(row.companyAnnouncements ?? true),
    emailNotifications: Boolean(row.emailNotifications ?? true),
    pushNotifications: Boolean(row.pushNotifications ?? false),
    desktopNotifications: Boolean(row.desktopNotifications ?? true),
  };
}

async function getMfaStatus(supabase: AuthSupabaseClient) {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      return { enabled: false, factorId: null as string | null };
    }
    const verified = (data?.totp ?? []).find((factor) => factor.status === "verified");
    return {
      enabled: Boolean(verified),
      factorId: verified?.id ?? null,
    };
  } catch {
    return { enabled: false, factorId: null as string | null };
  }
}

export async function getCeoExecutiveProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoExecutiveProfile> {
  const { data, error } = await fromHrms(supabase, "employees")
    .select(
      `
      id, employee_code, first_name, last_name, email, phone, date_of_joining,
      department_id, reporting_manager_id, branch_id, employment_type_id,
      departments:department_id(name),
      branches:branch_id(name),
      employment_types:employment_type_id(name),
      reporting_manager:reporting_manager_id(first_name, last_name),
      employee_profiles(
        personal_email, personal_phone, bio, profile_image_storage_path
      )
    `,
    )
    .eq("id", profile.employee.id)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Employee profile not found");

  const row = data as LooseRow;
  const empProfile = unwrapRelation(row.employee_profiles);
  const imagePath = empProfile?.profile_image_storage_path
    ? String(empProfile.profile_image_storage_path)
    : null;
  const imageUrl = imagePath
    ? await createSignedStorageUrl(
        supabase,
        EMPLOYEE_STORAGE_BUCKETS.profileImages,
        imagePath,
      )
    : null;

  const manager = unwrapRelation(row.reporting_manager);

  return {
    employeeId: String(row.id),
    userId: profile.userId,
    fullName: formatEmployeeName(row.first_name, row.last_name),
    employeeCode: String(row.employee_code),
    roleName: profile.roles[0]?.name ?? "CEO",
    departmentName: unwrapRelation(row.departments)?.name
      ? String(unwrapRelation(row.departments)?.name)
      : null,
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    personalEmail: empProfile?.personal_email
      ? String(empProfile.personal_email)
      : null,
    personalPhone: empProfile?.personal_phone
      ? String(empProfile.personal_phone)
      : null,
    dateOfJoining: row.date_of_joining ? String(row.date_of_joining) : null,
    executiveLevel: "C-Suite",
    reportingToName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : "Board of Directors",
    employmentTypeName: unwrapRelation(row.employment_types)?.name
      ? String(unwrapRelation(row.employment_types)?.name)
      : null,
    branchName: unwrapRelation(row.branches)?.name
      ? String(unwrapRelation(row.branches)?.name)
      : null,
    bio: empProfile?.bio ? String(empProfile.bio) : null,
    profileImageUrl: imageUrl,
    profileImagePath: imagePath,
  };
}

export async function getCeoUserPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoUserPreferences> {
  const [{ data: prefs, error: prefsError }, { data: notif, error: notifError }] =
    await Promise.all([
      fromHrms(supabase, "user_preferences")
        .select(
          "theme, language, timezone, date_format, time_format, default_dashboard, default_landing_page, sidebar_state",
        )
        .eq("organization_id", profile.employee.organizationId)
        .eq("user_id", profile.userId)
        .is("deleted_at", null)
        .maybeSingle(),
      fromHrms(supabase, "notification_user_preferences")
        .select("notification_sound")
        .eq("organization_id", profile.employee.organizationId)
        .eq("user_id", profile.userId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

  if (prefsError) throw new Error(prefsError.message);
  if (notifError) throw new Error(notifError.message);

  const row = (prefs ?? {}) as LooseRow;
  return {
    theme: (row.theme as CeoUserPreferences["theme"]) ?? DEFAULT_PREFERENCES.theme,
    language: row.language ? String(row.language) : DEFAULT_PREFERENCES.language,
    timezone: row.timezone ? String(row.timezone) : DEFAULT_PREFERENCES.timezone,
    dateFormat: row.date_format
      ? String(row.date_format)
      : DEFAULT_PREFERENCES.dateFormat,
    timeFormat:
      (row.time_format as CeoUserPreferences["timeFormat"]) ??
      DEFAULT_PREFERENCES.timeFormat,
    defaultDashboard: row.default_dashboard
      ? String(row.default_dashboard)
      : DEFAULT_PREFERENCES.defaultDashboard,
    defaultLandingPage: row.default_landing_page
      ? String(row.default_landing_page)
      : DEFAULT_PREFERENCES.defaultLandingPage,
    sidebarState:
      (row.sidebar_state as CeoUserPreferences["sidebarState"]) ??
      DEFAULT_PREFERENCES.sidebarState,
    notificationSound: parseNotificationSoundTone(
      (notif as LooseRow | null)?.notification_sound,
    ),
  };
}

export async function getCeoAlertPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoAlertPreferences> {
  const { data, error } = await fromHrms(supabase, "notification_user_preferences")
    .select(
      "alert_preferences, receive_email, receive_push, receive_desktop, receive_in_app",
    )
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = (data ?? {}) as LooseRow;
  const alerts = parseAlertPreferences(row.alert_preferences);
  return {
    ...alerts,
    emailNotifications:
      row.receive_email != null ? Boolean(row.receive_email) : alerts.emailNotifications,
    pushNotifications:
      row.receive_push != null ? Boolean(row.receive_push) : alerts.pushNotifications,
    desktopNotifications:
      row.receive_desktop != null
        ? Boolean(row.receive_desktop)
        : alerts.desktopNotifications,
  };
}

export async function getCeoLoginSessions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoLoginSession[]> {
  const { data, error } = await fromHrms(supabase, "user_login_sessions")
    .select(
      `id, device_type, browser, operating_system, ip_address, location,
       logged_in_at, last_seen_at, is_current, revoked_at`,
    )
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .order("logged_in_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(error.message);

  return ((data ?? []) as LooseRow[]).map((row) => ({
    id: String(row.id),
    deviceType: row.device_type ? String(row.device_type) : null,
    browser: row.browser ? String(row.browser) : null,
    operatingSystem: row.operating_system ? String(row.operating_system) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    location: row.location ? String(row.location) : null,
    loggedInAt: String(row.logged_in_at),
    lastSeenAt: String(row.last_seen_at),
    isCurrent: Boolean(row.is_current),
    isActive: !row.revoked_at,
  }));
}

export async function getCeoAccountInfo(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  sessions: CeoLoginSession[],
): Promise<CeoAccountInfo> {
  const [{ data: employee, error }, mfa] = await Promise.all([
    fromHrms(supabase, "employees")
      .select("email, last_login_at, password_last_reset_at")
      .eq("id", profile.employee.id)
      .maybeSingle(),
    getMfaStatus(supabase),
  ]);

  if (error) throw new Error(error.message);
  const row = (employee ?? {}) as LooseRow;
  const email = row.email ? String(row.email) : profile.email;

  return {
    email,
    username: email.split("@")[0] ?? email,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    passwordLastChangedAt: row.password_last_reset_at
      ? String(row.password_last_reset_at)
      : null,
    twoFactorEnabled: mfa.enabled,
    twoFactorFactorId: mfa.factorId,
    activeSessionCount: sessions.filter((session) => session.isActive).length,
  };
}

export async function getCeoCalendarEvents(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoCalendarEvent[]> {
  const organizationId = profile.employee.organizationId;
  const now = startOfDay(new Date());
  const horizon = addDays(now, 60);
  const fromIso = now.toISOString();
  const toIso = horizon.toISOString();
  const fromDate = format(now, "yyyy-MM-dd");
  const toDate = format(horizon, "yyyy-MM-dd");

  const [holidays, schedules, approvals, reviews] = await Promise.all([
    fromHrms(supabase, "holidays")
      .select("id, name, holiday_date")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("holiday_date", fromDate)
      .lte("holiday_date", toDate)
      .order("holiday_date")
      .limit(20),
    fromHrms(supabase, "report_schedules")
      .select("id, name, next_run_at, is_enabled")
      .eq("organization_id", organizationId)
      .eq("created_by", profile.userId)
      .eq("is_enabled", true)
      .is("deleted_at", null)
      .gte("next_run_at", fromIso)
      .lte("next_run_at", toIso)
      .order("next_run_at")
      .limit(15),
    fromHrms(supabase, "executive_approval_requests")
      .select("id, title, due_at, request_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("due_at", "is", null)
      .gte("due_at", fromIso)
      .lte("due_at", toIso)
      .order("due_at")
      .limit(15),
    fromHrms(supabase, "performance_one_on_ones")
      .select("id, agenda, scheduled_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", toIso)
      .order("scheduled_at")
      .limit(15),
  ]);

  if (holidays.error) throw new Error(holidays.error.message);
  // Soft-fail optional feeds so profile still loads if a table/column differs
  const scheduleRows = schedules.error ? [] : ((schedules.data ?? []) as LooseRow[]);
  const approvalRows = approvals.error ? [] : ((approvals.data ?? []) as LooseRow[]);
  const reviewRows = reviews.error ? [] : ((reviews.data ?? []) as LooseRow[]);

  const events: CeoCalendarEvent[] = [];

  for (const row of (holidays.data ?? []) as LooseRow[]) {
    const date = String(row.holiday_date);
    events.push({
      id: `holiday-${row.id}`,
      title: String(row.name),
      eventType: "company_event",
      startsAt: `${date}T00:00:00.000Z`,
      endsAt: null,
      href: CEO_ROUTES.organization,
    });
  }

  for (const row of scheduleRows) {
    events.push({
      id: `report-${row.id}`,
      title: String(row.name),
      eventType: "scheduled_report",
      startsAt: String(row.next_run_at),
      endsAt: null,
      href: CEO_ROUTES.reports,
    });
  }

  for (const row of approvalRows) {
    const title = String(row.title ?? "Executive approval");
    events.push({
      id: `approval-${row.id}`,
      title,
      eventType: /board/i.test(title) ? "board_meeting" : "meeting",
      startsAt: String(row.due_at),
      endsAt: null,
      href: CEO_ROUTES.approvals,
    });
  }

  for (const row of reviewRows) {
    events.push({
      id: `review-${row.id}`,
      title: String(row.agenda ?? "Executive review"),
      eventType: "executive_review",
      startsAt: String(row.scheduled_at),
      endsAt: null,
      href: CEO_ROUTES.performance,
    });
  }

  return events
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 20);
}

export async function getCeoActivityTimeline(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoActivityItem[]> {
  const { data, error } = await fromHrms(supabase, "audit_logs")
    .select("id, occurred_at, module, action, description")
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);

  return ((data ?? []) as LooseRow[]).map((row) => {
    const action = String(row.action ?? "update");
    const auditModule = String(row.module ?? "settings");
    let label = String(row.description ?? `${auditModule} · ${action}`);

    if (action === "login") label = "Login History";
    else if (action.includes("password")) label = "Password Changed";
    else if (auditModule === "settings" || auditModule === "employees") {
      label = "Profile Updated";
    } else if (auditModule === "approvals") label = "Executive Approvals";
    else if (auditModule === "reports") label = "Generated Reports";
    else if (auditModule === "analytics" || action.includes("analytics")) {
      label = "Analytics Viewed";
    }

    return {
      id: String(row.id),
      label,
      description: row.description ? String(row.description) : null,
      occurredAt: String(row.occurred_at),
      module: auditModule,
      action,
    };
  });
}

export async function getCeoProfilePageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoProfilePageData> {
  const [executiveProfile, preferences, alertPreferences, sessions, calendar, activity] =
    await Promise.all([
      getCeoExecutiveProfile(supabase, profile),
      getCeoUserPreferences(supabase, profile),
      getCeoAlertPreferences(supabase, profile),
      getCeoLoginSessions(supabase, profile),
      getCeoCalendarEvents(supabase, profile),
      getCeoActivityTimeline(supabase, profile),
    ]);

  const account = await getCeoAccountInfo(supabase, profile, sessions);

  return {
    profile: executiveProfile,
    account,
    preferences,
    alertPreferences,
    sessions,
    calendar,
    activity,
  };
}

export async function updateCeoPersonalProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    phone?: string;
    personalEmail?: string;
    personalPhone?: string;
    bio?: string;
  },
) {
  const employeeId = profile.employee.id;

  const { error: employeeError } = await fromHrms(supabase, "employees")
    .update({
      phone: emptyToNull(input.phone),
      updated_by: profile.userId,
    })
    .eq("id", employeeId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (employeeError) throw new Error(employeeError.message);

  const profilePayload = {
    personal_email: emptyToNull(input.personalEmail)?.toLowerCase() ?? null,
    personal_phone: emptyToNull(input.personalPhone),
    bio: emptyToNull(input.bio),
    updated_by: profile.userId,
  };

  const { data: existing } = await fromHrms(supabase, "employee_profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await fromHrms(supabase, "employee_profiles")
      .update(profilePayload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "employee_profiles").insert({
      organization_id: profile.employee.organizationId,
      employee_id: employeeId,
      ...profilePayload,
      status: "active",
      created_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "settings",
    action: "profile_update",
    description: "CEO updated personal profile information",
    recordId: employeeId,
    priority: "low",
  });
}

export async function saveCeoUserPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: CeoUserPreferences,
) {
  const organizationId = profile.employee.organizationId;
  const payload = {
    theme: input.theme,
    language: input.language,
    timezone: input.timezone,
    date_format: input.dateFormat,
    time_format: input.timeFormat,
    default_dashboard: input.defaultDashboard,
    default_landing_page: input.defaultLandingPage,
    sidebar_state: input.sidebarState,
    updated_by: profile.userId,
  };

  const { data: existing } = await fromHrms(supabase, "user_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await fromHrms(supabase, "user_preferences")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "user_preferences").insert({
      organization_id: organizationId,
      user_id: profile.userId,
      ...payload,
      status: "active",
      created_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  const { data: notifExisting } = await fromHrms(
    supabase,
    "notification_user_preferences",
  )
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  const soundPayload = {
    notification_sound: input.notificationSound,
    updated_by: profile.userId,
  };

  if (notifExisting?.id) {
    const { error } = await fromHrms(supabase, "notification_user_preferences")
      .update(soundPayload)
      .eq("id", notifExisting.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "notification_user_preferences").insert({
      organization_id: organizationId,
      user_id: profile.userId,
      receive_email: true,
      receive_in_app: true,
      mute_notifications: false,
      daily_digest: false,
      weekly_digest: false,
      ...soundPayload,
      status: "active",
      created_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  await writeApplicationAudit(supabase, {
    organizationId,
    module: "settings",
    action: "preferences_update",
    description: "CEO updated portal preferences",
    recordId: profile.userId,
    priority: "low",
  });
}

export async function saveCeoAlertPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: CeoAlertPreferences,
) {
  const organizationId = profile.employee.organizationId;
  const alertPreferences = {
    executiveAlerts: input.executiveAlerts,
    payrollAlerts: input.payrollAlerts,
    recruitmentAlerts: input.recruitmentAlerts,
    attendanceAlerts: input.attendanceAlerts,
    performanceAlerts: input.performanceAlerts,
    approvals: input.approvals,
    companyAnnouncements: input.companyAnnouncements,
    emailNotifications: input.emailNotifications,
    pushNotifications: input.pushNotifications,
    desktopNotifications: input.desktopNotifications,
  };

  const payload = {
    alert_preferences: alertPreferences,
    receive_email: input.emailNotifications,
    receive_push: input.pushNotifications,
    receive_desktop: input.desktopNotifications,
    receive_in_app: true,
    updated_by: profile.userId,
  };

  const { data: existing } = await fromHrms(supabase, "notification_user_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await fromHrms(supabase, "notification_user_preferences")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "notification_user_preferences").insert({
      organization_id: organizationId,
      user_id: profile.userId,
      mute_notifications: false,
      daily_digest: false,
      weekly_digest: false,
      notification_sound: "classic",
      ...payload,
      status: "active",
      created_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  await writeApplicationAudit(supabase, {
    organizationId,
    module: "notifications",
    action: "notification_preferences_update",
    description: "CEO updated executive notification preferences",
    recordId: profile.userId,
    priority: "low",
  });
}

export async function changeCeoPassword(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  currentPassword: string,
  newPassword: string,
) {
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error("Current password is incorrect");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  await fromHrms(supabase, "employees")
    .update({
      password_last_reset_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", profile.employee.id);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "security",
    action: "password_change",
    description: "CEO changed account password",
    recordId: profile.userId,
    priority: "high",
  });
}

export async function revokeCeoSession(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  sessionId: string,
) {
  const { data, error } = await fromHrms(supabase, "user_login_sessions")
    .select("id, is_current")
    .eq("id", sessionId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Session not found");
  if ((data as LooseRow).is_current) {
    throw new Error("Cannot revoke the current session. Use Sign Out instead.");
  }

  const { error: updateError } = await fromHrms(supabase, "user_login_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: "user_revoked",
      is_current: false,
      updated_by: profile.userId,
    })
    .eq("id", sessionId)
    .eq("user_id", profile.userId);

  if (updateError) throw new Error(updateError.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "security",
    action: "session_revoke",
    description: "CEO revoked a login session",
    recordId: sessionId,
    priority: "medium",
  });
}

export async function signOutOtherCeoSessions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const { error: authError } = await supabase.auth.signOut({ scope: "others" });
  if (authError) throw new Error(authError.message);

  const { error } = await fromHrms(supabase, "user_login_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: "sign_out_others",
      is_current: false,
      updated_by: profile.userId,
    })
    .eq("user_id", profile.userId)
    .eq("is_current", false)
    .is("revoked_at", null)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "security",
    action: "sign_out_others",
    description: "CEO signed out other active sessions",
    recordId: profile.userId,
    priority: "medium",
  });
}

export async function toggleCeoMfa(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  enable: boolean,
): Promise<{ qrCode?: string; secret?: string; factorId?: string; message: string }> {
  const status = await getMfaStatus(supabase);

  if (enable) {
    if (status.enabled) {
      return { message: "Two-factor authentication is already enabled." };
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "CEO Authenticator",
    });
    if (error) throw new Error(error.message);

    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "security",
      action: "mfa_enroll_started",
      description: "CEO started two-factor authentication enrollment",
      recordId: profile.userId,
      priority: "high",
    });

    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
      message:
        "Scan the QR code with your authenticator app, then confirm with a verification code to finish enabling 2FA.",
    };
  }

  if (!status.factorId) {
    return { message: "Two-factor authentication is already disabled." };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId: status.factorId });
  if (error) throw new Error(error.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "security",
    action: "mfa_disabled",
    description: "CEO disabled two-factor authentication",
    recordId: profile.userId,
    priority: "high",
  });

  return { message: "Two-factor authentication disabled." };
}

export async function verifyCeoMfaEnrollment(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  factorId: string,
  code: string,
) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw new Error(challengeError.message);

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw new Error(error.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "security",
    action: "mfa_enabled",
    description: "CEO enabled two-factor authentication",
    recordId: profile.userId,
    priority: "high",
  });
}

export async function recordUserLoginSession(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    employeeId: string | null;
    deviceType?: string;
    browser?: string;
    operatingSystem?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string | null;
  },
) {
  await fromHrms(supabase, "user_login_sessions")
    .update({
      is_current: false,
      updated_by: input.userId,
    })
    .eq("user_id", input.userId)
    .eq("is_current", true)
    .is("deleted_at", null);

  const { error } = await fromHrms(supabase, "user_login_sessions").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    employee_id: input.employeeId,
    device_type: input.deviceType ?? null,
    browser: input.browser ?? null,
    operating_system: input.operatingSystem ?? null,
    ip_address: input.ipAddress ?? null,
    location: input.location ?? null,
    user_agent: input.userAgent ?? null,
    is_current: true,
    status: "active",
    created_by: input.userId,
    updated_by: input.userId,
  });

  if (error) throw new Error(error.message);
}

export async function uploadCeoProfileImage(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  file: File,
) {
  const storagePath = await uploadProfileImage(
    supabase,
    profile.employee.organizationId,
    profile.employee.id,
    file,
  );

  const { data: existing } = await fromHrms(supabase, "employee_profiles")
    .select("id")
    .eq("employee_id", profile.employee.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await fromHrms(supabase, "employee_profiles")
      .update({
        profile_image_storage_path: storagePath,
        updated_by: profile.userId,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "employee_profiles").insert({
      organization_id: profile.employee.organizationId,
      employee_id: profile.employee.id,
      profile_image_storage_path: storagePath,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "settings",
    action: "profile_image_update",
    description: "CEO updated profile photo",
    recordId: profile.employee.id,
    priority: "low",
  });

  return storagePath;
}

export async function removeCeoProfileImage(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  storagePath: string | null,
) {
  if (storagePath) {
    await removeProfileImage(supabase, storagePath);
  }

  const { error } = await fromHrms(supabase, "employee_profiles")
    .update({
      profile_image_storage_path: null,
      updated_by: profile.userId,
    })
    .eq("employee_id", profile.employee.id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "settings",
    action: "profile_image_remove",
    description: "CEO removed profile photo",
    recordId: profile.employee.id,
    priority: "low",
  });
}

export function buildCeoProfileDownload(data: CeoProfilePageData) {
  const lines = [
    "CEO Profile Export",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Executive Profile",
    `Full Name: ${data.profile.fullName}`,
    `Employee ID: ${data.profile.employeeCode}`,
    `Role: ${data.profile.roleName}`,
    `Department: ${data.profile.departmentName ?? "—"}`,
    `Email: ${data.profile.email}`,
    `Phone: ${data.profile.phone ?? "—"}`,
    `Personal Email: ${data.profile.personalEmail ?? "—"}`,
    `Personal Phone: ${data.profile.personalPhone ?? "—"}`,
    `Date of Joining: ${data.profile.dateOfJoining ?? "—"}`,
    `Executive Level: ${data.profile.executiveLevel}`,
    `Reporting To: ${data.profile.reportingToName ?? "—"}`,
    `Employment Type: ${data.profile.employmentTypeName ?? "—"}`,
    `Branch: ${data.profile.branchName ?? "—"}`,
    "",
    "Account",
    `Username: ${data.account.username}`,
    `Last Login: ${data.account.lastLoginAt ?? "—"}`,
    `Last Password Change: ${data.account.passwordLastChangedAt ?? "—"}`,
    `2FA: ${data.account.twoFactorEnabled ? "Enabled" : "Disabled"}`,
    `Active Sessions: ${data.account.activeSessionCount}`,
  ];

  return {
    filename: `ceo-profile-${data.profile.employeeCode}.txt`,
    mimeType: "text/plain;charset=utf-8",
    content: lines.join("\n"),
  };
}
