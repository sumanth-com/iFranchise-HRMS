import type { ReactNode } from "react";

export default function DashboardModuleTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in duration-200 flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
