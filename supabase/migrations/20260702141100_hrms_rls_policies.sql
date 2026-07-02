-- =============================================================================
-- Migration: hrms_rls_policies
-- Description: Enable RLS and apply organization-scoped placeholder policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on all HRMS tables
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.leave_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.organization_settings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

CREATE POLICY organizations_select_policy ON hrms.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT hrms.current_user_organization_ids()) AND deleted_at IS NULL);

CREATE POLICY organizations_insert_policy ON hrms.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_service_role());

CREATE POLICY organizations_update_policy ON hrms.organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT hrms.current_user_organization_ids()))
  WITH CHECK (id IN (SELECT hrms.current_user_organization_ids()));

-- -----------------------------------------------------------------------------
-- branches
-- -----------------------------------------------------------------------------

CREATE POLICY branches_select_policy ON hrms.branches
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY branches_insert_policy ON hrms.branches
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY branches_update_policy ON hrms.branches
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- departments
-- -----------------------------------------------------------------------------

CREATE POLICY departments_select_policy ON hrms.departments
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY departments_insert_policy ON hrms.departments
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY departments_update_policy ON hrms.departments
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- designations
-- -----------------------------------------------------------------------------

CREATE POLICY designations_select_policy ON hrms.designations
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY designations_insert_policy ON hrms.designations
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY designations_update_policy ON hrms.designations
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- employment_types
-- -----------------------------------------------------------------------------

CREATE POLICY employment_types_select_policy ON hrms.employment_types
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY employment_types_insert_policy ON hrms.employment_types
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY employment_types_update_policy ON hrms.employment_types
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- permissions (global catalog)
-- -----------------------------------------------------------------------------

CREATE POLICY permissions_select_policy ON hrms.permissions
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY permissions_insert_policy ON hrms.permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_service_role());

CREATE POLICY permissions_update_policy ON hrms.permissions
  FOR UPDATE TO authenticated
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- -----------------------------------------------------------------------------
-- roles
-- -----------------------------------------------------------------------------

CREATE POLICY roles_select_policy ON hrms.roles
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY roles_insert_policy ON hrms.roles
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY roles_update_policy ON hrms.roles
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- role_permissions
-- -----------------------------------------------------------------------------

CREATE POLICY role_permissions_select_policy ON hrms.role_permissions
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND r.deleted_at IS NULL
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
  );

CREATE POLICY role_permissions_insert_policy ON hrms.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
  );

CREATE POLICY role_permissions_update_policy ON hrms.role_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
  );

-- -----------------------------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------------------------

CREATE POLICY user_roles_select_policy ON hrms.user_roles
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY user_roles_insert_policy ON hrms.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY user_roles_update_policy ON hrms.user_roles
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- employees
-- -----------------------------------------------------------------------------

CREATE POLICY employees_select_policy ON hrms.employees
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.user_belongs_to_organization(organization_id)
      OR id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY employees_insert_policy ON hrms.employees
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY employees_update_policy ON hrms.employees
  FOR UPDATE TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    OR id = hrms.current_user_employee_id()
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    OR id = hrms.current_user_employee_id()
  );

-- -----------------------------------------------------------------------------
-- employee_profiles
-- -----------------------------------------------------------------------------

CREATE POLICY employee_profiles_select_policy ON hrms.employee_profiles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY employee_profiles_insert_policy ON hrms.employee_profiles
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY employee_profiles_update_policy ON hrms.employee_profiles
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- emergency_contacts
-- -----------------------------------------------------------------------------

CREATE POLICY emergency_contacts_select_policy ON hrms.emergency_contacts
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY emergency_contacts_insert_policy ON hrms.emergency_contacts
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY emergency_contacts_update_policy ON hrms.emergency_contacts
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- bank_accounts
-- -----------------------------------------------------------------------------

CREATE POLICY bank_accounts_select_policy ON hrms.bank_accounts
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY bank_accounts_insert_policy ON hrms.bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY bank_accounts_update_policy ON hrms.bank_accounts
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- employee_addresses
-- -----------------------------------------------------------------------------

CREATE POLICY employee_addresses_select_policy ON hrms.employee_addresses
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY employee_addresses_insert_policy ON hrms.employee_addresses
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY employee_addresses_update_policy ON hrms.employee_addresses
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- document_types
-- -----------------------------------------------------------------------------

CREATE POLICY document_types_select_policy ON hrms.document_types
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY document_types_insert_policy ON hrms.document_types
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY document_types_update_policy ON hrms.document_types
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- employee_documents
-- -----------------------------------------------------------------------------

CREATE POLICY employee_documents_select_policy ON hrms.employee_documents
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY employee_documents_insert_policy ON hrms.employee_documents
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY employee_documents_update_policy ON hrms.employee_documents
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- attendance
-- -----------------------------------------------------------------------------

CREATE POLICY attendance_select_policy ON hrms.attendance
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.user_belongs_to_organization(organization_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY attendance_insert_policy ON hrms.attendance
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY attendance_update_policy ON hrms.attendance
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- attendance_corrections
-- -----------------------------------------------------------------------------

CREATE POLICY attendance_corrections_select_policy ON hrms.attendance_corrections
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.employee_belongs_to_user_org(employee_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY attendance_corrections_insert_policy ON hrms.attendance_corrections
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = hrms.current_user_employee_id()
    OR hrms.employee_belongs_to_user_org(employee_id)
  );

CREATE POLICY attendance_corrections_update_policy ON hrms.attendance_corrections
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- leave_types
-- -----------------------------------------------------------------------------

CREATE POLICY leave_types_select_policy ON hrms.leave_types
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY leave_types_insert_policy ON hrms.leave_types
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY leave_types_update_policy ON hrms.leave_types
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- leave_balances
-- -----------------------------------------------------------------------------

CREATE POLICY leave_balances_select_policy ON hrms.leave_balances
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.employee_belongs_to_user_org(employee_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY leave_balances_insert_policy ON hrms.leave_balances
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY leave_balances_update_policy ON hrms.leave_balances
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- leave_requests
-- -----------------------------------------------------------------------------

CREATE POLICY leave_requests_select_policy ON hrms.leave_requests
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.employee_belongs_to_user_org(employee_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY leave_requests_insert_policy ON hrms.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = hrms.current_user_employee_id()
    OR hrms.employee_belongs_to_user_org(employee_id)
  );

CREATE POLICY leave_requests_update_policy ON hrms.leave_requests
  FOR UPDATE TO authenticated
  USING (
    employee_id = hrms.current_user_employee_id()
    OR hrms.employee_belongs_to_user_org(employee_id)
  )
  WITH CHECK (
    employee_id = hrms.current_user_employee_id()
    OR hrms.employee_belongs_to_user_org(employee_id)
  );

-- -----------------------------------------------------------------------------
-- leave_approvals
-- -----------------------------------------------------------------------------

CREATE POLICY leave_approvals_select_policy ON hrms.leave_approvals
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.leave_request_belongs_to_user_org(leave_request_id)
  );

CREATE POLICY leave_approvals_insert_policy ON hrms.leave_approvals
  FOR INSERT TO authenticated
  WITH CHECK (hrms.leave_request_belongs_to_user_org(leave_request_id));

CREATE POLICY leave_approvals_update_policy ON hrms.leave_approvals
  FOR UPDATE TO authenticated
  USING (hrms.leave_request_belongs_to_user_org(leave_request_id))
  WITH CHECK (hrms.leave_request_belongs_to_user_org(leave_request_id));

-- -----------------------------------------------------------------------------
-- salary_structures
-- -----------------------------------------------------------------------------

CREATE POLICY salary_structures_select_policy ON hrms.salary_structures
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.employee_belongs_to_user_org(employee_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY salary_structures_insert_policy ON hrms.salary_structures
  FOR INSERT TO authenticated
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

CREATE POLICY salary_structures_update_policy ON hrms.salary_structures
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));

-- -----------------------------------------------------------------------------
-- payrolls
-- -----------------------------------------------------------------------------

CREATE POLICY payrolls_select_policy ON hrms.payrolls
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY payrolls_insert_policy ON hrms.payrolls
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY payrolls_update_policy ON hrms.payrolls
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- payroll_items
-- -----------------------------------------------------------------------------

CREATE POLICY payroll_items_select_policy ON hrms.payroll_items
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.payroll_belongs_to_user_org(payroll_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY payroll_items_insert_policy ON hrms.payroll_items
  FOR INSERT TO authenticated
  WITH CHECK (hrms.payroll_belongs_to_user_org(payroll_id));

CREATE POLICY payroll_items_update_policy ON hrms.payroll_items
  FOR UPDATE TO authenticated
  USING (hrms.payroll_belongs_to_user_org(payroll_id))
  WITH CHECK (hrms.payroll_belongs_to_user_org(payroll_id));

-- -----------------------------------------------------------------------------
-- payslips
-- -----------------------------------------------------------------------------

CREATE POLICY payslips_select_policy ON hrms.payslips
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      hrms.payroll_belongs_to_user_org(payroll_id)
      OR employee_id = hrms.current_user_employee_id()
    )
  );

CREATE POLICY payslips_insert_policy ON hrms.payslips
  FOR INSERT TO authenticated
  WITH CHECK (hrms.payroll_belongs_to_user_org(payroll_id));

CREATE POLICY payslips_update_policy ON hrms.payslips
  FOR UPDATE TO authenticated
  USING (hrms.payroll_belongs_to_user_org(payroll_id))
  WITH CHECK (hrms.payroll_belongs_to_user_org(payroll_id));

-- -----------------------------------------------------------------------------
-- holidays
-- -----------------------------------------------------------------------------

CREATE POLICY holidays_select_policy ON hrms.holidays
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY holidays_insert_policy ON hrms.holidays
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY holidays_update_policy ON hrms.holidays
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------

CREATE POLICY notifications_select_policy ON hrms.notifications
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

CREATE POLICY notifications_insert_policy ON hrms.notifications
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notifications_update_policy ON hrms.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (user_id = auth.uid() AND hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------

CREATE POLICY audit_logs_select_policy ON hrms.audit_logs
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      organization_id IS NULL
      OR hrms.user_belongs_to_organization(organization_id)
    )
  );

CREATE POLICY audit_logs_insert_policy ON hrms.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY audit_logs_update_policy ON hrms.audit_logs
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- organization_settings
-- -----------------------------------------------------------------------------

CREATE POLICY organization_settings_select_policy ON hrms.organization_settings
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY organization_settings_insert_policy ON hrms.organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY organization_settings_update_policy ON hrms.organization_settings
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
