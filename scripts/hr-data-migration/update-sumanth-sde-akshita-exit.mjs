/**
 * Sumanth IF2026009: Software Development Engineer (SDE) from full-time date.
 * Akshita IF2026012: former employee from 3 Nov 2026.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SDE_TITLE = "Software Development Engineer (SDE)";
const SUMANTH_CODE = "IF2026009";
const AKSHITA_CODE = "IF2026012";
const AKSHITA_EXIT = "2026-11-03";

function slugify(title) {
  return title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

async function main() {
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date().toISOString();

  const { data: sumanth, error: se } = await sb
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, first_name, last_name, designation_id, full_time_effective_date, employment_status",
    )
    .eq("employee_code", SUMANTH_CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (se || !sumanth) throw new Error(se?.message || "Sumanth not found");

  const { data: designations, error: de } = await sb
    .schema("hrms")
    .from("designations")
    .select("id, title")
    .eq("organization_id", sumanth.organization_id)
    .is("deleted_at", null);
  if (de) throw new Error(de.message);

  let sde = (designations ?? []).find(
    (row) => String(row.title).trim().toLowerCase() === SDE_TITLE.toLowerCase(),
  );
  if (!sde) {
    const { data: created, error: ce } = await sb
      .schema("hrms")
      .from("designations")
      .insert({
        organization_id: sumanth.organization_id,
        title: SDE_TITLE,
        code: `${slugify(SDE_TITLE)}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        status: "active",
        created_at: now,
        updated_at: now,
      })
      .select("id, title")
      .single();
    if (ce || !created) throw new Error(ce?.message || "Failed to create SDE designation");
    sde = created;
  }

  const { error: sumanthErr } = await sb
    .schema("hrms")
    .from("employees")
    .update({
      designation_id: sde.id,
      full_time_effective_date: sumanth.full_time_effective_date || "2026-10-14",
      updated_at: now,
    })
    .eq("id", sumanth.id);
  if (sumanthErr) throw new Error(`Sumanth designation: ${sumanthErr.message}`);

  const { data: akshita, error: ae } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, employment_status, date_of_leaving, status, account_status, user_id")
    .eq("employee_code", AKSHITA_CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (ae || !akshita) throw new Error(ae?.message || "Akshita not found");

  const { error: akshitaErr } = await sb
    .schema("hrms")
    .from("employees")
    .update({
      employment_status: "resigned",
      date_of_leaving: AKSHITA_EXIT,
      status: "inactive",
      account_status: "inactive",
      account_deactivated_at: now,
      updated_at: now,
    })
    .eq("id", akshita.id);
  if (akshitaErr) throw new Error(`Akshita exit: ${akshitaErr.message}`);

  if (akshita.user_id) {
    const { error: banErr } = await sb.auth.admin.updateUserById(akshita.user_id, {
      ban_duration: "876000h",
    });
    if (banErr) {
      console.warn("Akshita auth ban skipped:", banErr.message);
    }
  }

  const { data: sumanthAfter } = await sb
    .schema("hrms")
    .from("employees")
    .select("employee_code, first_name, last_name, full_time_effective_date, designations:designation_id (title)")
    .eq("id", sumanth.id)
    .maybeSingle();
  const { data: akshitaAfter } = await sb
    .schema("hrms")
    .from("employees")
    .select("employee_code, first_name, last_name, employment_status, date_of_leaving, status, account_status")
    .eq("id", akshita.id)
    .maybeSingle();

  console.log(JSON.stringify({ sumanth: sumanthAfter, akshita: akshitaAfter }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
