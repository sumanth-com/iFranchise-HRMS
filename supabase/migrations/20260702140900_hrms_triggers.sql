-- =============================================================================
-- Migration: hrms_triggers
-- Description: Attach updated_at and audit triggers to HRMS tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.organizations'::regclass);
SELECT public.attach_updated_at_trigger('hrms.branches'::regclass);
SELECT public.attach_updated_at_trigger('hrms.departments'::regclass);
SELECT public.attach_updated_at_trigger('hrms.designations'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employment_types'::regclass);
SELECT public.attach_updated_at_trigger('hrms.permissions'::regclass);
SELECT public.attach_updated_at_trigger('hrms.roles'::regclass);
SELECT public.attach_updated_at_trigger('hrms.role_permissions'::regclass);
SELECT public.attach_updated_at_trigger('hrms.user_roles'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employees'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employee_profiles'::regclass);
SELECT public.attach_updated_at_trigger('hrms.emergency_contacts'::regclass);
SELECT public.attach_updated_at_trigger('hrms.bank_accounts'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employee_addresses'::regclass);
SELECT public.attach_updated_at_trigger('hrms.document_types'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employee_documents'::regclass);
SELECT public.attach_updated_at_trigger('hrms.attendance'::regclass);
SELECT public.attach_updated_at_trigger('hrms.attendance_corrections'::regclass);
SELECT public.attach_updated_at_trigger('hrms.leave_types'::regclass);
SELECT public.attach_updated_at_trigger('hrms.leave_balances'::regclass);
SELECT public.attach_updated_at_trigger('hrms.leave_requests'::regclass);
SELECT public.attach_updated_at_trigger('hrms.leave_approvals'::regclass);
SELECT public.attach_updated_at_trigger('hrms.salary_structures'::regclass);
SELECT public.attach_updated_at_trigger('hrms.payrolls'::regclass);
SELECT public.attach_updated_at_trigger('hrms.payroll_items'::regclass);
SELECT public.attach_updated_at_trigger('hrms.payslips'::regclass);
SELECT public.attach_updated_at_trigger('hrms.holidays'::regclass);
SELECT public.attach_updated_at_trigger('hrms.notifications'::regclass);
SELECT public.attach_updated_at_trigger('hrms.audit_logs'::regclass);
SELECT public.attach_updated_at_trigger('hrms.organization_settings'::regclass);

-- -----------------------------------------------------------------------------
-- audit triggers (sensitive / master data tables; audit_logs excluded)
-- -----------------------------------------------------------------------------

SELECT public.attach_audit_trigger('hrms.organizations'::regclass);
SELECT public.attach_audit_trigger('hrms.branches'::regclass);
SELECT public.attach_audit_trigger('hrms.departments'::regclass);
SELECT public.attach_audit_trigger('hrms.designations'::regclass);
SELECT public.attach_audit_trigger('hrms.employment_types'::regclass);
SELECT public.attach_audit_trigger('hrms.roles'::regclass);
SELECT public.attach_audit_trigger('hrms.user_roles'::regclass);
SELECT public.attach_audit_trigger('hrms.employees'::regclass);
SELECT public.attach_audit_trigger('hrms.employee_profiles'::regclass);
SELECT public.attach_audit_trigger('hrms.bank_accounts'::regclass);
SELECT public.attach_audit_trigger('hrms.employee_documents'::regclass);
SELECT public.attach_audit_trigger('hrms.attendance'::regclass);
SELECT public.attach_audit_trigger('hrms.leave_requests'::regclass);
SELECT public.attach_audit_trigger('hrms.salary_structures'::regclass);
SELECT public.attach_audit_trigger('hrms.payrolls'::regclass);
SELECT public.attach_audit_trigger('hrms.organization_settings'::regclass);

-- -----------------------------------------------------------------------------
-- schema grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hrms TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA hrms
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
