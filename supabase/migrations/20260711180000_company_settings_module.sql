-- Company Settings module: centralized configuration permissions and defaults

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
VALUES (
  'settings.edit',
  'settings',
  'edit',
  'settings',
  'Edit company-wide settings (Super Admin only)',
  'active'
)
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- Grant settings.edit to Super Admin only
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000101'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL AND p.code = 'settings.edit'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000101'::uuid
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- Seed extended company settings JSONB defaults (merge with existing)
UPDATE hrms.organization_settings os
SET settings = COALESCE(os.settings, '{}'::jsonb)
  || jsonb_build_object(
    'leave_policies', COALESCE(os.settings->'leave_policies', jsonb_build_object(
      'leave_year_start_month', 1,
      'half_day_rules', jsonb_build_object('enabled', true, 'morning_end', '13:00', 'afternoon_start', '14:00'),
      'sandwich_leave', jsonb_build_object('enabled', false, 'include_weekends', true, 'include_holidays', true),
      'carry_forward', jsonb_build_object('enabled', true, 'max_days', 10, 'expiry_months', 3),
      'encashment', jsonb_build_object('enabled', false, 'max_days_per_year', 5, 'min_balance_required', 15)
    )),
    'security', COALESCE(os.settings->'security', jsonb_build_object(
      'password_policy', jsonb_build_object(
        'min_length', 8,
        'require_uppercase', true,
        'require_lowercase', true,
        'require_number', true,
        'require_special', false,
        'expiry_days', 0
      ),
      'session_timeout_minutes', 480,
      'max_login_attempts', 5,
      'lock_duration_minutes', 30,
      'mfa_enabled', false
    )),
    'branding', COALESCE(os.settings->'branding', jsonb_build_object(
      'primary_color', '#2563eb',
      'secondary_color', '#64748b',
      'favicon_path', null,
      'login_title', 'Welcome to iFranchise HRMS',
      'login_subtitle', 'Sign in to manage your workforce',
      'footer_text', '© iFranchise. All rights reserved.'
    )),
    'integrations', COALESCE(os.settings->'integrations', jsonb_build_object(
      'smtp', jsonb_build_object('host', '', 'port', 587, 'username', '', 'from_email', '', 'use_tls', true, 'enabled', false),
      'google_calendar', jsonb_build_object('enabled', false, 'client_id', ''),
      'microsoft_outlook', jsonb_build_object('enabled', false, 'tenant_id', ''),
      'storage_provider', 'supabase',
      'webhook_url', '',
      'webhook_secret', '',
      'api_keys_enabled', false
    )),
    'backup', COALESCE(os.settings->'backup', jsonb_build_object(
      'backup_frequency', 'daily',
      'maintenance_mode', false,
      'maintenance_message', 'System is under maintenance. Please try again later.',
      'log_retention_days', 90
    )),
    'notifications_global', COALESCE(os.settings->'notifications_global', jsonb_build_object(
      'email_enabled', true,
      'in_app_enabled', true,
      'reminder_frequency_hours', 24,
      'digest_enabled', false,
      'digest_frequency', 'daily'
    )),
    'weekend_rules', COALESCE(os.settings->'weekend_rules', jsonb_build_object(
      'saturday', 'off',
      'sunday', 'off'
    )),
    'shift_defaults', COALESCE(os.settings->'shift_defaults', jsonb_build_object(
      'default_shift_template_id', null
    ))
  ),
  updated_at = public.utc_now()
WHERE os.deleted_at IS NULL;
