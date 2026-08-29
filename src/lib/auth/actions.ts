"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import {
  DEFAULT_SESSION_MAX_AGE,
  IDLE_ACTIVITY_COOKIE,
  REMEMBER_ME_MAX_AGE,
  AUTH_ROUTES,
} from "@/lib/auth/constants";
import {
  resolveActivityCookieMaxAge,
} from "@/lib/auth/idle-session";
import {
  getAuthErrorMessage,
  mapSupabaseAuthError,
} from "@/lib/auth/errors";
import { loadUserProfile } from "@/lib/auth/profile-loader";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirect";
import {
  evaluatePortalLoginAccess,
  findEligiblePasswordResetTarget,
  resolveApprovedLoginEmail,
} from "@/lib/auth/login-email";
import { sendHrmsPasswordResetEmail } from "@/lib/auth/password-reset-service";
import {
  clearPermissionCacheCookie,
  getVerifiedPermissionCodesForUser,
  setPermissionCacheCookie,
} from "@/lib/auth/permission-cache";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { hashPasswordResetToken } from "@/lib/security/signed-flow-tokens";
import { recordEmployeeSuccessfulLogin, acceptInvitationOnPasswordSet } from "@/lib/employees/services/employee-account";
import { sendBirthdayRemindersOnLogin } from "@/lib/employee/services/birthday-reminder-notifications";
import { resolveUserPortalRoute } from "@/lib/auth/permission-resolver";
import { recordUserLoginSession } from "@/lib/ceo/services/ceo-profile-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import type { AuthActionResult } from "@/types/auth";

/** Bound Auth so a stalled Supabase gateway cannot hold "Signing in..." for ~40s+. */
const LOGIN_AUTH_TIMEOUT_MS = 25_000;

async function signInWithPasswordBounded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("AUTH_TIMEOUT"));
        }, LOGIN_AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function applyRememberMePreference(rememberMe: boolean) {
  const cookieStore = await cookies();
  cookieStore.set("remember_me", rememberMe ? "1" : "0", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_SESSION_MAX_AGE,
  });
}

async function touchIdleActivityCookie(rememberMe?: boolean) {
  const cookieStore = await cookies();
  let resolvedRememberMe = rememberMe;

  if (resolvedRememberMe === undefined) {
    resolvedRememberMe = cookieStore.get("remember_me")?.value === "1";
  }

  cookieStore.set(IDLE_ACTIVITY_COOKIE, Date.now().toString(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: resolveActivityCookieMaxAge(resolvedRememberMe),
  });
}

export async function touchSessionActivityAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await touchIdleActivityCookie();
}

export async function idleSessionLogoutAction(): Promise<void> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  cookieStore.delete(IDLE_ACTIVITY_COOKIE);
  await supabase.auth.signOut();
  await clearPermissionCacheCookie();
  redirect(AUTH_ROUTES.login);
}

export async function loginAction(
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      rememberMe: formData.get("rememberMe") === "on",
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "VALIDATION_ERROR",
        message: getAuthErrorMessage("VALIDATION_ERROR"),
      };
    }

    const { email: rawEmail, password, rememberMe } = parsed.data;
    const portalAccess = await evaluatePortalLoginAccess(rawEmail);
    if (portalAccess === "denied") {
      return {
        success: false,
        error: "PORTAL_ACCESS_DENIED",
        message: getAuthErrorMessage("PORTAL_ACCESS_DENIED"),
      };
    }

    const email = await resolveApprovedLoginEmail(rawEmail);
    const ctx = await getRequestAuditContext();

    try {
      assertRateLimit({
        key: `login:${ctx.ipAddress ?? "unknown"}:${email.toLowerCase()}`,
        limit: 5,
        windowMs: 15 * 60 * 1000,
      });
    } catch {
      return {
        success: false,
        error: "RATE_LIMITED",
        message: getAuthErrorMessage("RATE_LIMITED"),
      };
    }

    const supabase = await createClient();

    let authData: Awaited<
      ReturnType<typeof supabase.auth.signInWithPassword>
    >["data"] = { user: null, session: null };
    let authError: Awaited<
      ReturnType<typeof supabase.auth.signInWithPassword>
    >["error"] = null;

    try {
      const result = await signInWithPasswordBounded(supabase, email, password);
      authData = result.data;
      authError = result.error;
    } catch (error) {
      authError = {
        name: "AuthTimeout",
        message: error instanceof Error ? error.message : "AUTH_TIMEOUT",
        status: 504,
      } as typeof authError;
    }

    if (authError || !authData.user) {
      const mappedError = mapSupabaseAuthError(authError?.message ?? "");
      // Keep failed-login audit off the redirect-critical path.
      after(() =>
        writeApplicationAudit(supabase, {
          organizationId: null,
          module: "dashboard",
          action: "login",
          description: `Failed login attempt for ${email}`,
          recordId: email,
          eventStatus: "failed",
          priority: "high",
          reason: authError?.message,
          ...ctx,
        }).catch((auditError) => {
          console.error("[loginAction] Failed login audit error:", auditError);
        }),
      );

      if (process.env.NODE_ENV === "development" && authError?.message) {
        console.error("[loginAction] Supabase auth error:", authError.message);
      }

      return {
        success: false,
        error: mappedError,
        message: getAuthErrorMessage(mappedError),
      };
    }

    const profileResult = await loadUserProfile(
      authData.user.id,
      email,
      supabase,
    );

    if (!profileResult.success) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: profileResult.error,
        message: getAuthErrorMessage(profileResult.error),
      };
    }

    await applyRememberMePreference(rememberMe);
    await touchIdleActivityCookie(rememberMe);

    const userId = authData.user.id;
    const employee = profileResult.profile.employee;
    const permissionCodes = profileResult.profile.permissionCodes;
    const roleCodes = profileResult.profile.roles.map((role) => role.code);

    // Seed HMAC permission cookie from the already-trusted login profile so the
    // first portal navigation is a cookie HIT (no middleware permission-bootstrap).
    // accountAllowed=true: loadUserProfile already rejected inactive/suspended accounts.
    await setPermissionCacheCookie(userId, permissionCodes, true, roleCodes);
    const seededCodes = await getVerifiedPermissionCodesForUser(userId);
    if (
      !seededCodes ||
      seededCodes.length === 0 ||
      seededCodes.length !== permissionCodes.length ||
      !permissionCodes.every((code) => seededCodes.includes(code))
    ) {
      // Fail closed: do not complete login without a usable permission cookie.
      await clearPermissionCacheCookie();
      await supabase.auth.signOut();
      return {
        success: false,
        error: "SERVER_ERROR",
        message: getAuthErrorMessage("SERVER_ERROR"),
      };
    }

    const needsActivation =
      employee.accountStatus === "invited" ||
      employee.accountStatus === "invitation_pending" ||
      employee.accountStatus === "invitation_accepted" ||
      employee.employmentStatus === "draft";

    // Invitation/draft activation must finish before portal entry.
    if (needsActivation) {
      try {
        await recordEmployeeSuccessfulLogin(supabase, userId, email);
      } catch (loginRecordError) {
        console.error("[loginAction] Failed to record successful login:", loginRecordError);
      }
    }

    const portalRoute = await resolveUserPortalRoute(supabase, userId);
    const redirectTo = getAuthenticatedRedirectPath(
      profileResult.profile.roles,
      permissionCodes,
      portalRoute,
    );

    // Birthday / audit / session bookkeeping must not block portal redirect.
    after(() => {
      const tasks: Promise<unknown>[] = [
        sendBirthdayRemindersOnLogin(supabase, profileResult.profile),
        recordUserLoginSession(supabase, {
          organizationId: employee.organizationId,
          userId,
          employeeId: employee.id,
          deviceType: ctx.deviceType,
          browser: ctx.browser,
          operatingSystem: ctx.operatingSystem,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        }),
        writeApplicationAudit(supabase, {
          organizationId: employee.organizationId,
          module: "dashboard",
          action: "login",
          description: `User ${email} logged in successfully`,
          recordId: userId,
          priority: "medium",
          ...ctx,
          metadata: { email },
        }),
      ];
      if (!needsActivation) {
        tasks.push(recordEmployeeSuccessfulLogin(supabase, userId, email));
      }
      return Promise.allSettled(tasks).then((results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            console.error("[loginAction] Background login task failed:", result.reason);
          }
        }
      });
    });

    return {
      success: true,
      redirectTo,
    };
  } catch (error) {
    console.error("[loginAction] Unexpected failure:", error);
    return {
      success: false,
      error: "SERVER_ERROR",
      message: getAuthErrorMessage("SERVER_ERROR"),
    };
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const profileResult = user.email
      ? await loadUserProfile(user.id, user.email, supabase)
      : null;
    const ctx = await getRequestAuditContext();
    await writeApplicationAudit(supabase, {
      organizationId:
        profileResult && profileResult.success
          ? profileResult.profile.employee.organizationId
          : null,
      module: "dashboard",
      action: "logout",
      description: `User ${user.email ?? user.id} logged out`,
      recordId: user.id,
      priority: "low",
      ...ctx,
    });
  }

  await supabase.auth.signOut();
  await clearPermissionCacheCookie();
  const cookieStore = await cookies();
  cookieStore.delete(IDLE_ACTIVITY_COOKIE);
  redirect(`${AUTH_ROUTES.login}?signedOut=1`);
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: getAuthErrorMessage("VALIDATION_ERROR"),
    };
  }

  const emailInput = parsed.data.email.trim().toLowerCase();
  const ctx = await getRequestAuditContext();

  try {
    assertRateLimit({
      key: `forgot-password:${hashPasswordResetToken(`${ctx.ipAddress ?? "unknown"}:${emailInput}`)}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    assertRateLimit({
      key: `forgot-password-email:${hashPasswordResetToken(emailInput)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
  } catch {
    return {
      success: false,
      error: "RATE_LIMITED",
      message: getAuthErrorMessage("RATE_LIMITED"),
    };
  }

  const supabase = await createClient();
  const sendResult = await sendHrmsPasswordResetEmail(emailInput);

  if (!sendResult.ok && sendResult.errorCode === "RATE_LIMITED") {
    return {
      success: false,
      error: "RATE_LIMITED",
      message: sendResult.message,
    };
  }

  if (!sendResult.ok) {
    console.error("[forgotPasswordAction] password reset email failed", {
      emailInput,
      errorCode: sendResult.errorCode,
    });
  }

  const auditEmail = (await findEligiblePasswordResetTarget(emailInput)) ?? emailInput;

  await writeApplicationAudit(supabase, {
    organizationId: null,
    module: "dashboard",
    action: "password_reset",
    description: `Password reset requested for ${auditEmail}`,
    recordId: auditEmail,
    priority: "high",
    ...ctx,
  });

  return {
    success: true,
    redirectTo: AUTH_ROUTES.forgotPassword,
  };
}

export async function requestPasswordResetEmailAction(): Promise<AuthActionResult> {
  const dailyLimitMessage =
    "You've reached today's password reset limit (3 times). For your account's security, please try again tomorrow. If you still need help, contact your HR administrator.";

  try {
    const profile = await requireAuthenticatedProfile();
    const email = await resolveApprovedLoginEmail(profile.email);
    const supabase = await createClient();
    const ctx = await getRequestAuditContext();

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dayStart);
    endOfDay.setHours(23, 59, 59, 999);
    const msUntilEndOfDay = Math.max(endOfDay.getTime() - Date.now(), 60_000);
    const dailyLimit = 3;

    // Persistent daily check (admin client — users may lack audit.view RLS).
    // Scoped strictly to the authenticated user id from the session profile.
    const admin = createAdminClient();
    const { count: resetsToday, error: countError } = await admin
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.userId)
      .eq("action", "password_reset")
      .eq("module", "settings")
      .gte("occurred_at", dayStart.toISOString())
      .is("deleted_at", null)
      .is("archived_at", null);

    if (countError) {
      console.error(
        "[requestPasswordResetEmailAction] daily limit count failed:",
        countError.message,
      );
    }

    if (!countError && (resetsToday ?? 0) >= dailyLimit) {
      return {
        success: false,
        error: "RATE_LIMITED",
        message: dailyLimitMessage,
      };
    }

    // In-process guard for rapid repeat clicks on the same instance.
    try {
      assertRateLimit({
        key: `settings-password-reset:${profile.userId}`,
        limit: dailyLimit,
        windowMs: msUntilEndOfDay,
      });
    } catch {
      return {
        success: false,
        error: "RATE_LIMITED",
        message: dailyLimitMessage,
      };
    }

    await writeApplicationAudit(supabase, {
      organizationId: profile.employee?.organizationId ?? null,
      module: "settings",
      action: "password_reset",
      description: `Password reset requested from settings for ${email}`,
      recordId: email,
      priority: "high",
      ...ctx,
    });

    const sendResult = await sendHrmsPasswordResetEmail(email);
    if (!sendResult.ok) {
      return {
        success: false,
        error: sendResult.errorCode,
        message: sendResult.message,
      };
    }

    return {
      success: true,
      redirectTo: "",
    };
  } catch {
    return {
      success: false,
      error: "SERVER_ERROR",
      message: getAuthErrorMessage("SERVER_ERROR"),
    };
  }
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message;
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: firstError ?? getAuthErrorMessage("VALIDATION_ERROR"),
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "RESET_LINK_INVALID",
      message: getAuthErrorMessage("RESET_LINK_INVALID"),
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    const errorCode = mapSupabaseAuthError(error.message);
    console.error("[resetPasswordAction] updateUser failed", {
      userId: user.id,
      code: errorCode,
      message: error.message,
    });
    return {
      success: false,
      error: errorCode,
      message: getAuthErrorMessage(errorCode),
    };
  }

  const email = user.email ?? "";

  try {
    await acceptInvitationOnPasswordSet(supabase, user.id, email);
  } catch (inviteError) {
    console.error("[auth] invitation acceptance failed", {
      userId: user.id,
      name: inviteError instanceof Error ? inviteError.name : "unknown",
      message: inviteError instanceof Error ? inviteError.message : "unknown",
    });
    await supabase.auth.signOut();
    return {
      success: false,
      error: "RESET_LINK_INVALID",
      message: getAuthErrorMessage("RESET_LINK_INVALID"),
    };
  }

  const now = new Date().toISOString();
  try {
    const admin = createAdminClient();
    await admin
      .schema("hrms")
      .from("employees")
      .update({ password_last_reset_at: now, updated_at: now })
      .eq("user_id", user.id)
      .is("deleted_at", null);
  } catch (employeeUpdateError) {
    console.error("[resetPasswordAction] password_last_reset_at update failed", {
      userId: user.id,
      message:
        employeeUpdateError instanceof Error
          ? employeeUpdateError.message
          : "unknown",
    });
  }

  await supabase.auth.signOut();

  return {
    success: true,
    redirectTo: `${AUTH_ROUTES.login}?passwordUpdated=1${email ? `&email=${encodeURIComponent(email)}` : ""}`,
  };
}
