/**
 * Soft-delete this employee's leave requests and zero used/pending ledger days.
 * Usage: node scripts/hr-data-migration/reset-employee-leave.mjs IF2026009
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function admin(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  const codeArg = (process.argv[2] ?? "").trim().toUpperCase();
  if (!codeArg) {
    throw new Error("Usage: node scripts/hr-data-migration/reset-employee-leave.mjs IF2026xxx");
  }
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = admin(url, key);
  const now = new Date().toISOString();

  const { data: employees, error: employeeError } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, employee_code, first_name, last_name")
    .eq("employee_code", codeArg)
    .is("deleted_at", null);

  if (employeeError) throw new Error(employeeError.message);
  if (!employees?.length) {
    throw new Error(`No employee found for ${codeArg}`);
  }

  const unique = [...new Map(employees.map((row) => [row.id, row])).values()];
  console.log(
    "Resetting leave for",
    unique.map((row) => `${row.employee_code} ${row.first_name} ${row.last_name}`).join(", "),
  );

  for (const employee of unique) {
    const { data: requests, error: requestError } = await sb
      .schema("hrms")
      .from("leave_requests")
      .select("id, start_date, end_date, leave_status")
      .eq("employee_id", employee.id)
      .is("deleted_at", null);

    if (requestError) throw new Error(requestError.message);

    const requestIds = (requests ?? []).map((row) => row.id);
    if (requestIds.length) {
      const { error: approvalError } = await sb
        .schema("hrms")
        .from("leave_approvals")
        .update({ deleted_at: now, status: "inactive", updated_at: now })
        .in("leave_request_id", requestIds)
        .is("deleted_at", null);
      if (approvalError) throw new Error(approvalError.message);

      const { error: deleteError } = await sb
        .schema("hrms")
        .from("leave_requests")
        .update({
          deleted_at: now,
          leave_status: "cancelled",
          status: "inactive",
          updated_at: now,
        })
        .in("id", requestIds)
        .is("deleted_at", null);
      if (deleteError) throw new Error(deleteError.message);
    }

    const { data: balances, error: balanceError } = await sb
      .schema("hrms")
      .from("leave_balances")
      .select("id, allocated_days")
      .eq("employee_id", employee.id)
      .is("deleted_at", null);
    if (balanceError) throw new Error(balanceError.message);

    for (const row of balances ?? []) {
      const allocated = Number(row.allocated_days ?? 0);
      const { error: updateError } = await sb
        .schema("hrms")
        .from("leave_balances")
        .update({
          used_days: 0,
          pending_days: 0,
          balance_days: allocated,
          updated_at: now,
        })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
    }

    console.log(
      `${employee.employee_code}: cancelled ${requestIds.length} request(s), reset ${balances?.length ?? 0} balance row(s)`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
