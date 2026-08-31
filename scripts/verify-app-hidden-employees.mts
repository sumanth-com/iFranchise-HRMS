/**
 * Read-only: verify app-hidden Gmail duplicates vs it@ifranchise.in visibility.
 * Usage: npx tsx scripts/verify-app-hidden-employees.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const hrms = supabase.schema("hrms");

async function main() {
  const { data: it } = await hrms
    .from("employees")
    .select("id, email, employee_code, app_hidden_at, deleted_at")
    .eq("email", "it@ifranchise.in")
    .maybeSingle();

  const { data: hidden } = await hrms
    .from("employees")
    .select("id, email, employee_code, app_hidden_at, deleted_at")
    .not("app_hidden_at", "is", null)
    .order("email");

  const { data: gmailVisible } = await hrms
    .from("employees")
    .select("id, email, employee_code, app_hidden_at")
    .ilike("email", "%@gmail.com")
    .is("deleted_at", null)
    .is("app_hidden_at", null);

  const { data: akshita } = await hrms
    .from("employees")
    .select("id, email, app_hidden_at, deleted_at")
    .eq("email", "akshita.potnuru@ifranchise.in")
    .maybeSingle();

  console.log("IT", it);
  console.log("HIDDEN COUNT", hidden?.length ?? 0);
  console.log(
    "HIDDEN",
    hidden?.map((row) => row.email),
  );
  console.log("GMAIL STILL VISIBLE", gmailVisible);
  console.log("AKSHITA (must remain visible)", akshita);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
