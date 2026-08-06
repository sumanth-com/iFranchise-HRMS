import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

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

/** One Supabase client + verified user per RSC request (avoids duplicate auth round-trips). */
export const getServerSession = cache(async function getServerSession(): Promise<ServerSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  return { supabase, user };
});
