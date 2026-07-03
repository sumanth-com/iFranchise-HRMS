import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? AUTH_ROUTES.dashboard;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const redirectUrl = new URL(AUTH_ROUTES.login, origin);
      redirectUrl.searchParams.set("expired", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const redirectUrl = new URL(next, origin);
  return NextResponse.redirect(redirectUrl);
}
