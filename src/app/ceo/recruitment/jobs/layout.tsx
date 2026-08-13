import { type ReactNode } from "react";

export default function CeoJobsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-11.75rem)] min-h-0 flex-col overflow-hidden">
      {children}
    </div>
  );
}
