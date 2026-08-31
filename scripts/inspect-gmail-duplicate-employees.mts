/**
 * Read-only: list @gmail.com employees (incl soft-deleted) and related candidates.
 * Usage: npx tsx scripts/inspect-gmail-duplicate-employees.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const hrms = supabase.schema("hrms");

async function main() {
  const { data: it, error: itErr } = await hrms
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, status, employment_status, account_status, user_id, deleted_at",
    )
    .eq("email", "it@ifranchise.in")
    .maybeSingle();
  if (itErr) throw itErr;

  const { data: gmail, error: gmailErr } = await hrms
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, status, employment_status, account_status, user_id, deleted_at, created_at",
    )
    .ilike("email", "%@gmail.com")
    .order("email");
  if (gmailErr) throw gmailErr;

  const { data: sumanth, error: sumanthErr } = await hrms
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, status, employment_status, account_status, user_id, deleted_at, created_at",
    )
    .or(
      "email.ilike.%sumanth%,first_name.ilike.%Sumanth%,employee_code.ilike.IF-EMP%",
    )
    .order("email");
  if (sumanthErr) throw sumanthErr;

  const { data: company, error: companyErr } = await hrms
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, deleted_at, account_status",
    )
    .ilike("email", "%@ifranchise.in")
    .is("deleted_at", null)
    .order("email");
  if (companyErr) throw companyErr;

  console.log("=== it@ifranchise.in ===");
  console.log(JSON.stringify(it, null, 2));
  console.log("\n=== All @gmail.com (incl deleted) ===");
  console.log(JSON.stringify(gmail, null, 2));
  console.log(`gmail count: ${gmail?.length ?? 0}`);
  console.log("\n=== Sumanth / IF-EMP candidates ===");
  console.log(JSON.stringify(sumanth, null, 2));
  console.log("\n=== Active @ifranchise.in ===");
  console.log(JSON.stringify(company, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
