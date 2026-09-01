/**
 * Clean September (current month) leave history for it@ifranchise.in only:
 * - Soft-delete every leave request that overlaps this month (any type/status)
 * - Reset CL and EL to 1 available day for this month
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

function currentMonthRange() {
  const local = new Date();
  const year = local.getFullYear();
  const month = local.getMonth() + 1;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { year, month, start, end, monthStart: start };
}

async function main() {
  const { year, start, end, monthStart } = currentMonthRange();
  const now = new Date().toISOString();

  const { data: emp, error: empErr } = await hrms
    .from("employees")
    .select("id, email, first_name, last_name, employee_code, organization_id")
    .ilike("email", TARGET_EMAIL)
    .is("deleted_at", null)
    .maybeSingle();

  if (empErr) throw new Error(empErr.message);
  if (!emp) throw new Error(`Employee ${TARGET_EMAIL} not found`);

  console.log("Target employee:", emp);
  console.log("Cleaning leave history for:", start, "→", end);

  const { data: monthRequests, error: reqErr } = await hrms
    .from("leave_requests")
    .select("id, leave_status, start_date, end_date, total_days, leave_type_id")
    .eq("employee_id", emp.id)
    .lte("start_date", end)
    .gte("end_date", start)
    .is("deleted_at", null);

  if (reqErr) throw new Error(reqErr.message);

  const requestIds = (monthRequests ?? []).map((row) => row.id);
  console.log(
    "September requests to remove:",
    (monthRequests ?? []).map((row) => ({
      id: row.id,
      status: row.leave_status,
      start: row.start_date,
      end: row.end_date,
      days: row.total_days,
    })),
  );

  if (requestIds.length > 0) {
    const { error: approvalErr } = await hrms
      .from("leave_approvals")
      .update({
        approval_status: "skipped",
        deleted_at: now,
        updated_at: now,
      })
      .in("leave_request_id", requestIds)
      .eq("approval_status", "pending")
      .is("deleted_at", null);
    if (approvalErr) throw new Error(approvalErr.message);

    const { error: deleteErr } = await hrms
      .from("leave_requests")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .in("id", requestIds)
      .eq("employee_id", emp.id);
    if (deleteErr) throw new Error(deleteErr.message);
    console.log(`Soft-deleted ${requestIds.length} leave request(s) for this month.`);
  } else {
    console.log("No leave requests overlapping this month.");
  }

  const { data: balances, error: balErr } = await hrms
    .from("leave_balances")
    .select(
      "id, allocated_days, used_days, pending_days, balance_days, accrued_through_month, leave_type_id, leave_types:leave_type_id(code,name)",
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

  for (const row of clEl) {
    const { error: updErr } = await hrms
      .from("leave_balances")
      .update({
        allocated_days: 1,
        used_days: 0,
        pending_days: 0,
        balance_days: 1,
        accrued_through_month: monthStart,
        updated_at: now,
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

  console.log("CL/EL after reset:", JSON.stringify(after, null, 2));
  console.log("Done. Only this employee and this month were cleaned.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
