-- CEO approval step for exit resignations + portal permissions

ALTER TABLE hrms.exit_resignations
  ADD COLUMN IF NOT EXISTS ceo_acted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ceo_acted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ceo_remarks text;

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('ceo', 'founder', 'co_founder')
  AND p.code IN ('exit.view', 'exit.approve')
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
