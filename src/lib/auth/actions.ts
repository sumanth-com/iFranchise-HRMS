"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEFAULT_SESSION_MAX_AGE,
  REMEMBER_ME_MAX_AGE,
  AUTH_ROUTES,
} from "@/lib/auth/constants";
import {
  getAuthErrorMessage,
  mapSupabaseAuthError,
} from "@/lib/auth/errors";
import { loadUserProfile } from "@/lib/auth/profile-loader";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirect";
import { resolveApprovedLoginEmail } from "@/lib/auth/login-email";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { recordEmployeeSuccessfulLogin, acceptInvitationOnPasswordSet } from "@/lib/employees/services/employee-account";
import { resolveUserPortalRoute } from "@/lib/auth/permission-resolver";
import { getPortalRedirectPath } from "@/lib/auth/portals";
import { recordUserLoginSession } from "@/lib/ceo/services/ceo-profile-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import type { AuthActionResult } from "@/types/auth";

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
    const email = await resolveApprovedLoginEmail(rawEmail);
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      const mappedError = mapSupabaseAuthError(authError?.message ?? "");
      const ctx = await getRequestAuditContext();
      await writeApplicationAudit(supabase, {
        organizationId: null,
        module: "dashboard",
        action: "login",
        description: `Failed login attempt for ${email}`,
        recordId: email,
        eventStatus: "failed",
        priority: "high",
        reason: authError?.message,
        ...ctx,
      });

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

    try {
      await recordEmployeeSuccessfulLogin(supabase, authData.user.id, email);
    } catch (loginRecordError) {
      console.error("[loginAction] Failed to record successful login:", loginRecordError);
    }

    const ctx = await getRequestAuditContext();

    try {
      await recordUserLoginSession(supabase, {
        organizationId: profileResult.profile.employee.organizationId,
        userId: authData.user.id,
        employeeId: profileResult.profile.employee.id,
        deviceType: ctx.deviceType,
        browser: ctx.browser,
        operatingSystem: ctx.operatingSystem,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    } catch (sessionError) {
      console.error("[loginAction] Failed to record login session:", sessionError);
    }

    await writeApplicationAudit(supabase, {
      organizationId: profileResult.profile.employee.organizationId,
      module: "dashboard",
      action: "login",
      description: `User ${email} logged in successfully`,
      recordId: authData.user.id,
      priority: "medium",
      ...ctx,
      metadata: { email },
    });

    const portalRoute = await resolveUserPortalRoute(supabase, authData.user.id);

    return {
      success: true,
      redirectTo: getAuthenticatedRedirectPath(
        profileResult.profile.roles,
        profileResult.profile.permissionCodes,
        portalRoute,
      ),
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

  const email = await resolveApprovedLoginEmail(parsed.data.email);
  const supabase = await createClient();

  const ctx = await getRequestAuditContext();
  await writeApplicationAudit(supabase, {
    organizationId: null,
    module: "dashboard",
    action: "password_reset",
    description: `Password reset requested for ${email}`,
    recordId: email,
    priority: "high",
    ...ctx,
  });

  return {
    success: true,
    redirectTo: AUTH_ROUTES.forgotPassword,
    resolvedEmail: email,
  };
}

export async function requestPasswordResetEmailAction(): Promise<AuthActionResult> {
  try {
    const profile = await requireAuthenticatedProfile();
    const email = await resolveApprovedLoginEmail(profile.email);
    const supabase = await createClient();

    const ctx = await getRequestAuditContext();
    await writeApplicationAudit(supabase, {
      organizationId: profile.employee?.organizationId ?? null,
      module: "settings",
      action: "password_reset",
      description: `Password reset requested from settings for ${email}`,
      recordId: email,
      priority: "high",
      ...ctx,
    });

    return {
      success: true,
      redirectTo: "",
      resolvedEmail: email,
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
    return {
      success: false,
      error: mapSupabaseAuthError(error.message),
      message: getAuthErrorMessage("SERVER_ERROR"),
    };
  }

  const email = user.email ?? "";

  try {
    await acceptInvitationOnPasswordSet(supabase, user.id, email);
  } catch (inviteError) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "RESET_LINK_INVALID",
      message:
        inviteError instanceof Error
          ? inviteError.message
          : getAuthErrorMessage("RESET_LINK_INVALID"),
    };
  }

  await supabase.auth.signOut();

  return {
    success: true,
    redirectTo: `${AUTH_ROUTES.login}?passwordUpdated=1${email ? `&email=${encodeURIComponent(email)}` : ""}`,
  };
}
