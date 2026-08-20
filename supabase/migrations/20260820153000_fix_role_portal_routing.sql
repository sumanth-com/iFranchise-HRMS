-- Ensure every org role has portal metadata and portal routing respects assigned role.

UPDATE hrms.roles
SET
  portal_key = CASE code
    WHEN 'founder' THEN 'ceo'
    WHEN 'co_founder' THEN 'ceo'
    WHEN 'ceo' THEN 'ceo'
    WHEN 'hr_admin' THEN 'hr'
    WHEN 'hr_executive' THEN 'hr'
    WHEN 'super_admin' THEN 'hr'
    WHEN 'manager' THEN 'manager'
    WHEN 'employee' THEN 'employee'
    ELSE portal_key
  END,
  portal_route = CASE code
    WHEN 'founder' THEN '/ceo'
    WHEN 'co_founder' THEN '/ceo'
    WHEN 'ceo' THEN '/ceo'
    WHEN 'hr_admin' THEN '/dashboard'
    WHEN 'hr_executive' THEN '/dashboard'
    WHEN 'super_admin' THEN '/dashboard'
    WHEN 'manager' THEN '/manager'
    WHEN 'employee' THEN '/employee'
    ELSE portal_route
  END,
  updated_at = public.utc_now()
WHERE deleted_at IS NULL
  AND code IN (
    'founder',
    'co_founder',
    'ceo',
    'hr_admin',
    'hr_executive',
    'super_admin',
    'manager',
    'employee'
  );

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
          WHEN 'super_admin' THEN '/dashboard'
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
