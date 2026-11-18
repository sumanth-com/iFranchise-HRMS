-- Collapse the per-role assignment/permission count queries on the role list
-- into one request while preserving caller RLS visibility and exact counts.
CREATE OR REPLACE FUNCTION hrms.get_role_list_counts(
  p_organization_id uuid,
  p_role_ids uuid[]
)
RETURNS TABLE (
  role_id uuid,
  user_count bigint,
  permission_count bigint
)
LANGUAGE sql
STABLE
SET search_path = hrms, pg_temp
AS $$
  WITH requested_roles AS (
    SELECT DISTINCT requested.role_id
    FROM unnest(COALESCE(p_role_ids, ARRAY[]::uuid[])) AS requested(role_id)
  ), user_counts AS (
    SELECT ur.role_id, COUNT(*) AS user_count
    FROM hrms.user_roles ur
    INNER JOIN requested_roles requested ON requested.role_id = ur.role_id
    WHERE ur.organization_id = p_organization_id
      AND ur.deleted_at IS NULL
      AND ur.status = 'active'
    GROUP BY ur.role_id
  ), permission_counts AS (
    SELECT rp.role_id, COUNT(*) AS permission_count
    FROM hrms.role_permissions rp
    INNER JOIN requested_roles requested ON requested.role_id = rp.role_id
    WHERE rp.deleted_at IS NULL
      AND rp.status = 'active'
    GROUP BY rp.role_id
  )
  SELECT requested.role_id,
         COALESCE(user_counts.user_count, 0),
         COALESCE(permission_counts.permission_count, 0)
  FROM requested_roles requested
  LEFT JOIN user_counts ON user_counts.role_id = requested.role_id
  LEFT JOIN permission_counts ON permission_counts.role_id = requested.role_id;
$$;

GRANT EXECUTE ON FUNCTION hrms.get_role_list_counts(uuid, uuid[]) TO authenticated;

-- Compute the four Audit Trail KPI counts from one scoped table pass instead
-- of issuing four separate exact-count HTTP requests.
CREATE OR REPLACE FUNCTION hrms.get_audit_summary_card_stats(
  p_organization_id uuid,
  p_today_start timestamptz,
  p_modules text[]
)
RETURNS TABLE (
  total_today bigint,
  critical_actions bigint,
  failed_actions bigint,
  login_events bigint
)
LANGUAGE sql
STABLE
SET search_path = hrms, pg_temp
AS $$
  SELECT COUNT(*) AS total_today,
         COUNT(*) FILTER (WHERE priority = 'critical') AS critical_actions,
         COUNT(*) FILTER (WHERE event_status = 'failed') AS failed_actions,
         COUNT(*) FILTER (WHERE action = 'login') AS login_events
  FROM hrms.audit_logs
  WHERE organization_id = p_organization_id
    AND occurred_at >= p_today_start
    AND deleted_at IS NULL
    AND archived_at IS NULL
    AND (p_modules IS NULL OR module = ANY(p_modules));
$$;

GRANT EXECUTE ON FUNCTION hrms.get_audit_summary_card_stats(uuid, timestamptz, text[]) TO authenticated;
