/**
 * Inspect leave data for it@ifranchise.in (read-only).
 * Usage: npx tsx scripts/inspect-it-leave-balances.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const hrms = admin.schema("hrms");

async function main() {
  const { data: emp, error: empErr } = await hrms
    .from("employees")
    .select("id, first_name, last_name, email, employee_code")
    .ilike("email", "it@ifranchise.in")
    .is("deleted_at", null)
    .maybeSingle();
  if (empErr) throw empErr;
  if (!emp) {
    console.log("Employee not found");
    return;
  }
  console.log("EMPLOYEE", emp);

  const { data: balances } = await hrms
    .from("leave_balances")
    .select(
      "id, balance_year, allocated_days, used_days, pending_days, balance_days, accrued_through_month, leave_type_id, leave_types:leave_type_id(code,name)",
    )
    .eq("employee_id", emp.id)
    .is("deleted_at", null)
    .order("balance_year", { ascending: false });
  console.log("BALANCES", JSON.stringify(balances, null, 2));

  const { data: requests } = await hrms
    .from("leave_requests")
    .select(
      "id, leave_status, start_date, end_date, total_days, paid_days, lop_days, leave_types:leave_type_id(code)",
    )
    .eq("employee_id", emp.id)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .limit(30);
  console.log("RECENT_REQUESTS", JSON.stringify(requests, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
