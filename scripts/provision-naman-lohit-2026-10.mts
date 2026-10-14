/**
 * One-off: create draft employee records for Naman Thapiyal (IF2026023) and
 * Lohit Kumar (IF2026024) so HR can send the portal invite from User Provisioning.
 *
 * Mirrors `inviteEmployeeByEmail` record creation (draft employee + profile row),
 * but with the HR-confirmed employee codes, joining date and placement. Does not
 * create auth users, send email, assign roles, or touch leave/payroll/attendance:
 * the invite and first login handle those through the normal workflow.
 *
 * Usage:
 *   npx tsx scripts/provision-naman-lohit-2026-10.mts           # dry run
 *   npx tsx scripts/provision-naman-lohit-2026-10.mts --apply   # write
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const ORG_ID = "a0000000-0000-4000-8000-000000000001";
const JOINING_DATE = "2026-10-14";
const ACTOR_EMPLOYEE_CODE = "IF2026000";

type Person = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  employmentType: string;
  managerCode: string;
  hrCode: string;
};

const PEOPLE: Person[] = [
  {
    employeeCode: "IF2026023",
    firstName: "Naman",
    lastName: "Thapiyal",
    email: "naman.thapiyal@ifranchise.in",
    designation: "Graphic Designer cum Video Editor",
    department: "Marketing",
    employmentType: "Probation",
    managerCode: "IF2024001",
    hrCode: "IF2026001",
  },
  {
    employeeCode: "IF2026024",
    firstName: "Lohit",
    lastName: "Kumar",
    email: "lohitkumar.hk@ifranchise.in",
    designation: "Assistant Business Development Manager",
    department: "Sales",
    employmentType: "Probation",
    managerCode: "IF2024002",
    hrCode: "IF2026001",
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const hrms = admin.schema("hrms");

function must<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

async function findOneByName(table: string, column: string, value: string) {
  const { data, error } = await hrms
    .from(table)
    .select(`id, ${column}`)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null);
  if (error) throw new Error(`${table}: ${error.message}`);
  const matches = (data ?? []).filter(
    (row) => String((row as Record<string, unknown>)[column]).trim().toLowerCase() === value.toLowerCase(),
  );
  if (matches.length > 1) throw new Error(`Ambiguous ${table} "${value}" (${matches.length} rows)`);
  return (matches[0] as { id: string } | undefined)?.id ?? null;
}

async function employeeIdByCode(code: string) {
  const { data, error } = await hrms
    .from("employees")
    .select("id, user_id")
    .eq("organization_id", ORG_ID)
    .eq("employee_code", code)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return must(data, `Employee ${code} not found`);
}

async function authUserExists(email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw new Error(error.message);
    if (data.users.some((user) => user.email?.toLowerCase() === email)) return true;
    if (data.users.length < 500) return false;
  }
  return false;
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY RUN (pass --apply to write)");

  const actor = await employeeIdByCode(ACTOR_EMPLOYEE_CODE);
  const actorUserId = must(actor.user_id as string | null, "Actor has no user_id");

  const branchId = must(await findOneByName("branches", "name", "Head Office"), "Branch Head Office not found");
  const employeeRoleId = await (async () => {
    const { data, error } = await hrms
      .from("roles")
      .select("id, code")
      .eq("organization_id", ORG_ID)
      .eq("code", "employee")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return must(data?.id as string | undefined, "Employee role not found");
  })();

  const plans: Array<Record<string, unknown>> = [];

  for (const person of PEOPLE) {
    const { data: conflicts, error: conflictError } = await hrms
      .from("employees")
      .select("id, employee_code, email, first_name, last_name, account_status")
      .eq("organization_id", ORG_ID)
      .is("deleted_at", null)
      .or(`employee_code.eq.${person.employeeCode},email.ilike.${person.email}`);
    if (conflictError) throw new Error(conflictError.message);

    const existing = (conflicts ?? []).find(
      (row) => row.employee_code === person.employeeCode && String(row.email).toLowerCase() === person.email,
    );
    const otherConflicts = (conflicts ?? []).filter((row) => row !== existing);
    if (otherConflicts.length > 0) {
      throw new Error(`Conflict for ${person.employeeCode}/${person.email}: ${JSON.stringify(otherConflicts)}`);
    }
    if (existing) {
      console.log(`SKIP ${person.employeeCode}: record already exists (${existing.id}, ${existing.account_status})`);
      continue;
    }
    if (await authUserExists(person.email)) {
      throw new Error(`An auth user already exists for ${person.email}; resolve before creating a record.`);
    }

    const departmentId = must(await findOneByName("departments", "name", person.department), `Department ${person.department} not found`);
    const employmentTypeId = must(
      await findOneByName("employment_types", "name", person.employmentType),
      `Employment type ${person.employmentType} not found`,
    );
    const managerId = (await employeeIdByCode(person.managerCode)).id as string;
    const hrId = (await employeeIdByCode(person.hrCode)).id as string;
    let designationId = await findOneByName("designations", "title", person.designation);

    plans.push({
      code: person.employeeCode,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      designation: `${person.designation}${designationId ? "" : " (NEW)"}`,
      department: person.department,
      employmentType: person.employmentType,
      manager: person.managerCode,
      hr: person.hrCode,
      joiningDate: JOINING_DATE,
    });

    if (!APPLY) continue;

    if (!designationId) {
      const slug = person.designation.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
      const { data: created, error } = await hrms
        .from("designations")
        .insert({
          organization_id: ORG_ID,
          title: person.designation,
          code: `${slug}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          created_by: actorUserId,
          updated_by: actorUserId,
        })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message ?? "Failed to create designation");
      designationId = created.id as string;
      console.log(`CREATED designation "${person.designation}" ${designationId}`);
    }

    const { data: employee, error: insertError } = await hrms
      .from("employees")
      .insert({
        organization_id: ORG_ID,
        branch_id: branchId,
        department_id: departmentId,
        designation_id: designationId,
        employment_type_id: employmentTypeId,
        reporting_manager_id: managerId,
        assigned_hr_employee_id: hrId,
        invited_role_id: employeeRoleId,
        employee_code: person.employeeCode,
        first_name: person.firstName,
        last_name: person.lastName,
        email: person.email,
        date_of_joining: JOINING_DATE,
        employment_status: "draft",
        account_status: "draft",
        status: "active",
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select("id")
      .single();
    if (insertError || !employee) throw new Error(insertError?.message ?? "Failed to insert employee");

    const { error: profileError } = await hrms.from("employee_profiles").insert({
      employee_id: employee.id,
      status: "active",
      created_by: actorUserId,
      updated_by: actorUserId,
    });
    if (profileError) throw new Error(`Profile insert failed for ${employee.id}: ${profileError.message}`);

    console.log(`CREATED ${person.employeeCode} ${person.firstName} ${person.lastName} → ${employee.id}`);
  }

  console.log("PLAN:", JSON.stringify(plans, null, 2));
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
