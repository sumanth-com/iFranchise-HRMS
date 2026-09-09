import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import {
  AuthServiceUnavailableError,
  isTransientAuthFailure,
} from "@/lib/supabase/auth-failure";
import { createBoundedFetch } from "@/lib/supabase/bounded-fetch";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Match middleware budget so RSC auth does not hang longer than Edge. */
const SERVER_SUPABASE_FETCH_TIMEOUT_MS = 15_000;
const AUTH_SESSION_MAX_ATTEMPTS = 3;
const AUTH_SESSION_RETRY_DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      fetch: createBoundedFetch(SERVER_SUPABASE_FETCH_TIMEOUT_MS),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll is called from Server Components where cookies cannot be set.
        }
      },
    },
  });
}

export const createClient = cache(createSupabaseServerClient);

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ServerSession = {
  supabase: ServerSupabaseClient;
  user: User;
};

async function verifyUserWithRetry(
  supabase: ServerSupabaseClient,
): Promise<{ user: User | null; definitiveUnauthenticated: boolean }> {
  let lastTransient: unknown = null;

  for (let attempt = 1; attempt <= AUTH_SESSION_MAX_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (!error) {
        return { user: data.user, definitiveUnauthenticated: !data.user };
      }

      if (!isTransientAuthFailure(error)) {
        return { user: null, definitiveUnauthenticated: true };
      }

      lastTransient = error;
      console.error("[auth] session verification transient failure", {
        attempt,
        name: error.name,
        status: error.status,
        message: error.message,
      });
    } catch (error) {
      lastTransient = error;
      console.error("[auth] session verification attempt failed", {
        attempt,
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : "unknown",
      });
    }

    if (attempt < AUTH_SESSION_MAX_ATTEMPTS) {
      await sleep(AUTH_SESSION_RETRY_DELAY_MS * attempt);
    }
  }

  console.error("[auth] session verification unavailable after retries", {
    attempts: AUTH_SESSION_MAX_ATTEMPTS,
    last:
      lastTransient instanceof Error
        ? { name: lastTransient.name, message: lastTransient.message }
        : lastTransient,
  });
  throw new AuthServiceUnavailableError();
}

/**
 * One Supabase client + verified user per RSC request (avoids duplicate auth round-trips).
 *
 * Returns null only when auth definitively reports no valid session. If auth was
 * unreachable it throws {@link AuthServiceUnavailableError} instead, so callers show a
 * generic retry state rather than redirecting an authenticated user to /login.
 */
export const getServerSession = cache(async function getServerSession(): Promise<ServerSession | null> {
  const supabase = await createClient();
  const { user, definitiveUnauthenticated } = await verifyUserWithRetry(supabase);

  if (definitiveUnauthenticated || !user?.email) {
    return null;
  }

  return { supabase, user };
});
