/**
 * One-off: reset ONLY Casual/Earned leave_balances for it@ifranchise.in
 * to monthly-accrual starting state (CL=1, EL=1 for current month).
 * Does not touch profile, auth, payroll, attendance, or other employees.
 *
 * Usage: npx tsx scripts/reset-it-leave-balances-monthly.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const TARGET_EMAIL = "it@ifranchise.in";
const MONTHLY_CODES = new Set(["CL", "EL"]);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const hrms = admin.schema("hrms");

function currentMonthStart() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  // Use local calendar month for leave (IST org) — mirror app getTodayDateString zone via local date.
  const local = new Date();
  const ly = local.getFullYear();
  const lm = String(local.getMonth() + 1).padStart(2, "0");
  return `${ly}-${lm}-01`;
}

async function main() {
  const monthStart = currentMonthStart();
  const { data: emp, error: empErr } = await hrms
    .from("employees")
    .select("id, email, first_name, last_name, employee_code")
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
    .eq("balance_year", new Date().getFullYear())
    .is("deleted_at", null);

  if (balErr) throw new Error(balErr.message);

  const clEl = (balances ?? []).filter((row) => {
    const code = String(
      (Array.isArray(row.leave_types) ? row.leave_types[0]?.code : row.leave_types?.code) ?? "",
    ).toUpperCase();
    return MONTHLY_CODES.has(code);
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

  // Cancel only pending CL/EL requests so the new ledger (pending=0) stays consistent.
  // Approved/rejected/cancelled history is left intact for the calendar.
  const typeIds = clEl.map((r) => r.leave_type_id);
  if (typeIds.length > 0) {
    const now = new Date().toISOString();
    const { data: pending, error: pendingErr } = await hrms
      .from("leave_requests")
      .select("id, leave_status, leave_type_id")
      .eq("employee_id", emp.id)
      .eq("leave_status", "pending")
      .in("leave_type_id", typeIds)
      .is("deleted_at", null);

    if (pendingErr) throw new Error(pendingErr.message);

    if (pending && pending.length > 0) {
      const { error: cancelErr } = await hrms
        .from("leave_requests")
        .update({
          leave_status: "cancelled",
          updated_at: now,
        })
        .in(
          "id",
          pending.map((p) => p.id),
        );
      if (cancelErr) throw new Error(cancelErr.message);
      console.log(
        "Cancelled pending CL/EL requests (leave-balance reset only):",
        pending.map((p) => p.id),
      );
    } else {
      console.log("No pending CL/EL requests to cancel.");
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
    .eq("balance_year", new Date().getFullYear())
    .in(
      "id",
      clEl.map((r) => r.id),
    );

  console.log("After reset:", JSON.stringify(after, null, 2));
  console.log("Done. No other employees modified. Profile/auth/payroll untouched.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
