-- Probation → full-time confirmation audit trail.
-- Does not alter date_of_joining. Salary changes continue to use salary_structures.

DO $$ BEGIN
  CREATE TYPE hrms.employment_confirmation_status AS ENUM (
    'pending_review',
    'confirmed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hrms.employment_confirmations (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  previous_designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  new_designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  previous_employment_type_id uuid REFERENCES hrms.employment_types (id) ON DELETE SET NULL,
  new_employment_type_id uuid REFERENCES hrms.employment_types (id) ON DELETE SET NULL,
  previous_gross_salary numeric(14, 2),
  new_gross_salary numeric(14, 2) NOT NULL CHECK (new_gross_salary >= 0),
  probation_end_date date,
  effective_date date NOT NULL,
  confirmation_status hrms.employment_confirmation_status NOT NULL DEFAULT 'pending_review',
  notes text,
  salary_structure_id uuid REFERENCES hrms.salary_structures (id) ON DELETE SET NULL,
  salary_revision_id uuid REFERENCES hrms.salary_revisions (id) ON DELETE SET NULL,
  confirmed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS hrms.employment_confirmation_events (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  confirmation_id uuid NOT NULL REFERENCES hrms.employment_confirmations (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT public.utc_now()
);

-- One live confirmed confirmation per employee (duplicate protection).
CREATE UNIQUE INDEX IF NOT EXISTS employment_confirmations_one_confirmed_per_employee
  ON hrms.employment_confirmations (employee_id)
  WHERE confirmation_status = 'confirmed' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employment_confirmations_org_status_idx
  ON hrms.employment_confirmations (organization_id, confirmation_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employment_confirmations_employee_idx
  ON hrms.employment_confirmations (employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employment_confirmation_events_confirmation_idx
  ON hrms.employment_confirmation_events (confirmation_id, created_at DESC);

SELECT public.attach_updated_at_trigger('hrms.employment_confirmations'::regclass);

GRANT SELECT, INSERT, UPDATE ON TABLE hrms.employment_confirmations TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE hrms.employment_confirmation_events TO authenticated, service_role;

ALTER TABLE hrms.employment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employment_confirmation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY employment_confirmations_select_policy ON hrms.employment_confirmations
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('employee.view')
      OR hrms.user_has_permission('employee.edit')
      OR hrms.user_has_permission('performance.view')
      OR hrms.user_has_permission('payroll.view')
      OR hrms.user_has_permission('portal.ceo.access')
      OR hrms.user_has_permission('system.admin.access')
    )
  );

CREATE POLICY employment_confirmations_insert_policy ON hrms.employment_confirmations
  FOR INSERT TO authenticated
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('employee.edit')
      OR hrms.user_has_permission('performance.edit')
      OR hrms.user_has_permission('payroll.edit')
      OR hrms.user_has_permission('portal.ceo.access')
      OR hrms.user_has_permission('system.admin.access')
    )
  );

CREATE POLICY employment_confirmations_update_policy ON hrms.employment_confirmations
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('employee.edit')
      OR hrms.user_has_permission('performance.edit')
      OR hrms.user_has_permission('payroll.edit')
      OR hrms.user_has_permission('portal.ceo.access')
      OR hrms.user_has_permission('system.admin.access')
    )
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
  );

CREATE POLICY employment_confirmation_events_select_policy ON hrms.employment_confirmation_events
  FOR SELECT TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('employee.view')
      OR hrms.user_has_permission('employee.edit')
      OR hrms.user_has_permission('performance.view')
      OR hrms.user_has_permission('payroll.view')
      OR hrms.user_has_permission('portal.ceo.access')
      OR hrms.user_has_permission('system.admin.access')
    )
  );

CREATE POLICY employment_confirmation_events_insert_policy ON hrms.employment_confirmation_events
  FOR INSERT TO authenticated
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('employee.edit')
      OR hrms.user_has_permission('performance.edit')
      OR hrms.user_has_permission('payroll.edit')
      OR hrms.user_has_permission('portal.ceo.access')
      OR hrms.user_has_permission('system.admin.access')
    )
  );

COMMENT ON TABLE hrms.employment_confirmations IS
  'Probation-to-full-time confirmation records with effective-dated salary/designation changes.';
