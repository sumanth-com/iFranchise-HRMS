-- Per-employee tablet HRMS access. Desktop login is never gated by this flag.
-- Employees cannot grant themselves access (own-row UPDATE is blocked by trigger).

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS tablet_access_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN hrms.employees.tablet_access_enabled IS
  'When true, this employee may sign in and use the HRMS on a tablet. Desktop access is unaffected.';

CREATE INDEX IF NOT EXISTS employees_tablet_access_enabled_idx
  ON hrms.employees (organization_id, tablet_access_enabled)
  WHERE deleted_at IS NULL AND tablet_access_enabled = true;

CREATE OR REPLACE FUNCTION hrms.can_manage_employee_tablet_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    hrms.user_has_permission('employee.edit')
    OR hrms.user_has_permission('organization.edit')
    OR hrms.user_has_permission('portal.hr.access')
    OR hrms.user_has_permission('portal.ceo.access')
    OR hrms.user_has_permission('system.admin.access');
$$;

CREATE OR REPLACE FUNCTION hrms.guard_tablet_access_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.tablet_access_enabled IS DISTINCT FROM NEW.tablet_access_enabled
     AND auth.role() <> 'service_role'
     AND NOT hrms.can_manage_employee_tablet_access() THEN
    RAISE EXCEPTION 'You do not have permission to change tablet access';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_guard_tablet_access ON hrms.employees;
CREATE TRIGGER employees_guard_tablet_access
  BEFORE UPDATE ON hrms.employees
  FOR EACH ROW
  EXECUTE FUNCTION hrms.guard_tablet_access_change();

CREATE OR REPLACE FUNCTION hrms.set_employee_tablet_access(
  p_employee_id uuid,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT hrms.can_manage_employee_tablet_access() THEN
    RAISE EXCEPTION 'You do not have permission to change tablet access';
  END IF;

  SELECT organization_id
    INTO v_org
  FROM hrms.employees
  WHERE id = p_employee_id
    AND deleted_at IS NULL;

  IF v_org IS NULL OR NOT hrms.user_belongs_to_organization(v_org) THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  UPDATE hrms.employees
  SET tablet_access_enabled = p_enabled
  WHERE id = p_employee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION hrms.can_manage_employee_tablet_access() TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.set_employee_tablet_access(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.set_employee_tablet_access(uuid, boolean) TO service_role;
