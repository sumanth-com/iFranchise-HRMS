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
import { getRoleRedirectPath } from "@/lib/auth/redirect";
import { siteConfig } from "@/config/site";
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

  const { email, password, rememberMe } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    return {
      success: false,
      error: mapSupabaseAuthError(authError?.message ?? ""),
      message:
        mapSupabaseAuthError(authError?.message ?? "") === "INVALID_CREDENTIALS"
          ? getAuthErrorMessage("INVALID_CREDENTIALS")
          : getAuthErrorMessage("SERVER_ERROR"),
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

  return {
    success: true,
    redirectTo: getRoleRedirectPath(profileResult.profile.roles),
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
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

  const supabase = await createClient();
  const redirectTo = `${siteConfig.url}${AUTH_ROUTES.callback}?next=${AUTH_ROUTES.resetPassword}`;

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );

  if (error) {
    return {
      success: false,
      error: mapSupabaseAuthError(error.message),
      message: getAuthErrorMessage("SERVER_ERROR"),
    };
  }

  return {
    success: true,
    redirectTo: AUTH_ROUTES.forgotPassword,
  };
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

  return {
    success: true,
    redirectTo: AUTH_ROUTES.login,
  };
}
