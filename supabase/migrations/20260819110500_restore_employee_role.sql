-- Restore the system Employee role so HR can invite self-service portal users.
UPDATE hrms.roles
SET
  status = 'active',
  deleted_at = NULL,
  is_provisionable = true,
  is_inviteable = true,
  portal_key = 'employee',
  portal_route = '/employee',
  updated_at = public.utc_now()
WHERE code = 'employee';
