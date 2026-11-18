import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isTransientAuthFailure } from "@/lib/supabase/auth-failure";
import { createBoundedFetch } from "@/lib/supabase/bounded-fetch";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";

/** Bound fetch timeout for Supabase auth in middleware (allows token refresh to complete cleanly). */
export const MIDDLEWARE_SUPABASE_FETCH_TIMEOUT_MS = 15_000;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    return { supabase: null, supabaseResponse, user: null, authUnavailable: false };
  }

  try {
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: {
        fetch: createBoundedFetch(MIDDLEWARE_SUPABASE_FETCH_TIMEOUT_MS),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    // Middleware only needs the verified subject for portal routing. getClaims
    // verifies asymmetric JWTs locally (using cached JWKS) and still falls back
    // to Auth verification for symmetric signing keys.
    const { data: verifiedJwt, error } = await supabase.auth.getClaims();
    const userId =
      typeof verifiedJwt?.claims.sub === "string"
        ? verifiedJwt.claims.sub
        : null;

    // A 5xx/429/transport error means Supabase never decided anything about this
    // session. Report it separately so the caller does not treat it as "signed out".
    if (!userId && isTransientAuthFailure(error)) {
      console.error("[middleware] auth service unreachable; preserving session", {
        name: error?.name,
        status: error?.status,
        message: error?.message,
      });
      return { supabase, supabaseResponse, userId: null, authUnavailable: true };
    }

    return { supabase, supabaseResponse, userId, authUnavailable: false };
  } catch (error) {
    console.error("[middleware] session update failed or timed out", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });
    // Claims verification returns auth denials rather than throwing, so reaching
    // this catch means transport/config failure — never a decision about session validity.
    return { supabase: null, supabaseResponse, userId: null, authUnavailable: true };
  }
}
