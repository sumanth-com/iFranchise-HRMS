/**
 * Upload src/assets/Naman.jpeg onto Naman Thapiyal (IF2026023) profile storage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireSupabaseEnv } from "./lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CODE = "IF2026023";
const FILE = path.join(ROOT, "src/assets/Naman.jpeg");
const BUCKET = "employee-profile-images";

async function main() {
  if (!fs.existsSync(FILE)) throw new Error(`Missing ${FILE}`);
  const env = loadEnv(ROOT);
  const { url, key } = requireSupabaseEnv(env);
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: employee, error: ee } = await sb
    .schema("hrms")
    .from("employees")
    .select("id, organization_id, first_name, last_name")
    .eq("employee_code", CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (ee || !employee) throw new Error(ee?.message || "Naman not found");

  const storagePath = `${employee.organization_id}/${employee.id}/profile.jpeg`;
  const bytes = fs.readFileSync(FILE);
  const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "86400",
  });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  const now = new Date().toISOString();
  const { data: profile } = await sb
    .schema("hrms")
    .from("employee_profiles")
    .select("id")
    .eq("employee_id", employee.id)
    .maybeSingle();

  if (profile?.id) {
    const { error } = await sb
      .schema("hrms")
      .from("employee_profiles")
      .update({ profile_image_storage_path: storagePath, updated_at: now })
      .eq("id", profile.id);
    if (error) throw new Error(`profile: ${error.message}`);
  } else {
    const { error } = await sb.schema("hrms").from("employee_profiles").insert({
      employee_id: employee.id,
      profile_image_storage_path: storagePath,
      status: "active",
      created_at: now,
      updated_at: now,
    });
    if (error) throw new Error(`profile insert: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        employee: `${employee.first_name} ${employee.last_name}`,
        code: CODE,
        storagePath,
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
