-- Payroll settings & bonus module enhancements

ALTER TYPE hrms.bonus_type ADD VALUE IF NOT EXISTS 'retention';
ALTER TYPE hrms.bonus_type ADD VALUE IF NOT EXISTS 'joining';
ALTER TYPE hrms.bonus_type ADD VALUE IF NOT EXISTS 'annual';
ALTER TYPE hrms.bonus_type ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE hrms.employee_bonuses
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS approver_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS hrms.bonus_approvals (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  bonus_id uuid NOT NULL REFERENCES hrms.employee_bonuses (id) ON DELETE CASCADE,
  approver_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  approval_level smallint NOT NULL DEFAULT 1 CHECK (approval_level >= 1),
  approval_status hrms.approval_status NOT NULL DEFAULT 'pending',
  comments text,
  acted_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT bonus_approvals_unique_level UNIQUE (bonus_id, approval_level)
);

CREATE INDEX IF NOT EXISTS bonus_approvals_bonus_id_idx ON hrms.bonus_approvals (bonus_id);

ALTER TABLE hrms.bonus_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY bonus_approvals_select_policy ON hrms.bonus_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.employee_bonuses b
      WHERE b.id = bonus_id
        AND b.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND b.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY bonus_approvals_insert_policy ON hrms.bonus_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.employee_bonuses b
      WHERE b.id = bonus_id
        AND b.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY bonus_approvals_update_policy ON hrms.bonus_approvals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.employee_bonuses b
      WHERE b.id = bonus_id
        AND b.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

SELECT public.attach_updated_at_trigger('hrms.bonus_approvals'::regclass);

UPDATE hrms.organization_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{payroll}',
  COALESCE(settings->'payroll', '{}'::jsonb) || jsonb_build_object(
    'payroll_cycle', 'monthly',
    'payroll_processing_day', 'last_working_day',
    'salary_credit_date', 1,
    'financial_year_start_month', 4,
    'financial_year_end_month', 3,
    'currency', 'INR',
    'working_days_calculation', 'calendar_days',
    'attendance_rules', jsonb_build_object(
      'minimum_working_hours', 8,
      'half_day_threshold', 4,
      'late_mark_threshold', '10:15',
      'overtime_calculation', true,
      'auto_calculate_attendance', true,
      'ignore_weekends', true,
      'ignore_company_holidays', true
    ),
    'leave_integration', jsonb_build_object(
      'paid_leave_deduction', false,
      'loss_of_pay_deduction', true,
      'half_day_deduction', true,
      'sandwich_leave_policy', false,
      'include_holidays_in_leave', false
    ),
    'salary_components', jsonb_build_object(
      'basic', true, 'hra', true, 'special_allowance', true, 'medical', true,
      'travel', true, 'pf', true, 'esi', true, 'professional_tax', true,
      'income_tax', true, 'bonus', true, 'reimbursement', true, 'other_deduction', true
    ),
    'approval_workflow', jsonb_build_array('hr', 'finance', 'super_admin'),
    'payslip', jsonb_build_object(
      'company_logo_path', null,
      'company_name', 'iFranchise',
      'footer_message', 'This is a system-generated payslip.',
      'authorized_signature', null,
      'auto_email_payslips', true,
      'generate_pdf_automatically', true
    ),
    'notifications', jsonb_build_object(
      'notify_employee', true,
      'notify_finance', true,
      'notify_hr', true,
      'email_payslip', true,
      'reminder_before_payroll_run', true
    ),
    'payroll_lock', jsonb_build_object(
      'lock_after_approval', true,
      'allow_reopening', false,
      'require_approval_before_unlock', true
    )
  ),
  true
)
WHERE deleted_at IS NULL;
