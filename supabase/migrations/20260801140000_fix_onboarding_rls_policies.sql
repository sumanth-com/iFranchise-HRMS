-- Fix onboarding RLS: timeline events and related tables were missing INSERT policies.

DROP POLICY IF EXISTS onboarding_timeline_org_access ON hrms.onboarding_timeline_events;

CREATE POLICY onboarding_timeline_org_access ON hrms.onboarding_timeline_events
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_policy_ack_org_access ON hrms.onboarding_policy_acknowledgements
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_agreements_org_access ON hrms.onboarding_agreements
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_signatures_org_access ON hrms.onboarding_signatures
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_invitation_tokens_org_access ON hrms.onboarding_invitation_tokens
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT e.organization_id FROM hrms.employees e
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_portal_accounts_org_access ON hrms.onboarding_portal_accounts
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_portal_sessions_org_access ON hrms.onboarding_portal_sessions
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );
