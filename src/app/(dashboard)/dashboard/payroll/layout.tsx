import { PayrollSubNav } from "@/components/payroll/payroll-sub-nav";

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PayrollSubNav />
      {children}
    </div>
  );
}
