import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { AUTH_ROUTES } from "@/lib/auth/constants";
import { validateInvitationForUser } from "@/lib/employees/services/employee-account";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";

function buildAuthErrorRedirect(
  origin: string,
  next: string,
  reason: "expired" | "invalid",
) {
  const safeNext = getSafeRedirectPath(next, AUTH_ROUTES.dashboard);
  if (
    safeNext === AUTH_ROUTES.resetPassword ||
    safeNext.startsWith(`${AUTH_ROUTES.resetPassword}?`)
  ) {
    const redirectUrl = new URL(AUTH_ROUTES.resetPassword, origin);
    redirectUrl.searchParams.set("error", reason);
    return NextResponse.redirect(redirectUrl);
  }

  // Land on the plain login screen; the failure reason is not surfaced to the user.
  return NextResponse.redirect(new URL(AUTH_ROUTES.login, origin));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = getSafeRedirectPath(searchParams.get("next"), AUTH_ROUTES.dashboard);
  let email: string | null = null;

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      return buildAuthErrorRedirect(origin, next, "invalid");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    if (user && type === "invite" && email) {
      const validation = await validateInvitationForUser(supabase, user.id, email);
      if (!validation.valid) {
        return buildAuthErrorRedirect(origin, next, validation.reason);
      }
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return buildAuthErrorRedirect(origin, next, "invalid");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    if (user && type === "invite" && email) {
      const validation = await validateInvitationForUser(supabase, user.id, email);
      if (!validation.valid) {
        return buildAuthErrorRedirect(origin, next, validation.reason);
      }
    }
  }

  const redirectUrl = new URL(next, origin);
  const isInviteFlow = type === "invite";
  const isResetPasswordFlow =
    redirectUrl.pathname === AUTH_ROUTES.resetPassword || isInviteFlow;

  if (email && isResetPasswordFlow) {
    if (!redirectUrl.searchParams.has("email")) {
      redirectUrl.searchParams.set("email", email);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const displayName =
      typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;
    if (displayName && !redirectUrl.searchParams.has("name")) {
      redirectUrl.searchParams.set("name", displayName);
    }
    if (isInviteFlow && !redirectUrl.searchParams.has("invite")) {
      redirectUrl.searchParams.set("invite", "1");
    }
  }

  return NextResponse.redirect(redirectUrl);
}
