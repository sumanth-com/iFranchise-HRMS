import { type ReactNode } from "react";

export default function EmployeesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
