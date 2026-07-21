import { createClient } from "@/lib/supabase/client";
import { getPasswordResetRedirectTo } from "@/lib/auth/reset-redirect";

export async function sendPasswordResetEmail(email: string) {
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectTo(),
  });
}
