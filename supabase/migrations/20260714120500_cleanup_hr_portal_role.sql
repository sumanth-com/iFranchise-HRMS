-- Keep the HR account in the HR portal boundary only.
UPDATE hrms.user_roles ur
SET
  status = 'inactive',
  deleted_at = COALESCE(ur.deleted_at, public.utc_now()),
  updated_at = public.utc_now()
FROM auth.users au
JOIN hrms.roles r
  ON r.code = 'employee'
  AND r.deleted_at IS NULL
WHERE ur.user_id = au.id
  AND ur.role_id = r.id
  AND lower(au.email) = 'sumanth.reddy@ifranchise.in'
  AND ur.deleted_at IS NULL;
