-- =============================================================================
-- Migration: hrms_security_seed
-- Description: Permissions, roles, role mappings, and organization settings
-- =============================================================================

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('organization.view', 'organization', 'view', 'organization', 'View organization profile', 'active'),
  ('organization.edit', 'organization', 'edit', 'organization', 'Edit organization profile', 'active'),
  ('branch.view', 'branch', 'view', 'branch', 'View branches', 'active'),
  ('branch.create', 'branch', 'create', 'branch', 'Create branches', 'active'),
  ('branch.edit', 'branch', 'edit', 'branch', 'Edit branches', 'active'),
  ('branch.delete', 'branch', 'delete', 'branch', 'Delete branches', 'active'),
  ('department.view', 'department', 'view', 'department', 'View departments', 'active'),
  ('department.create', 'department', 'create', 'department', 'Create departments', 'active'),
  ('department.edit', 'department', 'edit', 'department', 'Edit departments', 'active'),
  ('department.delete', 'department', 'delete', 'department', 'Delete departments', 'active'),
  ('designation.view', 'designation', 'view', 'designation', 'View designations', 'active'),
  ('designation.create', 'designation', 'create', 'designation', 'Create designations', 'active'),
  ('designation.edit', 'designation', 'edit', 'designation', 'Edit designations', 'active'),
  ('designation.delete', 'designation', 'delete', 'designation', 'Delete designations', 'active'),
  ('employment_type.view', 'employment_type', 'view', 'employment_type', 'View employment types', 'active'),
  ('employment_type.create', 'employment_type', 'create', 'employment_type', 'Create employment types', 'active'),
  ('employment_type.edit', 'employment_type', 'edit', 'employment_type', 'Edit employment types', 'active'),
  ('employment_type.delete', 'employment_type', 'delete', 'employment_type', 'Delete employment types', 'active'),
  ('employee.view', 'employee', 'view', 'employee', 'View employees', 'active'),
  ('employee.create', 'employee', 'create', 'employee', 'Create employees', 'active'),
  ('employee.edit', 'employee', 'edit', 'employee', 'Edit employees', 'active'),
  ('employee.delete', 'employee', 'delete', 'employee', 'Delete employees', 'active'),
  ('employee_profile.view', 'employee', 'view', 'employee_profile', 'View employee profiles', 'active'),
  ('employee_profile.edit', 'employee', 'edit', 'employee_profile', 'Edit employee profiles', 'active'),
  ('emergency_contact.view', 'employee', 'view', 'emergency_contact', 'View emergency contacts', 'active'),
  ('emergency_contact.create', 'employee', 'create', 'emergency_contact', 'Create emergency contacts', 'active'),
  ('emergency_contact.edit', 'employee', 'edit', 'emergency_contact', 'Edit emergency contacts', 'active'),
  ('emergency_contact.delete', 'employee', 'delete', 'emergency_contact', 'Delete emergency contacts', 'active'),
  ('bank_account.view', 'employee', 'view', 'bank_account', 'View bank accounts', 'active'),
  ('bank_account.create', 'employee', 'create', 'bank_account', 'Create bank accounts', 'active'),
  ('bank_account.edit', 'employee', 'edit', 'bank_account', 'Edit bank accounts', 'active'),
  ('bank_account.delete', 'employee', 'delete', 'bank_account', 'Delete bank accounts', 'active'),
  ('employee_address.view', 'employee', 'view', 'employee_address', 'View employee addresses', 'active'),
  ('employee_address.create', 'employee', 'create', 'employee_address', 'Create employee addresses', 'active'),
  ('employee_address.edit', 'employee', 'edit', 'employee_address', 'Edit employee addresses', 'active'),
  ('employee_address.delete', 'employee', 'delete', 'employee_address', 'Delete employee addresses', 'active'),
  ('attendance.view', 'attendance', 'view', 'attendance', 'View attendance records', 'active'),
  ('attendance.create', 'attendance', 'create', 'attendance', 'Create attendance records', 'active'),
  ('attendance.edit', 'attendance', 'edit', 'attendance', 'Edit attendance records', 'active'),
  ('attendance.approve', 'attendance', 'approve', 'attendance', 'Approve attendance records', 'active'),
  ('attendance.delete', 'attendance', 'delete', 'attendance', 'Delete attendance records', 'active'),
  ('attendance_correction.view', 'attendance', 'view', 'attendance_correction', 'View attendance corrections', 'active'),
  ('attendance_correction.create', 'attendance', 'create', 'attendance_correction', 'Create attendance corrections', 'active'),
  ('attendance_correction.approve', 'attendance', 'approve', 'attendance_correction', 'Approve attendance corrections', 'active'),
  ('attendance_correction.reject', 'attendance', 'reject', 'attendance_correction', 'Reject attendance corrections', 'active'),
  ('leave.view', 'leave', 'view', 'leave', 'View leave requests', 'active'),
  ('leave.create', 'leave', 'create', 'leave', 'Create leave requests', 'active'),
  ('leave.approve', 'leave', 'approve', 'leave', 'Approve leave requests', 'active'),
  ('leave.reject', 'leave', 'reject', 'leave', 'Reject leave requests', 'active'),
  ('leave.cancel', 'leave', 'cancel', 'leave', 'Cancel leave requests', 'active'),
  ('leave.withdraw', 'leave', 'withdraw', 'leave', 'Withdraw leave requests', 'active'),
  ('leave_balance.view', 'leave', 'view', 'leave_balance', 'View leave balances', 'active'),
  ('leave_balance.manage', 'leave', 'manage', 'leave_balance', 'Manage leave balances', 'active'),
  ('leave_type.view', 'leave', 'view', 'leave_type', 'View leave types', 'active'),
  ('leave_type.manage', 'leave', 'manage', 'leave_type', 'Manage leave types', 'active'),
  ('payroll.view', 'payroll', 'view', 'payroll', 'View payroll runs', 'active'),
  ('payroll.generate', 'payroll', 'generate', 'payroll', 'Generate payroll runs', 'active'),
  ('payroll.approve', 'payroll', 'approve', 'payroll', 'Approve payroll runs', 'active'),
  ('payroll.process', 'payroll', 'process', 'payroll', 'Process payroll runs', 'active'),
  ('payroll.pay', 'payroll', 'pay', 'payroll', 'Mark payroll as paid', 'active'),
  ('salary_structure.view', 'payroll', 'view', 'salary_structure', 'View salary structures', 'active'),
  ('salary_structure.create', 'payroll', 'create', 'salary_structure', 'Create salary structures', 'active'),
  ('salary_structure.edit', 'payroll', 'edit', 'salary_structure', 'Edit salary structures', 'active'),
  ('salary_structure.delete', 'payroll', 'delete', 'salary_structure', 'Delete salary structures', 'active'),
  ('payslip.view', 'payroll', 'view', 'payslip', 'View payslips', 'active'),
  ('payslip.generate', 'payroll', 'generate', 'payslip', 'Generate payslips', 'active'),
  ('holiday.view', 'holiday', 'view', 'holiday', 'View holidays', 'active'),
  ('holiday.manage', 'holiday', 'manage', 'holiday', 'Manage holidays', 'active'),
  ('document_type.view', 'documents', 'view', 'document_type', 'View document types', 'active'),
  ('document_type.manage', 'documents', 'manage', 'document_type', 'Manage document types', 'active'),
  ('documents.view', 'documents', 'view', 'documents', 'View employee documents', 'active'),
  ('documents.upload', 'documents', 'upload', 'documents', 'Upload employee documents', 'active'),
  ('documents.verify', 'documents', 'verify', 'documents', 'Verify employee documents', 'active'),
  ('documents.delete', 'documents', 'delete', 'documents', 'Delete employee documents', 'active'),
  ('documents.manage', 'documents', 'manage', 'documents', 'Manage all document operations', 'active'),
  ('notification.view', 'notifications', 'view', 'notification', 'View notifications', 'active'),
  ('notification.manage', 'notifications', 'manage', 'notification', 'Manage notifications', 'active'),
  ('audit.view', 'audit', 'view', 'audit', 'View audit logs', 'active'),
  ('report.view', 'reports', 'view', 'report', 'View reports', 'active'),
  ('report.export', 'reports', 'export', 'report', 'Export reports', 'active'),
  ('settings.view', 'settings', 'view', 'settings', 'View organization settings', 'active'),
  ('settings.manage', 'settings', 'manage', 'settings', 'Manage organization settings', 'active'),
  ('role.view', 'security', 'view', 'role', 'View roles', 'active'),
  ('role.manage', 'security', 'manage', 'role', 'Manage roles and assignments', 'active'),
  ('permission.view', 'security', 'view', 'permission', 'View permission catalog', 'active'),
  ('user_role.view', 'security', 'view', 'user_role', 'View user role assignments', 'active'),
  ('user_role.assign', 'security', 'assign', 'user_role', 'Assign roles to users', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.roles (id, organization_id, name, code, description, is_system_role, status)
VALUES
  ('a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'Super Admin', 'super_admin', 'Full system access', true, 'active'),
  ('a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'HR Admin', 'hr_admin', 'Human resources administration', true, 'active'),
  ('a0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'Manager', 'manager', 'Team management operations', true, 'active'),
  ('a0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001', 'Employee', 'employee', 'Employee self-service access', true, 'active')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description,
    is_system_role = EXCLUDED.is_system_role, status = EXCLUDED.status, updated_at = public.utc_now();

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000101'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000101'::uuid AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000102'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL AND p.code = ANY (ARRAY[
  'organization.view','branch.view','department.view','department.create','department.edit',
  'designation.view','designation.create','designation.edit','employment_type.view','employment_type.create','employment_type.edit',
  'employee.view','employee.create','employee.edit','employee.delete','employee_profile.view','employee_profile.edit',
  'emergency_contact.view','emergency_contact.create','emergency_contact.edit','emergency_contact.delete',
  'bank_account.view','bank_account.create','bank_account.edit','bank_account.delete',
  'employee_address.view','employee_address.create','employee_address.edit','employee_address.delete',
  'attendance.view','attendance.create','attendance.edit','attendance.approve','attendance.delete',
  'attendance_correction.view','attendance_correction.approve','attendance_correction.reject',
  'leave.view','leave.approve','leave.reject','leave.cancel','leave_balance.view','leave_balance.manage',
  'leave_type.view','leave_type.manage','payroll.view','payroll.generate','payroll.approve','payroll.process',
  'salary_structure.view','salary_structure.create','salary_structure.edit','payslip.view','payslip.generate',
  'holiday.view','holiday.manage','document_type.view','document_type.manage',
  'documents.view','documents.upload','documents.verify','documents.delete','documents.manage',
  'notification.view','notification.manage','audit.view','report.view','report.export',
  'settings.view','role.view','user_role.view','user_role.assign','permission.view'
]) AND NOT EXISTS (
  SELECT 1 FROM hrms.role_permissions rp
  WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid AND rp.permission_id = p.id AND rp.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000103'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL AND p.code = ANY (ARRAY[
  'employee.view','employee_profile.view','attendance.view','attendance.approve',
  'attendance_correction.view','attendance_correction.approve','attendance_correction.reject',
  'leave.view','leave.approve','leave.reject','leave_balance.view','holiday.view',
  'documents.view','payslip.view','notification.view','report.view'
]) AND NOT EXISTS (
  SELECT 1 FROM hrms.role_permissions rp
  WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000103'::uuid AND rp.permission_id = p.id AND rp.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000104'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL AND p.code = ANY (ARRAY[
  'employee.view','employee_profile.view','employee_profile.edit',
  'emergency_contact.view','emergency_contact.create','emergency_contact.edit',
  'bank_account.view','employee_address.view','employee_address.create','employee_address.edit',
  'attendance.view','attendance_correction.view','attendance_correction.create',
  'leave.view','leave.create','leave.withdraw','leave_balance.view','holiday.view',
  'documents.view','documents.upload','payslip.view','notification.view'
]) AND NOT EXISTS (
  SELECT 1 FROM hrms.role_permissions rp
  WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000104'::uuid AND rp.permission_id = p.id AND rp.deleted_at IS NULL
);

INSERT INTO hrms.organization_settings (
  organization_id, timezone, date_format, currency_code, fiscal_year_start_month,
  payroll_cycle, work_week_start_day, settings, status
) VALUES (
  'a0000000-0000-4000-8000-000000000001', 'Asia/Kolkata', 'DD/MM/YYYY', 'INR', 4, 'monthly', 1,
  jsonb_build_object(
    'working_hours', jsonb_build_object('start', '10:00', 'end', '19:00', 'timezone', 'Asia/Kolkata'),
    'lunch_break', jsonb_build_object('start', '14:00', 'end', '15:00'),
    'grace_time', jsonb_build_object('check_in', '10:05'),
    'payroll', jsonb_build_object('cycle', 'monthly', 'salary_date', 1, 'description', 'Salary processed on the 1st of every month'),
    'leave_rules', jsonb_build_object('min_notice_days', 1, 'max_consecutive_days', 30, 'allow_half_day', true, 'allow_carry_forward', true, 'approval_levels', 1),
    'attendance_rules', jsonb_build_object('require_check_out', true, 'allow_remote_check_in', false, 'half_day_minimum_hours', 4, 'full_day_minimum_hours', 8, 'late_after', '10:05', 'working_days', jsonb_build_array('monday','tuesday','wednesday','thursday','friday'))
  ),
  'active'
)
ON CONFLICT (organization_id) DO UPDATE
SET timezone = EXCLUDED.timezone, date_format = EXCLUDED.date_format, currency_code = EXCLUDED.currency_code,
    fiscal_year_start_month = EXCLUDED.fiscal_year_start_month, payroll_cycle = EXCLUDED.payroll_cycle,
    work_week_start_day = EXCLUDED.work_week_start_day, settings = EXCLUDED.settings,
    status = EXCLUDED.status, updated_at = public.utc_now();
