-- Super Admin portal entitlement: system administration only by default.
-- Business portals (HR / Executive / Manager / Employee) require explicit
-- portal.*.access grants — not implied by the super_admin role or employee row.

-- 1) Revoke blanket business-portal access from super_admin.
UPDATE hrms.role_permissions rp
SET
  status = 'inactive',
  deleted_at = public.utc_now(),
  updated_at = public.utc_now()
FROM hrms.roles r
JOIN hrms.permissions p ON p.id = rp.permission_id
WHERE rp.role_id = r.id
  AND r.code = 'super_admin'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN (
    'portal.hr.access',
    'portal.ceo.access',
    'portal.manager.access',
    'portal.employee.access'
  )
  AND rp.deleted_at IS NULL
  AND rp.status = 'active';

-- 2) Point super_admin home route at the Super Admin portal.
UPDATE hrms.roles
SET
  portal_route = '/dashboard/system',
  updated_at = public.utc_now()
WHERE code = 'super_admin'
  AND deleted_at IS NULL;

-- 3) Align SQL portal routing helper with system-only Super Admin home.
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
        WHEN 'employee' THEN 8
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
