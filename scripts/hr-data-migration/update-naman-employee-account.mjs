/**
 * Update Naman Thapliyal (IF2026023) identity, joining/probation, and bank details.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CODE = "IF2026023";

async function lookupIfsc(code) {
  try {
    const response = await fetch(`https://ifsc.razorpay.com/${code}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return {
      bankName: String(body.BANK ?? "").trim() || "State Bank of India",
      branchName: String(body.BRANCH ?? "").trim() || null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: employee, error: ee } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, date_of_joining, probation_end_date")
    .eq("employee_code", CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (ee || !employee) throw new Error(ee?.message || "Naman not found");

  const now = new Date().toISOString();
  const ifsc = "SBIN0005477";
  const institution = (await lookupIfsc(ifsc)) ?? {
    bankName: "State Bank of India",
    branchName: null,
  };

  const { error: empErr } = await sb
    .schema("hrms")
    .from("employees")
    .update({
      date_of_joining: "2026-10-14",
      probation_end_date: "2027-01-14",
      updated_at: now,
    })
    .eq("id", employee.id);
  if (empErr) throw new Error(`employee: ${empErr.message}`);

  const { data: profile } = await sb
    .schema("hrms")
    .from("employee_profiles")
    .select("id")
    .eq("employee_id", employee.id)
    .maybeSingle();

  const profilePayload = {
    date_of_birth: "2003-11-07",
    pan_number: "CIJPT4050J",
    aadhaar_number: "977069298586",
    status: "active",
    updated_at: now,
  };
  if (profile?.id) {
    const { error } = await sb
      .schema("hrms")
      .from("employee_profiles")
      .update(profilePayload)
      .eq("id", profile.id);
    if (error) throw new Error(`profile: ${error.message}`);
  } else {
    const { error } = await sb.schema("hrms").from("employee_profiles").insert({
      employee_id: employee.id,
      ...profilePayload,
    });
    if (error) throw new Error(`profile insert: ${error.message}`);
  }

  const { data: bank } = await sb
    .schema("hrms")
    .from("bank_accounts")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  const holder = `${employee.first_name} ${employee.last_name}`.trim();
  const bankPayload = {
    bank_name: institution.bankName,
    account_holder_name: holder,
    account_number: "33599494616",
    ifsc_code: ifsc,
    branch_name: institution.branchName,
    account_type: "salary",
    is_primary: true,
    status: "active",
    updated_at: now,
  };
  if (bank?.id) {
    const { error } = await sb.schema("hrms").from("bank_accounts").update(bankPayload).eq("id", bank.id);
    if (error) throw new Error(`bank: ${error.message}`);
  } else {
    const { error } = await sb.schema("hrms").from("bank_accounts").insert({
      employee_id: employee.id,
      ...bankPayload,
    });
    if (error) throw new Error(`bank insert: ${error.message}`);
  }

  const { data: structures } = await sb
    .schema("hrms")
    .from("salary_structures")
    .select("id, components")
    .eq("employee_id", employee.id)
    .is("deleted_at", null);
  for (const row of structures ?? []) {
    const components = { ...(row.components ?? {}) };
    components.pan_number = "CIJPT4050J";
    components.aadhaar_number = "977069298586";
    components.probation_end_date = "2027-01-14";
    const { error } = await sb
      .schema("hrms")
      .from("salary_structures")
      .update({ components, updated_at: now })
      .eq("id", row.id);
    if (error) throw new Error(`structure: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        employee: CODE,
        joining: "2026-10-14",
        probationEnds: "2027-01-14",
        dob: "2003-11-07",
        pan: "CIJPT4050J",
        aadhaar: "977069298586",
        bankName: institution.bankName,
        branchName: institution.branchName,
        accountNumber: "33599494616",
        ifsc,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
