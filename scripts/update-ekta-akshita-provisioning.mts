/**
 * One-off: update Akshita and Ekta provisioning emails + Ekta's HR role.
 *
 * Usage: npx tsx scripts/update-ekta-akshita-provisioning.mts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ORG_ID = "a0000000-0000-4000-8000-000000000001";
const HR_ADMIN_ROLE_ID = "a0000000-0000-4000-8000-000000000102";
const EMPLOYEE_ROLE_ID = "a0000000-0000-4000-8000-000000000104";
const EKTA_EMPLOYEE_ID = "e1000000-0000-4000-8000-000000000001";
const AKSHITA_EMPLOYEE_ID = "e1000000-0000-4000-8000-000000000008";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hrms = admin.schema("hrms");

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < 500) break;
    page += 1;
  }
  return null;
}

async function assertEmailAvailable(employeeId: string, newEmail: string) {
  const { data, error } = await hrms
    .from("employees")
    .select("id, email")
    .eq("organization_id", ORG_ID)
    .ilike("email", newEmail)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  const conflict = (data ?? []).find((row) => row.id !== employeeId);
  if (conflict) {
    throw new Error(`Email ${newEmail} already used by employee ${conflict.id}`);
  }
}

async function updateAuthEmail(userId: string, newEmail: string, roleCode?: string) {
  const normalized = newEmail.trim().toLowerCase();
  const payload: {
    email: string;
    email_confirm: boolean;
    app_metadata?: Record<string, unknown>;
  } = {
    email: normalized,
    email_confirm: true,
  };
  if (roleCode) {
    payload.app_metadata = { role: roleCode };
  }
  const { error } = await admin.auth.admin.updateUserById(userId, payload);
  if (error) throw new Error(error.message);
}

async function deactivateUserRoles(
  filter: { userId?: string; employeeId: string },
  exceptRoleId?: string,
) {
  const now = new Date().toISOString();
  let query = hrms
    .from("user_roles")
    .update({ status: "inactive", deleted_at: now, updated_at: now })
    .eq("organization_id", ORG_ID)
    .eq("employee_id", filter.employeeId)
    .is("deleted_at", null);

  if (filter.userId) {
    query = query.eq("user_id", filter.userId);
  }
  if (exceptRoleId) {
    query = query.neq("role_id", exceptRoleId);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function ensureHrAdminRole(userId: string | null, employeeId: string) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await hrms
    .from("user_roles")
    .select("id")
    .eq("organization_id", ORG_ID)
    .eq("employee_id", employeeId)
    .eq("role_id", HR_ADMIN_ROLE_ID)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing?.id) {
    const { error } = await hrms
      .from("user_roles")
      .update({
        user_id: userId,
        status: "active",
        deleted_at: null,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  if (!userId) return;

  const { error } = await hrms.from("user_roles").insert({
    organization_id: ORG_ID,
    user_id: userId,
    employee_id: employeeId,
    role_id: HR_ADMIN_ROLE_ID,
    status: "active",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  if (error) throw new Error(error.message);
}

async function updateEmployeeEmail(
  employeeId: string,
  newEmail: string,
  invitedRoleId?: string,
) {
  const normalized = newEmail.trim().toLowerCase();
  await assertEmailAvailable(employeeId, normalized);

  const patch: Record<string, unknown> = {
    email: normalized,
    updated_at: new Date().toISOString(),
  };
  if (invitedRoleId) patch.invited_role_id = invitedRoleId;

  const { error } = await hrms.from("employees").update(patch).eq("id", employeeId);
  if (error) throw new Error(error.message);

  const { error: inviteError } = await hrms
    .from("employee_invitations")
    .update({
      email: normalized,
      ...(invitedRoleId
        ? { role_id: invitedRoleId, portal_route: "/dashboard" }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("employee_id", employeeId)
    .is("deleted_at", null);

  if (inviteError && !inviteError.message.includes("employee_invitations")) {
    throw new Error(inviteError.message);
  }
}

async function updateAkshita() {
  const newEmail = "akshita.potnuru@ifranchise.in";
  const oldEmails = ["akshitapotnuru@gmail.com", newEmail];

  let authUserId: string | null = null;
  for (const email of oldEmails) {
    authUserId = await findAuthUserIdByEmail(email);
    if (authUserId) break;
  }

  const { data: employee, error } = await hrms
    .from("employees")
    .select("user_id")
    .eq("id", AKSHITA_EMPLOYEE_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const userId = authUserId ?? (employee?.user_id as string | null) ?? null;
  if (userId) {
    await updateAuthEmail(userId, newEmail);
  }

  await updateEmployeeEmail(AKSHITA_EMPLOYEE_ID, newEmail);
  console.log(`Akshita updated -> ${newEmail} (auth user: ${userId ?? "none"})`);
}

async function updateEkta() {
  const newEmail = "hr@ifranchise.in";
  const oldEmails = ["ekta@ifranchise.in", newEmail];

  let authUserId: string | null = null;
  for (const email of oldEmails) {
    authUserId = await findAuthUserIdByEmail(email);
    if (authUserId) break;
  }

  const { data: employee, error } = await hrms
    .from("employees")
    .select("user_id")
    .eq("id", EKTA_EMPLOYEE_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const userId = authUserId ?? (employee?.user_id as string | null) ?? null;
  if (userId) {
    await updateAuthEmail(userId, newEmail, "hr_admin");
  }

  await updateEmployeeEmail(EKTA_EMPLOYEE_ID, newEmail, HR_ADMIN_ROLE_ID);

  await deactivateUserRoles({ userId: userId ?? undefined, employeeId: EKTA_EMPLOYEE_ID }, HR_ADMIN_ROLE_ID);

  const { error: employeeRoleError } = await hrms
    .from("user_roles")
    .update({
      status: "inactive",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", ORG_ID)
    .eq("employee_id", EKTA_EMPLOYEE_ID)
    .eq("role_id", EMPLOYEE_ROLE_ID)
    .is("deleted_at", null);
  if (employeeRoleError) throw new Error(employeeRoleError.message);

  await ensureHrAdminRole(userId, EKTA_EMPLOYEE_ID);
  console.log(`Ekta updated -> ${newEmail} with HR Admin role (auth user: ${userId ?? "none"})`);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  await updateAkshita();
  await updateEkta();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
