import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/env";

/** Keep Edge middleware under Vercel's invocation limit even if Supabase stalls. */
export const MIDDLEWARE_SUPABASE_FETCH_TIMEOUT_MS = 4_000;

function createBoundedFetch(timeoutMs: number): typeof fetch {
  return (input, init = {}) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      init.signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;

    return fetch(input, {
      ...init,
      signal,
    });
  };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    return { supabase: null, supabaseResponse, user: null };
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { supabase, supabaseResponse, user };
  } catch (error) {
    console.error("[middleware] session update failed or timed out", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });
    return { supabase: null, supabaseResponse, user: null };
  }
}
