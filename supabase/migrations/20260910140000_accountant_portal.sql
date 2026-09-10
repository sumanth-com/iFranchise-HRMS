-- =============================================================================
-- Accountant role + Accountant Portal
-- Finance/payroll administration with employee self-service.
-- Does not grant HR hiring, IAM, org admin, or system administration.
-- =============================================================================

-- 1) Portal + granular finance permissions
INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('portal.accountant.access', 'portal', 'access', 'accountant', 'Access Accountant portal', 'active'),
  ('payroll.view_all', 'payroll', 'view_all', 'payroll', 'View payroll for all employees in the organization', 'active'),
  ('payroll.export', 'payroll', 'export', 'payroll', 'Export payroll data where supported', 'active'),
  ('payslips.view', 'payroll', 'view', 'payslips', 'View employee payslips for accounting', 'active'),
  ('payslips.download', 'payroll', 'download', 'payslips', 'Download employee payslip PDFs', 'active'),
  ('reimbursements.view', 'payroll', 'view', 'reimbursements', 'View employee reimbursement claims', 'active'),
  ('reimbursements.view_attachments', 'payroll', 'view_attachments', 'reimbursements', 'View reimbursement receipt attachments', 'active'),
  ('payroll_reports.view', 'reports', 'view', 'payroll_reports', 'View accountant payroll reports', 'active'),
  ('payroll_reports.export', 'reports', 'export', 'payroll_reports', 'Export accountant payroll reports', 'active'),
  ('payroll_audit.view', 'audit', 'view', 'payroll_audit', 'View payroll-related audit history', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

-- 2) Accountant role (parent = employee for self-service inheritance hints)
INSERT INTO hrms.roles (
  id,
  organization_id,
  name,
  code,
  description,
  is_system_role,
  parent_role_id,
  is_default,
  is_provisionable,
  is_inviteable,
  portal_key,
  portal_route,
  status
)
VALUES (
  'a0000000-0000-4000-8000-000000000109',
  'a0000000-0000-4000-8000-000000000001',
  'Accountant',
  'accountant',
  'Finance and payroll administration with employee self-service',
  true,
  'a0000000-0000-4000-8000-000000000104'::uuid,
  false,
  true,
  true,
  'accountant',
  '/accountant',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  parent_role_id = EXCLUDED.parent_role_id,
  is_system_role = EXCLUDED.is_system_role,
  is_provisionable = EXCLUDED.is_provisionable,
  is_inviteable = EXCLUDED.is_inviteable,
  portal_key = EXCLUDED.portal_key,
  portal_route = EXCLUDED.portal_route,
  status = 'active',
  updated_at = public.utc_now(),
  deleted_at = NULL;

-- Ensure code-based upsert if a different id already exists for accountant
UPDATE hrms.roles
SET
  name = 'Accountant',
  description = 'Finance and payroll administration with employee self-service',
  parent_role_id = 'a0000000-0000-4000-8000-000000000104'::uuid,
  is_system_role = true,
  is_provisionable = true,
  is_inviteable = true,
  portal_key = 'accountant',
  portal_route = '/accountant',
  status = 'active',
  updated_at = public.utc_now(),
  deleted_at = NULL
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND code = 'accountant'
  AND deleted_at IS NULL;

-- 3) Copy employee self-service permissions directly onto accountant
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT target.id, rp.permission_id, 'active'::hrms.record_status
FROM hrms.roles target
JOIN hrms.roles employee_role
  ON employee_role.code = 'employee'
 AND employee_role.organization_id = target.organization_id
 AND employee_role.deleted_at IS NULL
JOIN hrms.role_permissions rp
  ON rp.role_id = employee_role.id
 AND rp.deleted_at IS NULL
 AND rp.status = 'active'
WHERE target.code = 'accountant'
  AND target.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND target.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions existing
    WHERE existing.role_id = target.id
      AND existing.permission_id = rp.permission_id
      AND existing.deleted_at IS NULL
  );

-- 4) Grant accountant portal + finance permissions (existing + granular aliases)
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'accountant'
  AND r.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN (
    -- Portals: Accountant admin + Employee self-service switcher
    'portal.accountant.access',
    'portal.employee.access',
    -- Existing codes used by shared payroll/reports/audit UI
    'payroll.view',
    'payroll.download',
    'payslip.view',
    'salary.view',
    'salary_structure.view',
    'bonus.view',
    'reimbursement.view',
    'bank_account.view',
    'reports.view',
    'reports.export',
    'audit.view',
    -- Granular accountant aliases
    'payroll.view_all',
    'payroll.export',
    'payslips.view',
    'payslips.download',
    'reimbursements.view',
    'reimbursements.view_attachments',
    'payroll_reports.view',
    'payroll_reports.export',
    'payroll_audit.view'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- 5) Explicitly ensure accountant does NOT receive mutate / HR / system admin codes
UPDATE hrms.role_permissions rp
SET
  status = 'inactive',
  deleted_at = public.utc_now(),
  updated_at = public.utc_now()
FROM hrms.roles r,
     hrms.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'accountant'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND rp.deleted_at IS NULL
  AND p.code IN (
    'payroll.create', 'payroll.edit', 'payroll.generate', 'payroll.run',
    'payroll.process', 'payroll.approve', 'payroll.pay',
    'salary.edit', 'salary_structure.create', 'salary_structure.edit', 'salary_structure.delete',
    'bonus.create', 'bonus.approve',
    'reimbursement.approve',
    'bank_account.create', 'bank_account.edit',
    'employee.create', 'employee.edit', 'employee.delete',
    'recruitment.view', 'recruitment.create', 'recruitment.edit',
    'roles.view', 'roles.manage', 'permissions.manage',
    'organization.edit', 'organization.manage',
    'user_provisioning.view', 'user_provisioning.manage',
    'system.admin.access',
    'settings.edit', 'settings.manage',
    'portal.hr.access', 'portal.ceo.access', 'portal.manager.access'
  );

-- 6) Portal home routing includes accountant
CREATE OR REPLACE FUNCTION hrms.get_user_portal_route(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
  route text;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_service_role() THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    (
      SELECT COALESCE(
        NULLIF(r.portal_route, ''),
        CASE r.portal_key
          WHEN 'hr' THEN '/dashboard'
          WHEN 'ceo' THEN '/ceo'
          WHEN 'manager' THEN '/manager'
          WHEN 'accountant' THEN '/accountant'
          WHEN 'employee' THEN '/employee'
          ELSE NULL
        END,
        CASE r.code
          WHEN 'super_admin' THEN '/dashboard/system'
          WHEN 'hr_admin' THEN '/dashboard'
          WHEN 'hr_executive' THEN '/dashboard'
          WHEN 'founder' THEN '/ceo'
          WHEN 'co_founder' THEN '/ceo'
          WHEN 'ceo' THEN '/ceo'
          WHEN 'manager' THEN '/manager'
          WHEN 'accountant' THEN '/accountant'
          WHEN 'employee' THEN '/employee'
          ELSE NULL
        END
      )
      FROM hrms.user_roles ur
      INNER JOIN hrms.roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.deleted_at IS NULL
        AND ur.status = 'active'::hrms.record_status
        AND r.deleted_at IS NULL
        AND r.status = 'active'::hrms.record_status
      ORDER BY CASE r.code
        WHEN 'super_admin' THEN 1
        WHEN 'hr_admin' THEN 2
        WHEN 'hr_executive' THEN 3
        WHEN 'founder' THEN 4
        WHEN 'co_founder' THEN 5
        WHEN 'ceo' THEN 6
        WHEN 'manager' THEN 7
        WHEN 'accountant' THEN 8
        WHEN 'employee' THEN 9
        ELSE 99
      END
      LIMIT 1
    ),
    '/employee'
  )
  INTO route;

  RETURN route;
END;
$$;
