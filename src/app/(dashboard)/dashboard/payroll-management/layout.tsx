/**
 * Legacy payroll-management routes only redirect into /dashboard/payroll/team/*.
 * Do not render Team Payroll sub-nav here — it previously showed Settings to
 * every role because it never received the Super Admin gate.
 */
export default function PayrollManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
