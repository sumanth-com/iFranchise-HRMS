-- HR/Admin (employee.edit) may change profile photos and employment type.
-- Employees keep employee_profile.edit for personal fields, but not photos or type.

DROP POLICY IF EXISTS "employee_profile_images_insert_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee.edit')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_profile_images_update_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee.edit')
  AND hrms.storage_object_in_user_org(name)
)
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee.edit')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_profile_images_delete_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee.edit')
  AND hrms.storage_object_in_user_org(name)
);

CREATE OR REPLACE FUNCTION hrms.guard_employment_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.employment_type_id IS DISTINCT FROM NEW.employment_type_id
     AND auth.role() <> 'service_role'
     AND NOT hrms.user_has_permission('employee.edit') THEN
    RAISE EXCEPTION 'You do not have permission to change employment type';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_guard_employment_type ON hrms.employees;
CREATE TRIGGER employees_guard_employment_type
  BEFORE UPDATE ON hrms.employees
  FOR EACH ROW
  EXECUTE FUNCTION hrms.guard_employment_type_change();

CREATE OR REPLACE FUNCTION hrms.guard_profile_image_path_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.profile_image_storage_path IS DISTINCT FROM NEW.profile_image_storage_path
     AND auth.role() <> 'service_role'
     AND NOT hrms.user_has_permission('employee.edit') THEN
    RAISE EXCEPTION 'You do not have permission to change this profile photo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_profiles_guard_profile_image ON hrms.employee_profiles;
CREATE TRIGGER employee_profiles_guard_profile_image
  BEFORE UPDATE ON hrms.employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION hrms.guard_profile_image_path_change();
