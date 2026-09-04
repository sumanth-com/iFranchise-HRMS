-- Allow employees to read payroll run headers linked to their own payroll lines.
-- Without this, nested payrolls joins in payslip queries return null for self-service users
-- (View modal: "This payslip could not be loaded", month column: "-").

DROP POLICY IF EXISTS payrolls_select_policy ON hrms.payrolls;
CREATE POLICY payrolls_select_policy ON hrms.payrolls
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('payroll.view')
      OR hrms.user_has_permission('portal.ceo.access')
      OR EXISTS (
        SELECT 1
        FROM hrms.payroll_items pi
        WHERE pi.payroll_id = payrolls.id
          AND pi.employee_id = hrms.current_user_employee_id()
          AND pi.deleted_at IS NULL
      )
    )
  );

COMMENT ON POLICY payrolls_select_policy ON hrms.payrolls IS
  'HR/CEO see org payroll runs; employees see runs that include their own payroll line.';

-- Backfill release timestamps for payslips HR already sent before email_sent_at bookkeeping.
UPDATE hrms.payslips ps
SET
  email_sent_at = COALESCE(
    ps.email_sent_at,
    NULLIF(pi.breakdown -> 'payrollLifecycle' ->> 'sentAt', '')::timestamptz,
    ps.published_at
  ),
  published_at = COALESCE(ps.published_at, ps.email_sent_at)
FROM hrms.payroll_items pi
WHERE pi.id = ps.payroll_item_id
  AND ps.deleted_at IS NULL
  AND ps.email_sent_at IS NULL
  AND (
    pi.breakdown -> 'payrollLifecycle' ->> 'itemStatus' = 'sent'
    OR ps.published_at IS NOT NULL
  );

-- Prevent duplicate payroll runs for the same org + month (soft-deleted rows excluded).
CREATE UNIQUE INDEX IF NOT EXISTS payrolls_org_month_active_idx
  ON hrms.payrolls (organization_id, payroll_month)
  WHERE deleted_at IS NULL;

WITH ranked AS (
  SELECT
    ps.id,
    ROW_NUMBER() OVER (
      PARTITION BY ps.employee_id, date_trunc('month', p.payroll_month::timestamp)
      ORDER BY
        CASE WHEN ps.email_sent_at IS NOT NULL THEN 0 ELSE 1 END,
        ps.email_sent_at DESC NULLS LAST,
        ps.issued_at DESC
    ) AS rn
  FROM hrms.payslips ps
  INNER JOIN hrms.payrolls p ON p.id = ps.payroll_id AND p.deleted_at IS NULL
  WHERE ps.deleted_at IS NULL
    AND ps.archived_at IS NULL
    AND ps.is_current = true
)
UPDATE hrms.payslips ps
SET
  is_current = false,
  archived_at = COALESCE(ps.archived_at, public.utc_now())
FROM ranked r
WHERE ps.id = r.id
  AND r.rn > 1;
