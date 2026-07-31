-- =============================================================================
-- Migration: enterprise_security_hardening
-- Description: Permission-aware RLS for sensitive HR data, onboarding credentials,
--              storage path scoping, and audit log integrity
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.user_can_view_employee_financial(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_employee_id = hrms.current_user_employee_id()
    OR (
      hrms.user_has_permission('employee.edit')
      AND hrms.employee_belongs_to_user_org(p_employee_id)
    );
$$;

COMMENT ON FUNCTION hrms.user_can_view_employee_financial(uuid) IS
  'Self or HR users with employee.edit within the same organization.';

GRANT EXECUTE ON FUNCTION hrms.user_can_view_employee_financial(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.user_can_view_employee_payroll(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_employee_id = hrms.current_user_employee_id()
    OR (
      hrms.user_has_permission('payroll.view')
      AND hrms.employee_belongs_to_user_org(p_employee_id)
    );
$$;

COMMENT ON FUNCTION hrms.user_can_view_employee_payroll(uuid) IS
  'Self or users with payroll.view within the same organization.';

GRANT EXECUTE ON FUNCTION hrms.user_can_view_employee_payroll(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.user_can_view_employee_document_row(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_employee_id = hrms.current_user_employee_id()
    OR hrms.user_has_permission('documents.manage')
    OR hrms.user_has_permission('documents.verify')
    OR (
      hrms.user_has_permission('documents.view')
      AND hrms.user_has_permission('employee.view')
      AND NOT hrms.user_has_permission('employee_profile.edit')
      AND hrms.employee_belongs_to_user_org(p_employee_id)
    );
$$;

COMMENT ON FUNCTION hrms.user_can_view_employee_document_row(uuid) IS
  'Self, HR document staff, or managers viewing team document metadata.';

GRANT EXECUTE ON FUNCTION hrms.user_can_view_employee_document_row(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.storage_path_owned_by_employee(p_object_name text, p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_object_name IS NOT NULL
    AND p_employee_id IS NOT NULL
    AND p_object_name LIKE '%/' || p_employee_id::text || '/%';
$$;

GRANT EXECUTE ON FUNCTION hrms.storage_path_owned_by_employee(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.user_can_read_storage_document(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    hrms.storage_object_in_user_org(p_object_name)
    AND (
      hrms.user_has_permission('documents.manage')
      OR hrms.user_has_permission('documents.verify')
      OR hrms.storage_path_owned_by_employee(p_object_name, hrms.current_user_employee_id())
    );
$$;

GRANT EXECUTE ON FUNCTION hrms.user_can_read_storage_document(text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Financial & payroll tables
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS bank_accounts_select_policy ON hrms.bank_accounts;
CREATE POLICY bank_accounts_select_policy ON hrms.bank_accounts
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_can_view_employee_financial(employee_id)
  );

DROP POLICY IF EXISTS salary_structures_select_policy ON hrms.salary_structures;
CREATE POLICY salary_structures_select_policy ON hrms.salary_structures
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_can_view_employee_payroll(employee_id)
  );

DROP POLICY IF EXISTS payrolls_select_policy ON hrms.payrolls;
CREATE POLICY payrolls_select_policy ON hrms.payrolls
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_belongs_to_organization(organization_id)
    AND hrms.user_has_permission('payroll.view')
  );

DROP POLICY IF EXISTS payroll_items_select_policy ON hrms.payroll_items;
CREATE POLICY payroll_items_select_policy ON hrms.payroll_items
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_can_view_employee_payroll(employee_id)
  );

DROP POLICY IF EXISTS payslips_select_policy ON hrms.payslips;
CREATE POLICY payslips_select_policy ON hrms.payslips
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_can_view_employee_payroll(employee_id)
  );

-- -----------------------------------------------------------------------------
-- Employee mutations
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS employees_insert_policy ON hrms.employees;
CREATE POLICY employees_insert_policy ON hrms.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND hrms.user_has_permission('employee.create')
  );

DROP POLICY IF EXISTS employees_update_policy ON hrms.employees;
CREATE POLICY employees_update_policy ON hrms.employees
  FOR UPDATE TO authenticated
  USING (
    id = hrms.current_user_employee_id()
    OR (
      hrms.user_belongs_to_organization(organization_id)
      AND hrms.user_has_permission('employee.edit')
    )
  )
  WITH CHECK (
    id = hrms.current_user_employee_id()
    OR (
      hrms.user_belongs_to_organization(organization_id)
      AND hrms.user_has_permission('employee.edit')
    )
  );

-- -----------------------------------------------------------------------------
-- Employee documents
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS employee_documents_select_policy ON hrms.employee_documents;
CREATE POLICY employee_documents_select_policy ON hrms.employee_documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_can_view_employee_document_row(employee_id)
  );

DROP POLICY IF EXISTS "employee_documents_select_policy" ON storage.objects;
CREATE POLICY "employee_documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.view')
  AND hrms.user_can_read_storage_document(name)
);

-- -----------------------------------------------------------------------------
-- Onboarding: HR permission + deny credential tables to authenticated users
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS onboarding_cases_org_access ON hrms.onboarding_cases;
CREATE POLICY onboarding_cases_org_access ON hrms.onboarding_cases
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT e.organization_id FROM hrms.employees e
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL
    )
    AND (
      hrms.user_has_permission('onboarding.view')
      OR hrms.user_has_permission('onboarding.manage')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id FROM hrms.employees e
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL
    )
    AND hrms.user_has_permission('onboarding.manage')
  );

DROP POLICY IF EXISTS onboarding_sections_org_access ON hrms.onboarding_sections;
CREATE POLICY onboarding_sections_org_access ON hrms.onboarding_sections
  FOR ALL TO authenticated
  USING (
    hrms.user_has_permission('onboarding.view')
    OR hrms.user_has_permission('onboarding.manage')
  )
  WITH CHECK (hrms.user_has_permission('onboarding.manage'));

DROP POLICY IF EXISTS onboarding_documents_org_access ON hrms.onboarding_documents;
CREATE POLICY onboarding_documents_org_access ON hrms.onboarding_documents
  FOR ALL TO authenticated
  USING (
    hrms.user_has_permission('onboarding.view')
    OR hrms.user_has_permission('onboarding.manage')
  )
  WITH CHECK (hrms.user_has_permission('onboarding.manage'));

DROP POLICY IF EXISTS onboarding_timeline_org_access ON hrms.onboarding_timeline_events;
CREATE POLICY onboarding_timeline_org_access ON hrms.onboarding_timeline_events
  FOR ALL TO authenticated
  USING (
    hrms.user_has_permission('onboarding.view')
    OR hrms.user_has_permission('onboarding.manage')
  )
  WITH CHECK (hrms.user_has_permission('onboarding.manage'));

DROP POLICY IF EXISTS onboarding_policy_ack_org_access ON hrms.onboarding_policy_acknowledgements;
CREATE POLICY onboarding_policy_ack_org_access ON hrms.onboarding_policy_acknowledgements
  FOR ALL TO authenticated
  USING (
    hrms.user_has_permission('onboarding.view')
    OR hrms.user_has_permission('onboarding.manage')
  )
  WITH CHECK (hrms.user_has_permission('onboarding.manage'));

DROP POLICY IF EXISTS onboarding_agreements_org_access ON hrms.onboarding_agreements;
CREATE POLICY onboarding_agreements_org_access ON hrms.onboarding_agreements
  FOR ALL TO authenticated
  USING (
    hrms.user_has_permission('onboarding.view')
    OR hrms.user_has_permission('onboarding.manage')
  )
  WITH CHECK (hrms.user_has_permission('onboarding.manage'));

DROP POLICY IF EXISTS onboarding_signatures_org_access ON hrms.onboarding_signatures;
CREATE POLICY onboarding_signatures_org_access ON hrms.onboarding_signatures
  FOR ALL TO authenticated
  USING (
    hrms.user_has_permission('onboarding.view')
    OR hrms.user_has_permission('onboarding.manage')
  )
  WITH CHECK (hrms.user_has_permission('onboarding.manage'));

DROP POLICY IF EXISTS onboarding_invitation_tokens_org_access ON hrms.onboarding_invitation_tokens;
DROP POLICY IF EXISTS onboarding_portal_accounts_org_access ON hrms.onboarding_portal_accounts;
DROP POLICY IF EXISTS onboarding_portal_sessions_org_access ON hrms.onboarding_portal_sessions;

-- Credential tables: service role only (candidate flows use admin client server-side)
REVOKE ALL ON hrms.onboarding_invitation_tokens FROM authenticated;
REVOKE ALL ON hrms.onboarding_portal_accounts FROM authenticated;
REVOKE ALL ON hrms.onboarding_portal_sessions FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.onboarding_invitation_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.onboarding_portal_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.onboarding_portal_sessions TO service_role;

-- -----------------------------------------------------------------------------
-- Email approval tokens: service role only
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS email_approval_tokens_select_policy ON hrms.email_approval_tokens;
REVOKE ALL ON hrms.email_approval_tokens FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.email_approval_tokens TO service_role;

-- -----------------------------------------------------------------------------
-- Application audit writer: org membership required
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.write_application_audit(
  p_organization_id uuid,
  p_module text,
  p_action text,
  p_description text,
  p_record_id text DEFAULT 'system',
  p_event_status hrms.audit_event_status DEFAULT 'success',
  p_priority hrms.audit_priority DEFAULT 'medium',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_operating_system text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_organization_id IS NOT NULL
    AND NOT hrms.user_belongs_to_organization(p_organization_id)
    AND NOT public.is_service_role()
  THEN
    RAISE EXCEPTION 'Unauthorized audit write for organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO hrms.audit_logs (
    organization_id, user_id, schema_name, table_name, record_id, operation,
    module, action, description, new_record, event_status, priority,
    ip_address, user_agent, device_type, browser, operating_system, reason,
    occurred_at, created_by
  ) VALUES (
    p_organization_id,
    public.current_user_id(),
    'hrms',
    'application',
    p_record_id,
    'INSERT',
    p_module,
    p_action,
    p_description,
    p_metadata,
    p_event_status,
    p_priority,
    p_ip_address,
    p_user_agent,
    p_device_type,
    p_browser,
    p_operating_system,
    p_reason,
    public.utc_now(),
    public.current_user_id()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
