import { ModuleShell } from "@/components/common/sticky-layout";
import { HrMyGoalsSubNav } from "@/components/employee/goals/hr-my-goals-sub-nav";

export default function MyGoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      fillContent
      header={
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View your goals, KPIs, feedback, 1:1 meetings, and promotion updates.
            </p>
          </div>
          <HrMyGoalsSubNav />
        </div>
      }
    >
      {children}
    </ModuleShell>
  );
}
