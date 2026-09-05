-- Allow employees to soft-delete their own uploaded documents without RLS
-- "new row violates..." failures caused by SELECT policies requiring deleted_at IS NULL
-- while PostgREST RETURNING re-checks the updated row.

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

COMMENT ON FUNCTION hrms.soft_delete_own_employee_document(uuid) IS
  'Soft-deletes the signed-in employee''s own uploaded document (bypasses SELECT RLS on deleted rows).';

GRANT EXECUTE ON FUNCTION hrms.soft_delete_own_employee_document(uuid) TO authenticated, service_role;
