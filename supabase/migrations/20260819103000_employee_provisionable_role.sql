-- Allow the employee role to be provisioned from User Provisioning.
UPDATE hrms.roles
SET
  is_provisionable = true,
  portal_key = 'employee',
  updated_at = public.utc_now()
WHERE code = 'employee'
  AND deleted_at IS NULL;
