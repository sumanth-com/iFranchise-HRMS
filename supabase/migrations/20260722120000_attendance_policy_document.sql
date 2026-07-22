-- Attendance policy document permission and default seed

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT 'attendance_policy.manage', 'attendance', 'manage', 'attendance_policy', 'Manage employee attendance policy document', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions WHERE code = 'attendance_policy.manage' AND deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND r.code IN ('super_admin', 'hr_admin')
  AND p.code = 'attendance_policy.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_doc jsonb := jsonb_build_object(
    'intro', 'This communication covers our official working hours, daily meeting attendance requirements, and important payroll and attendance guidelines. Please review the details carefully.',
    'updatedAt', public.utc_now(),
    'contact', jsonb_build_object(
      'phone', '+91-912 913 0303',
      'email', 'contact@ifranchise.in',
      'address', 'No 51, Devarabisanahalli, Bangalore, Karnataka - 560103'
    ),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'working-hours',
        'title', 'Official Working Hours & Daily Meeting',
        'content', E'Our official working hours are 10:00 AM to 7:00 PM. As part of our remote work policy, it is mandatory for every employee to join the daily Main Meeting link at 10:00 AM sharp to mark attendance and begin the workday.\n\nPlease note the following:\n- Employees are expected to join the Main Meeting link on time every working day.\n- Joining the meeting more than 5 minutes after the scheduled time (after 10:05 AM) will be considered a Half-Day Loss of Pay (LOP).\n- This Half-Day LOP will not be adjusted against Earned Leave (EL) or any other leave balance.\n- In case of an emergency or any unavoidable circumstance, employees must inform the HR team before 10:00 AM. Prior intimation is mandatory, and exceptions will be considered only for genuine emergencies.\n\nWe request everyone to maintain punctuality and adhere to the work schedule to ensure smooth collaboration and productivity across the team.'
      ),
      jsonb_build_object(
        'id', 'payroll-attendance-update',
        'title', 'Payroll and Attendance Management Update',
        'content', E'To ensure clarity, fairness, and consistency in our payroll and attendance management, the HR Department is sharing an important update regarding how weekly offs (Sundays), half-days, and public holidays interact with employee leaves.\n\nPlease review the guidelines below, which will come into effect immediately.'
      ),
      jsonb_build_object(
        'id', 'weekly-offs',
        'title', 'Weekly Offs and the Principle of Resuming Duty',
        'content', E'Our standard workweek runs from Monday to Saturday, with Sunday as our official weekly off. Additionally, the 2nd and 4th Saturdays of every month are half-days (working hours conclude at 2:00 PM).\n\nSundays and public holidays are paid privileges. To be eligible for a paid Sunday or holiday, an employee must be actively on duty immediately before and after that rest day.'
      ),
      jsonb_build_object(
        'id', 'resumption-rule',
        'title', 'The Resumption of Duty Rule (Handling Loss of Pay)',
        'content', E'If an employee transitions into Loss of Pay (LOP) or Unpaid Leave status, they remain in an unpaid status until they physically return to the office and resume duty.\n\nThe Weekend Loophole: If your planned LOP ends on a Saturday (including 2nd/4th Saturday half-days) and you do not physically report to work for your scheduled shift, you have not broken the continuous chain of absence.\n\nThe Result: Because duty was not officially resumed, the succeeding Sunday will automatically be marked as Loss of Pay (LOP). Paid status will only resume on Monday when you physically check back into work.'
      ),
      jsonb_build_object(
        'id', 'sandwich-leave',
        'title', 'The Sandwich Leave Policy',
        'content', E'To prevent the fragmentation of the workweek, the company follows a strict Sandwich Leave Policy for intervening weekends and holidays.\n\nWhat is it? If an employee takes leave on the working day(s) immediately before and immediately after a Sunday or public holiday, that Sunday/holiday is considered "sandwiched."\n\nImpact on Paid Leave: If you take approved paid leaves (e.g., CL/EL) on both Saturday and Monday, the intervening Sunday will be deducted from your available leave balance.\n\nImpact on Unpaid Leave (LOP): If the leave on either side of the Sunday is marked as LOP, the sandwiched Sunday will automatically be processed as LOP (Unpaid).'
      ),
      jsonb_build_object(
        'id', 'examples',
        'title', 'Examples for Quick Reference',
        'content', E'Scenario A (Sandwich Rule): You take LOP on Saturday and LOP on Monday.\nResult: Sunday is sandwiched and marked as LOP (Unpaid).\n\nScenario B (Resuming Duty Rule): You take LOP from Thursday until Saturday. You do not report to work for Saturday''s shift. You return to work on Monday.\nResult: Since you did not resume duty on Saturday, Sunday is also marked as LOP (Unpaid).'
      ),
      jsonb_build_object(
        'id', 'closing',
        'title', 'Closing Note',
        'content', E'We kindly request everyone to plan their leaves in advance and manage their leave balances responsibly. If you have any questions or require specific clarifications regarding your leave balance, please feel free to reach out to the HR department.\n\nThank you for your cooperation.\n\nBest regards,\nHR & Operations Team'
      )
    )
  );
BEGIN
  UPDATE hrms.organization_settings
  SET
    settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('attendance_policy_document', v_doc),
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    INSERT INTO hrms.organization_settings (organization_id, settings, status)
    VALUES (v_org_id, jsonb_build_object('attendance_policy_document', v_doc), 'active');
  END IF;
END $$;
