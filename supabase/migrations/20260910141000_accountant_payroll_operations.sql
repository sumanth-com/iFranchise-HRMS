-- Accountant operational finance permissions: process Team Payroll + settle,
-- without HR claim approval or system administration.
-- Additive / scoped only to the accountant role.

-- 1) Grant payroll processing + settlement + payslip release codes
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'accountant'
  AND r.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN (
    'payroll.create',
    'payroll.generate',
    'payroll.run',
    'payroll.process',
    'payroll.edit',
    'payroll.approve',
    'payroll.pay',
    'payslip.generate',
    'bank_account.view',
    'bonus.view',
    'audit.view'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- 2) Soft-revoke any accidental HR / IAM / system grants on accountant
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
  AND rp.status = 'active'
  AND p.code IN (
    -- HR claim approval (settlement is via payroll.pay on payroll runs)
    'reimbursement.approve',
    -- Salary structure mutation
    'salary.edit',
    'salary_structure.create',
    'salary_structure.edit',
    'salary_structure.delete',
    -- Bonus HR approvals
    'bonus.create',
    'bonus.approve',
    -- Bank account mutation
    'bank_account.create',
    'bank_account.edit',
    -- Employee / recruiting / IAM / org / system
    'employee.create',
    'employee.edit',
    'employee.delete',
    'recruitment.view',
    'recruitment.create',
    'recruitment.edit',
    'recruitment.approve',
    'roles.view',
    'roles.manage',
    'permissions.manage',
    'organization.edit',
    'organization.manage',
    'user_provisioning.view',
    'user_provisioning.manage',
    'system.admin.access',
    'settings.edit',
    'settings.manage',
    'api_keys.view',
    'api_keys.manage',
    'backup.manage',
    'database.manage',
    -- Other business portals
    'portal.hr.access',
    'portal.ceo.access',
    'portal.manager.access'
  );

-- 3) Keep role provisionable for current + future accountants
UPDATE hrms.roles
SET
  is_provisionable = true,
  is_inviteable = true,
  portal_key = 'accountant',
  portal_route = '/accountant',
  status = 'active',
  updated_at = public.utc_now(),
  deleted_at = NULL
WHERE code = 'accountant'
  AND organization_id = 'a0000000-0000-4000-8000-000000000001';
