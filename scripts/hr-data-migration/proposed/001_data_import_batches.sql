-- Migration: data_import_batches for HR Excel import audit (no PII/bank payloads).

CREATE TABLE IF NOT EXISTS hrms.data_import_batches (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  source_filename text NOT NULL,
  import_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT public.utc_now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'dry_run', 'completed', 'failed', 'cancelled')),
  record_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  imported_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  CONSTRAINT data_import_batches_source_not_empty CHECK (length(trim(source_filename)) > 0),
  CONSTRAINT data_import_batches_type_not_empty CHECK (length(trim(import_type)) > 0)
);

CREATE INDEX IF NOT EXISTS data_import_batches_org_idx
  ON hrms.data_import_batches (organization_id);
CREATE INDEX IF NOT EXISTS data_import_batches_status_idx
  ON hrms.data_import_batches (status);
CREATE INDEX IF NOT EXISTS data_import_batches_started_at_idx
  ON hrms.data_import_batches (started_at DESC);

COMMENT ON TABLE hrms.data_import_batches IS
  'Import audit batches for HR data migrations. No sensitive PII/bank payloads.';

ALTER TABLE hrms.data_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_import_batches_select ON hrms.data_import_batches;
CREATE POLICY data_import_batches_select
  ON hrms.data_import_batches
  FOR SELECT
  TO authenticated
  USING (
    organization_id = hrms.current_user_organization_id()
    AND (
      hrms.user_has_permission('payroll.view')
      OR hrms.user_has_permission('employee.edit')
      OR hrms.user_has_permission('portal.ceo.access')
    )
  );
