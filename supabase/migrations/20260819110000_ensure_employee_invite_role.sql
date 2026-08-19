-- Ensure the employee role is inviteable and mapped to the self-service portal.
UPDATE hrms.roles
SET
  status = 'active',
  is_provisionable = true,
  is_inviteable = true,
  portal_key = 'employee',
  portal_route = '/employee',
  updated_at = public.utc_now()
WHERE code = 'employee'
  AND deleted_at IS NULL;
