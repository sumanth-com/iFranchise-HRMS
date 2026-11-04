import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const env = loadEnv(ROOT);
const { url, key } = requireSupabaseEnv(env);
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: emp, error } = await sb
  .schema("hrms")
  .from("employees")
  .select(
    "id, employee_code, employment_status, date_of_joining, full_time_effective_date, probation_end_date, employment_type_id, employment_types:employment_type_id (code, name, is_full_time)",
  )
  .eq("employee_code", "IF2026009")
  .maybeSingle();
if (error) throw error;

const { data: balances } = await sb
  .schema("hrms")
  .from("leave_balances")
  .select(
    "balance_year, allocated_days, used_days, pending_days, balance_days, accrued_through_month, leave_types:leave_type_id (code, name, days_per_year)",
  )
  .eq("employee_id", emp.id)
  .is("deleted_at", null)
  .order("balance_year");

const { data: types } = await sb
  .schema("hrms")
  .from("leave_types")
  .select("id, code, name, days_per_year, is_paid")
  .is("deleted_at", null);

console.log(JSON.stringify({ emp, balances, types }, null, 2));
