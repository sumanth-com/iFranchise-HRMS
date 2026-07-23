-- =============================================================================
-- Migration: employee_permanent_delete
-- Description: Hard-delete an employee and all dependent HRMS records (service role)
-- =============================================================================

CREATE OR REPLACE FUNCTION hrms.permanently_delete_employee(
  p_organization_id uuid,
  p_employee_id uuid,
  p_deleted_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public, extensions
AS $$
DECLARE
  v_employee hrms.employees%ROWTYPE;
  v_profile_image text;
  v_document_paths jsonb;
  v_payslip_paths jsonb;
BEGIN
  PERFORM public.require_service_role();

  SELECT *
  INTO v_employee
  FROM hrms.employees
  WHERE id = p_employee_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_deleted_by IS NOT NULL AND p_deleted_by = v_employee.user_id THEN
    RAISE EXCEPTION 'You cannot delete your own employee account'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT ep.profile_image_storage_path
  INTO v_profile_image
  FROM hrms.employee_profiles ep
  WHERE ep.employee_id = p_employee_id
  LIMIT 1;

  SELECT coalesce(jsonb_agg(ed.storage_path), '[]'::jsonb)
  INTO v_document_paths
  FROM hrms.employee_documents ed
  WHERE ed.employee_id = p_employee_id
    AND ed.storage_path IS NOT NULL;

  SELECT coalesce(jsonb_agg(ps.storage_path), '[]'::jsonb)
  INTO v_payslip_paths
  FROM hrms.payslips ps
  WHERE ps.employee_id = p_employee_id
    AND ps.storage_path IS NOT NULL;

  -- Clear references from other records
  UPDATE hrms.employees
  SET reporting_manager_id = NULL,
      updated_at = public.utc_now()
  WHERE reporting_manager_id = p_employee_id;

  UPDATE hrms.branches
  SET branch_head_id = NULL,
      updated_at = public.utc_now()
  WHERE branch_head_id = p_employee_id;

  UPDATE hrms.departments
  SET department_head_id = NULL,
      updated_at = public.utc_now()
  WHERE department_head_id = p_employee_id;

  UPDATE hrms.recruitment_job_openings
  SET hiring_manager_id = NULL,
      updated_at = public.utc_now()
  WHERE hiring_manager_id = p_employee_id;

  UPDATE hrms.recruitment_candidates
  SET employee_id = NULL,
      updated_at = public.utc_now()
  WHERE employee_id = p_employee_id;

  UPDATE hrms.recruitment_offers
  SET reporting_manager_id = NULL,
      employee_id = NULL,
      updated_at = public.utc_now()
  WHERE reporting_manager_id = p_employee_id
     OR employee_id = p_employee_id;

  UPDATE hrms.employee_documents
  SET replaced_by_id = NULL,
      updated_at = public.utc_now()
  WHERE replaced_by_id IN (
    SELECT id FROM hrms.employee_documents WHERE employee_id = p_employee_id
  );

  -- Payroll
  DELETE FROM hrms.payslip_versions
  WHERE payslip_id IN (
    SELECT id FROM hrms.payslips WHERE employee_id = p_employee_id
  );

  DELETE FROM hrms.payslips WHERE employee_id = p_employee_id;
  DELETE FROM hrms.payroll_items WHERE employee_id = p_employee_id;
  DELETE FROM hrms.payroll_approvals WHERE approver_employee_id = p_employee_id;
  DELETE FROM hrms.employee_bonuses WHERE employee_id = p_employee_id;
  DELETE FROM hrms.employee_reimbursements WHERE employee_id = p_employee_id;
  DELETE FROM hrms.salary_revisions
  WHERE employee_id = p_employee_id
     OR approver_employee_id = p_employee_id;
  DELETE FROM hrms.salary_structures WHERE employee_id = p_employee_id;

  -- Attendance
  DELETE FROM hrms.attendance_corrections
  WHERE employee_id = p_employee_id
     OR attendance_id IN (
       SELECT id FROM hrms.attendance WHERE employee_id = p_employee_id
     );

  DELETE FROM hrms.attendance WHERE employee_id = p_employee_id;

  -- Leave
  DELETE FROM hrms.leave_approvals
  WHERE approver_employee_id = p_employee_id
     OR leave_request_id IN (
       SELECT id FROM hrms.leave_requests WHERE employee_id = p_employee_id
     );

  DELETE FROM hrms.leave_requests WHERE employee_id = p_employee_id;
  DELETE FROM hrms.leave_balances WHERE employee_id = p_employee_id;

  -- Performance
  DELETE FROM hrms.performance_promotion_approvals
  WHERE approver_employee_id = p_employee_id
     OR promotion_id IN (
       SELECT id FROM hrms.performance_promotions WHERE employee_id = p_employee_id
     );

  DELETE FROM hrms.performance_promotions WHERE employee_id = p_employee_id;

  DELETE FROM hrms.performance_review_approvals
  WHERE approver_employee_id = p_employee_id
     OR review_id IN (
       SELECT id FROM hrms.performance_reviews WHERE employee_id = p_employee_id
     );

  DELETE FROM hrms.performance_reviews WHERE employee_id = p_employee_id;

  DELETE FROM hrms.performance_feedback
  WHERE from_employee_id = p_employee_id
     OR to_employee_id = p_employee_id;

  DELETE FROM hrms.performance_one_on_one_actions
  WHERE one_on_one_id IN (
    SELECT id
    FROM hrms.performance_one_on_ones
    WHERE employee_id = p_employee_id
       OR manager_employee_id = p_employee_id
  );

  DELETE FROM hrms.performance_one_on_ones
  WHERE employee_id = p_employee_id
     OR manager_employee_id = p_employee_id;

  DELETE FROM hrms.performance_goal_comments
  WHERE goal_id IN (
    SELECT id FROM hrms.performance_goals WHERE employee_id = p_employee_id
  )
     OR author_employee_id = p_employee_id;

  DELETE FROM hrms.performance_goal_milestones
  WHERE goal_id IN (
    SELECT id FROM hrms.performance_goals WHERE employee_id = p_employee_id
  );

  DELETE FROM hrms.performance_goals WHERE employee_id = p_employee_id;
  DELETE FROM hrms.performance_kpis WHERE employee_id = p_employee_id;

  -- Exit management
  DELETE FROM hrms.exit_timeline
  WHERE resignation_id IN (
    SELECT id FROM hrms.exit_resignations WHERE employee_id = p_employee_id
  );

  DELETE FROM hrms.exit_asset_returns
  WHERE employee_id = p_employee_id
     OR resignation_id IN (
       SELECT id FROM hrms.exit_resignations WHERE employee_id = p_employee_id
     );

  DELETE FROM hrms.exit_clearance_items
  WHERE resignation_id IN (
    SELECT id FROM hrms.exit_resignations WHERE employee_id = p_employee_id
  );

  DELETE FROM hrms.exit_interviews WHERE employee_id = p_employee_id;
  DELETE FROM hrms.exit_settlements WHERE employee_id = p_employee_id;
  DELETE FROM hrms.exit_resignations WHERE employee_id = p_employee_id;

  -- Assets
  UPDATE hrms.asset_assignments
  SET transferred_from_assignment_id = NULL,
      updated_at = public.utc_now()
  WHERE transferred_from_assignment_id IN (
    SELECT id FROM hrms.asset_assignments WHERE employee_id = p_employee_id
  );

  DELETE FROM hrms.asset_assignments WHERE employee_id = p_employee_id;

  -- Recruitment interviews conducted by this employee
  DELETE FROM hrms.recruitment_interviews
  WHERE interviewer_employee_id = p_employee_id;

  -- Documents
  DELETE FROM hrms.document_letters WHERE employee_id = p_employee_id;
  DELETE FROM hrms.employee_documents WHERE employee_id = p_employee_id;

  -- Invitations and access
  DELETE FROM hrms.employee_invitations WHERE employee_id = p_employee_id;

  DELETE FROM hrms.user_roles
  WHERE employee_id = p_employee_id
     OR (
       v_employee.user_id IS NOT NULL
       AND user_id = v_employee.user_id
       AND organization_id = p_organization_id
     );

  DELETE FROM hrms.notifications WHERE employee_id = p_employee_id;

  -- Employee profile data
  DELETE FROM hrms.emergency_contacts WHERE employee_id = p_employee_id;
  DELETE FROM hrms.bank_accounts WHERE employee_id = p_employee_id;
  DELETE FROM hrms.employee_addresses WHERE employee_id = p_employee_id;
  DELETE FROM hrms.employee_profiles WHERE employee_id = p_employee_id;

  -- Employee master record
  DELETE FROM hrms.employees
  WHERE id = p_employee_id
    AND organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'employee_id', p_employee_id,
    'employee_code', v_employee.employee_code,
    'full_name', trim(v_employee.first_name || ' ' || v_employee.last_name),
    'email', v_employee.email,
    'user_id', v_employee.user_id,
    'profile_image_storage_path', v_profile_image,
    'document_storage_paths', v_document_paths,
    'payslip_storage_paths', v_payslip_paths
  );
END;
$$;

COMMENT ON FUNCTION hrms.permanently_delete_employee(uuid, uuid, uuid) IS
  'Permanently removes an employee and dependent HRMS records. Callable only with service role.';

REVOKE ALL ON FUNCTION hrms.permanently_delete_employee(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.permanently_delete_employee(uuid, uuid, uuid) TO service_role;
