import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import {
  AuthServiceUnavailableError,
  isTransientAuthFailure,
} from "@/lib/supabase/auth-failure";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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

/**
 * One Supabase client + verified user per RSC request (avoids duplicate auth round-trips).
 *
 * Returns null only when auth definitively reports no valid session. If auth was
 * unreachable it throws {@link AuthServiceUnavailableError} instead, so callers show a
 * generic retry state rather than redirecting an authenticated user to /login.
 */
export const getServerSession = cache(async function getServerSession(): Promise<ServerSession | null> {
  const supabase = await createClient();

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isTransientAuthFailure(error)) {
        console.error("[auth] session verification unavailable", {
          name: error.name,
          status: error.status,
          message: error.message,
        });
        throw new AuthServiceUnavailableError();
      }
      return null;
    }

    user = data.user;
  } catch (error) {
    if (error instanceof AuthServiceUnavailableError) throw error;

    console.error("[auth] session verification failed", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });
    throw new AuthServiceUnavailableError();
  }

  if (!user?.email) {
    return null;
  }

  return { supabase, user };
});
