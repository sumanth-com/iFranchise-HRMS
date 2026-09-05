-- =============================================================================
-- Employee documents: hrms-documents bucket, year/month metadata, 10 MB limit,
-- soft-delete RPC, and storage path helper updates.
-- =============================================================================

-- New private bucket (10 MB per object)
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'hrms-documents',
  'hrms-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Align legacy bucket limit with the same 10 MB ceiling for new policy consistency.
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'employee-documents';

-- Year / month metadata for payslips & Form 16
ALTER TABLE hrms.employee_documents
  ADD COLUMN IF NOT EXISTS document_year integer,
  ADD COLUMN IF NOT EXISTS document_month integer;

ALTER TABLE hrms.employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_document_year_chk;
ALTER TABLE hrms.employee_documents
  ADD CONSTRAINT employee_documents_document_year_chk
  CHECK (document_year IS NULL OR (document_year >= 2000 AND document_year <= 2100));

ALTER TABLE hrms.employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_document_month_chk;
ALTER TABLE hrms.employee_documents
  ADD CONSTRAINT employee_documents_document_month_chk
  CHECK (document_month IS NULL OR (document_month >= 1 AND document_month <= 12));

CREATE INDEX IF NOT EXISTS employee_documents_period_idx
  ON hrms.employee_documents (employee_id, document_year, document_month)
  WHERE deleted_at IS NULL;

-- Storage path helper: support org-prefixed legacy paths AND employees/{id}/...
CREATE OR REPLACE FUNCTION hrms.storage_object_in_user_org(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_object_name IS NOT NULL
    AND p_object_name NOT LIKE '/%'
    AND p_object_name NOT LIKE '%..%'
    AND (
      EXISTS (
        SELECT 1
        FROM hrms.current_user_organization_ids() org_id
        WHERE p_object_name LIKE org_id::text || '/%'
      )
      OR EXISTS (
        SELECT 1
        FROM hrms.employees e
        WHERE e.deleted_at IS NULL
          AND e.organization_id IN (SELECT hrms.current_user_organization_ids())
          AND p_object_name LIKE 'employees/' || e.id::text || '/%'
      )
    );
$$;

-- Soft-delete RPC (avoids SELECT RLS conflict after deleted_at is set)
CREATE OR REPLACE FUNCTION hrms.soft_delete_own_employee_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
  v_employee_id uuid;
  v_is_official boolean;
  v_source text;
BEGIN
  SELECT ed.employee_id, ed.is_official, ed.source
  INTO v_employee_id, v_is_official, v_source
  FROM hrms.employee_documents ed
  WHERE ed.id = p_document_id
    AND ed.deleted_at IS NULL;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  IF v_employee_id IS DISTINCT FROM hrms.current_user_employee_id() THEN
    RAISE EXCEPTION 'You can only manage your own documents';
  END IF;

  IF COALESCE(v_is_official, false) OR COALESCE(v_source, 'upload') <> 'upload' THEN
    RAISE EXCEPTION 'Company-issued documents are read-only';
  END IF;

  UPDATE hrms.employee_documents
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE id = p_document_id
    AND employee_id = v_employee_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION hrms.soft_delete_own_employee_document(uuid) TO authenticated, service_role;

-- Storage RLS for hrms-documents (mirror employee-documents policies)
DROP POLICY IF EXISTS "hrms_documents_select_policy" ON storage.objects;
CREATE POLICY "hrms_documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hrms-documents'
  AND hrms.user_can_read_storage_document(name)
);

DROP POLICY IF EXISTS "hrms_documents_insert_policy" ON storage.objects;
CREATE POLICY "hrms_documents_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hrms-documents'
  AND (
    hrms.user_has_permission('documents.upload')
    OR hrms.user_has_permission('documents.manage')
  )
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "hrms_documents_update_policy" ON storage.objects;
CREATE POLICY "hrms_documents_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hrms-documents'
  AND (
    hrms.user_has_permission('documents.upload')
    OR hrms.user_has_permission('documents.manage')
  )
  AND hrms.storage_object_in_user_org(name)
)
WITH CHECK (
  bucket_id = 'hrms-documents'
  AND (
    hrms.user_has_permission('documents.upload')
    OR hrms.user_has_permission('documents.manage')
  )
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "hrms_documents_delete_policy" ON storage.objects;
CREATE POLICY "hrms_documents_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hrms-documents'
  AND (
    hrms.user_has_permission('documents.delete')
    OR hrms.user_has_permission('documents.manage')
    OR hrms.storage_path_owned_by_employee(name, hrms.current_user_employee_id())
  )
  AND hrms.storage_object_in_user_org(name)
);

-- Cap org document upload setting at 10 MB
UPDATE hrms.organization_settings
SET settings = jsonb_set(
  settings,
  '{documents,maxUploadSizeMb}',
  '10'::jsonb,
  true
)
WHERE deleted_at IS NULL;

-- Display name polish for explorer slots
UPDATE hrms.document_types
SET name = 'Additional Education Documents', updated_at = now()
WHERE code = 'EDUCATION_ADDITIONAL' AND deleted_at IS NULL;

UPDATE hrms.document_types
SET name = 'Offer Letter', updated_at = now()
WHERE code = 'PREVIOUS_OFFER_LETTER' AND deleted_at IS NULL;

UPDATE hrms.document_types
SET name = 'Employment Payslips', updated_at = now()
WHERE code = 'PREVIOUS_PAYSLIPS' AND deleted_at IS NULL;

UPDATE hrms.document_types
SET name = 'Professional Certificates', updated_at = now()
WHERE code = 'CERTIFICATION' AND deleted_at IS NULL;

UPDATE hrms.document_types
SET name = 'Professional License Certificates', updated_at = now()
WHERE code = 'PROFESSIONAL_LICENSE' AND deleted_at IS NULL;
