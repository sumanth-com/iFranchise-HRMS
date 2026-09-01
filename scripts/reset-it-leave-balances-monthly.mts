/**
 * Reset Casual/Earned leave for it@ifranchise.in:
 * CL and EL each have 1 day available for the current month (1 credit per month).
 *
 * Usage: npx tsx scripts/reset-it-leave-balances-monthly.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const TARGET_EMAIL = "it@ifranchise.in";
const LEDGER_CODES = new Set(["CL", "EL"]);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const hrms = admin.schema("hrms");

function currentMonthStart() {
  const local = new Date();
  const ly = local.getFullYear();
  const lm = String(local.getMonth() + 1).padStart(2, "0");
  return `${ly}-${lm}-01`;
}

async function main() {
  const monthStart = currentMonthStart();
  const year = new Date().getFullYear();
  const { data: emp, error: empErr } = await hrms
    .from("employees")
    .select("id, email, first_name, last_name, employee_code, organization_id")
    .ilike("email", TARGET_EMAIL)
    .is("deleted_at", null)
    .maybeSingle();

  if (empErr) throw new Error(empErr.message);
  if (!emp) throw new Error(`Employee ${TARGET_EMAIL} not found`);

  console.log("Target employee:", emp);

  const { data: balances, error: balErr } = await hrms
    .from("leave_balances")
    .select(
      "id, balance_year, allocated_days, used_days, pending_days, balance_days, accrued_through_month, leave_type_id, leave_types:leave_type_id(code,name)",
    )
    .eq("employee_id", emp.id)
    .eq("balance_year", year)
    .is("deleted_at", null);

  if (balErr) throw new Error(balErr.message);

  const clEl = (balances ?? []).filter((row) => {
    const code = String(
      (Array.isArray(row.leave_types) ? row.leave_types[0]?.code : row.leave_types?.code) ?? "",
    ).toUpperCase();
    return LEDGER_CODES.has(code);
  });

  console.log(
    "Before reset:",
    clEl.map((r) => ({
      code: Array.isArray(r.leave_types) ? r.leave_types[0]?.code : r.leave_types?.code,
      allocated: r.allocated_days,
      used: r.used_days,
      pending: r.pending_days,
      balance: r.balance_days,
      accrued: r.accrued_through_month,
    })),
  );

  const typeIds = clEl.map((r) => r.leave_type_id);
  if (typeIds.length > 0) {
    const now = new Date().toISOString();
    const { data: open, error: openErr } = await hrms
      .from("leave_requests")
      .select("id, leave_status, leave_type_id")
      .eq("employee_id", emp.id)
      .in("leave_status", ["pending", "approved"])
      .in("leave_type_id", typeIds)
      .gte("start_date", `${year}-01-01`)
      .lte("end_date", `${year}-12-31`)
      .is("deleted_at", null);

    if (openErr) throw new Error(openErr.message);

    if (open && open.length > 0) {
      const { error: cancelErr } = await hrms
        .from("leave_requests")
        .update({
          leave_status: "cancelled",
          updated_at: now,
        })
        .in(
          "id",
          open.map((p) => p.id),
        );
      if (cancelErr) throw new Error(cancelErr.message);
      console.log(
        "Cancelled CL/EL requests for test reset:",
        open.map((p) => ({ id: p.id, status: p.leave_status })),
      );
    } else {
      console.log("No pending/approved CL/EL requests to cancel.");
    }
  }

  for (const row of clEl) {
    const { error: updErr } = await hrms
      .from("leave_balances")
      .update({
        allocated_days: 1,
        used_days: 0,
        pending_days: 0,
        balance_days: 1,
        accrued_through_month: monthStart,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("employee_id", emp.id);

    if (updErr) throw new Error(updErr.message);
  }

  const { data: after } = await hrms
    .from("leave_balances")
    .select(
      "allocated_days, used_days, pending_days, balance_days, accrued_through_month, leave_types:leave_type_id(code)",
    )
    .eq("employee_id", emp.id)
    .eq("balance_year", year)
    .in(
      "id",
      clEl.map((r) => r.id),
    );

  console.log("After reset:", JSON.stringify(after, null, 2));
  console.log("Done. No other employees modified.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
