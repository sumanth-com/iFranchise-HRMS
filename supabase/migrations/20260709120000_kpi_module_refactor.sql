-- KPI module refactor: enterprise workflow fields

DO $$ BEGIN
  CREATE TYPE hrms.kpi_measurement_type AS ENUM ('number', 'percentage', 'rating', 'currency');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.kpi_assignment_status AS ENUM ('not_started', 'in_progress', 'completed', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Templates
ALTER TABLE hrms.performance_kpi_templates
  ADD COLUMN IF NOT EXISTS measurement_type hrms.kpi_measurement_type NOT NULL DEFAULT 'number',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Assignments
ALTER TABLE hrms.performance_kpis
  ADD COLUMN IF NOT EXISTS measurement_type hrms.kpi_measurement_type NOT NULL DEFAULT 'number',
  ADD COLUMN IF NOT EXISTS kpi_status hrms.kpi_assignment_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS manager_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress_comments text,
  ADD COLUMN IF NOT EXISTS evidence_notes text,
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz;

CREATE INDEX IF NOT EXISTS performance_kpis_kpi_status_idx
  ON hrms.performance_kpis (kpi_status);
CREATE INDEX IF NOT EXISTS performance_kpis_end_date_idx
  ON hrms.performance_kpis (end_date);
CREATE INDEX IF NOT EXISTS performance_kpis_manager_idx
  ON hrms.performance_kpis (manager_employee_id);

-- KPI-specific permissions
INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'::hrms.record_status
FROM (
  VALUES
    ('kpi.view', 'performance', 'view', 'kpi', 'View employee KPIs'),
    ('kpi.manage', 'performance', 'manage', 'kpi', 'Manage KPI templates and assignments'),
    ('kpi.progress', 'performance', 'progress', 'kpi', 'Update KPI progress for team members')
) AS v(code, module, action, resource, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND p.code IN ('kpi.view', 'kpi.manage', 'kpi.progress')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin'
  AND p.code IN ('kpi.view', 'kpi.manage', 'kpi.progress')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND p.code IN ('kpi.view', 'kpi.progress')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'employee'
  AND p.code = 'kpi.view'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Backfill manager from employee reporting manager
UPDATE hrms.performance_kpis pk
SET manager_employee_id = e.reporting_manager_id
FROM hrms.employees e
WHERE pk.employee_id = e.id
  AND pk.manager_employee_id IS NULL
  AND e.reporting_manager_id IS NOT NULL;

-- Backfill measurement type from templates
UPDATE hrms.performance_kpis pk
SET measurement_type = t.measurement_type
FROM hrms.performance_kpi_templates t
WHERE pk.template_id = t.id
  AND pk.measurement_type = 'number'
  AND t.measurement_type IS NOT NULL;
