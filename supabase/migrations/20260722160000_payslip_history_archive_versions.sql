-- Payslip archive, version history, and retention

ALTER TABLE hrms.payslips
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN hrms.payslips.archived_at IS
  'When set, payslip is archived (never deleted). Historical record retained.';
COMMENT ON COLUMN hrms.payslips.is_current IS
  'False when superseded by a corrected republication. Employees see only current versions.';

CREATE INDEX IF NOT EXISTS payslips_archived_at_idx ON hrms.payslips (archived_at);
CREATE INDEX IF NOT EXISTS payslips_is_current_idx ON hrms.payslips (is_current);

CREATE TABLE IF NOT EXISTS hrms.payslip_versions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  payslip_id uuid NOT NULL REFERENCES hrms.payslips (id) ON DELETE RESTRICT,
  version_number integer NOT NULL,
  payslip_number text NOT NULL,
  storage_path text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  salary_credit_date date,
  published_at timestamptz,
  payroll_generated_at timestamptz,
  payment_mode text,
  transaction_reference text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT payslip_versions_number_positive CHECK (version_number > 0),
  CONSTRAINT payslip_versions_unique_version UNIQUE (payslip_id, version_number)
);

CREATE INDEX payslip_versions_payslip_id_idx ON hrms.payslip_versions (payslip_id);

ALTER TABLE hrms.payslip_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY payslip_versions_select_policy ON hrms.payslip_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM hrms.payslips ps
      WHERE ps.id = payslip_id
        AND ps.deleted_at IS NULL
        AND (
          ps.employee_id = hrms.current_user_employee_id()
          OR hrms.payroll_belongs_to_user_org(ps.payroll_id)
        )
    )
  );

CREATE POLICY payslip_versions_insert_policy ON hrms.payslip_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM hrms.payslips ps
      WHERE ps.id = payslip_id
        AND hrms.payroll_belongs_to_user_org(ps.payroll_id)
    )
  );
